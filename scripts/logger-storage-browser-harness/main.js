import { StorageTransport as OldStorageTransport } from 'mfe-logger-old';
import { StorageTransport as FixedStorageTransport } from 'mfe-logger-fixed';

const statusEl = document.querySelector('#status');
const resultsEl = document.querySelector('#results');

const wait = (time) => new Promise((resolve) => setTimeout(resolve, time));

const createLogs = (time, session) => ({
  time,
  size: 1,
  messages: [`message-${session}`],
  session,
});

const createSerializedMessage = (time, session) =>
  ({
    message: '',
    payload: {
      context: {
        logLevel: 30,
        namespace: [session],
      },
      message: `message-${session}`,
      sequence: time,
      time,
    },
  });

const closeTransport = (transport) => {
  transport?._table?.db?.close?.();
};

const deleteDatabase = async (name) => {
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
};

const runRealTwoWriterRace = async (Transport, label) => {
  const prefix = `two-writer-${label}-${Date.now()}`;
  const dbName = `${prefix}:log`;
  const transports = [];

  try {
    for (let writer = 0; writer < 2; writer += 1) {
      const transport = new Transport({ prefix });
      transport._session = `${label}-session-${writer}`;
      transport._data.session = `${label}-session-${writer}`;
      await transport._initDB();
      transports.push(transport);
    }

    const payloads = [createLogs(1000, 'session-a'), createLogs(1000, 'session-b')];
    const settled = await Promise.allSettled(
      transports.map((transport, index) =>
        transport._saveLogs(payloads[index], true)
      )
    );
    const rows = await transports[0]._table.orderBy('time').toArray();

    return {
      rowTimes: rows.map((row) => row.time),
      payloadTimes: payloads.map((payload) => payload.time),
      rejections: settled
        .filter((item) => item.status === 'rejected')
        .map((item) => ({
          name: item.reason?.name,
          message: item.reason?.message ?? String(item.reason),
        })),
      successCount: settled.filter((item) => item.status === 'fulfilled').length,
      savedRows: rows.length,
    };
  } finally {
    transports.forEach(closeTransport);
    await deleteDatabase(dbName);
  }
};

const runRealIndexedDbStress = async (Transport, label, rounds = 20, writers = 8) => {
  const roundsWithRejection = [];
  let totalRejections = 0;
  let rowMismatches = 0;

  for (let round = 0; round < rounds; round += 1) {
    const prefix = `real-${label}-${Date.now()}-${round}`;
    const dbName = `${prefix}:log`;
    const transports = [];

    for (let writer = 0; writer < writers; writer += 1) {
      const transport = new Transport({ prefix });
      transport._session = `${label}-session-${writer}`;
      transport._data.session = `${label}-session-${writer}`;
      await transport._initDB();
      transports.push(transport);
    }

    const settled = await Promise.allSettled(
      transports.map((transport, index) =>
        transport._saveLogs(
          createLogs(777000, `${label}-session-${index}`),
          true
        )
      )
    );

    const rejectionCount = settled.filter(
      (item) => item.status === 'rejected'
    ).length;
    totalRejections += rejectionCount;
    if (rejectionCount > 0) {
      roundsWithRejection.push(round);
    }

    const rows = await transports[0]._table.orderBy('time').toArray();
    if (rows.length !== writers) {
      rowMismatches += 1;
    }

    transports.forEach(closeTransport);
    await deleteDatabase(dbName);
  }

  return {
    rounds,
    writers,
    totalRejections,
    roundsWithRejection,
    rowMismatches,
  };
};

const runBackgroundFlush = async (Transport, label, writers = 6) => {
  const prefix = `background-${label}-${Date.now()}`;
  const dbName = `${prefix}:log`;
  const transports = [];
  const unhandled = [];
  const handler = (event) => {
    unhandled.push({
      name: event.reason?.name,
      message: event.reason?.message ?? String(event.reason),
    });
    event.preventDefault();
  };

  window.addEventListener('unhandledrejection', handler);

  try {
    for (let writer = 0; writer < writers; writer += 1) {
      const transport = new Transport({
        enabled: true,
        prefix,
        batchTimeout: 10,
        batchNumber: 10_000,
      });
      transport._session = `${label}-bg-${writer}`;
      transport._data = createLogs(990000, `${label}-bg-${writer}`);
      await transport._initDB();
      transports.push(transport);
    }

    transports.forEach((transport, index) => {
      transport.write(createSerializedMessage(index + 1, `${label}-bg-${index}`));
    });

    await wait(80);

    const rows = await transports[0]._table.orderBy('time').toArray();
    return {
      unhandled,
      savedRows: rows.length,
      savedTimes: rows.map((row) => row.time).sort((left, right) => left - right),
    };
  } finally {
    window.removeEventListener('unhandledrejection', handler);
    transports.forEach(closeTransport);
    await deleteDatabase(dbName);
  }
};

const runHighContentionSameTime = async (Transport, label, writerCount = 40) => {
  const prefix = `high-contention-${label}-${Date.now()}`;
  const dbName = `${prefix}:log`;
  const transports = [];

  try {
    for (let writer = 0; writer < writerCount; writer += 1) {
      const transport = new Transport({ prefix });
      transport._session = `${label}-session-${writer}`;
      transport._data.session = `${label}-session-${writer}`;
      await transport._initDB();
      transports.push(transport);
    }

    const payloads = Array.from({ length: writerCount }, (_, index) =>
      createLogs(1000, `session-${index}`)
    );
    const settled = await Promise.allSettled(
      transports.map((transport, index) =>
        transport._saveLogs(payloads[index], true)
      )
    );
    const rows = await transports[0]._table.orderBy('time').toArray();

    return {
      writerCount,
      successCount: settled.filter((item) => item.status === 'fulfilled').length,
      rejectionCount: settled.filter((item) => item.status === 'rejected').length,
      rejections: settled
        .filter((item) => item.status === 'rejected')
        .slice(0, 5)
        .map((item) => ({
          name: item.reason?.name,
          message: item.reason?.message ?? String(item.reason),
        })),
      savedRows: rows.length,
      savedTimes: rows.map((row) => row.time),
    };
  } finally {
    transports.forEach(closeTransport);
    await deleteDatabase(dbName);
  }
};

const card = (title, summary, data, pass) => `
  <article class="card">
    <h2>${title}</h2>
    <span class="badge ${pass ? 'pass' : 'fail'}">${pass ? 'pass' : 'fail'}</span>
    <p>${summary}</p>
    <pre>${JSON.stringify(data, null, 2)}</pre>
  </article>
`;

const run = async () => {
  const deterministicOld = await runRealTwoWriterRace(OldStorageTransport, 'old');
  const deterministicFixed = await runRealTwoWriterRace(
    FixedStorageTransport,
    'fixed'
  );
  const indexedDbOld = await runRealIndexedDbStress(OldStorageTransport, 'old');
  const indexedDbFixed = await runRealIndexedDbStress(
    FixedStorageTransport,
    'fixed'
  );
  const backgroundOld = await runBackgroundFlush(OldStorageTransport, 'old');
  const backgroundFixed = await runBackgroundFlush(
    FixedStorageTransport,
    'fixed'
  );
  const retryCeilingFixed = await runHighContentionSameTime(
    FixedStorageTransport,
    'fixed'
  );

  const results = {
    deterministicOld,
    deterministicFixed,
    indexedDbOld,
    indexedDbFixed,
    backgroundOld,
    backgroundFixed,
    retryCeilingFixed,
  };

  const checks = [
    {
      title: 'Deterministic Race: v0.4.19',
      pass: deterministicOld.rejections.length > 0,
      summary:
        'The published version should still fail the original two-writer collision repro.',
      data: deterministicOld,
    },
    {
      title: 'Deterministic Race: Current Fix',
      pass:
        deterministicFixed.rejections.length === 0 &&
        deterministicFixed.successCount === 2 &&
        deterministicFixed.savedRows === 2,
      summary:
        'The current local package should resolve the original two-writer collision.',
      data: deterministicFixed,
    },
    {
      title: 'Real IndexedDB Stress: v0.4.19',
      pass: indexedDbOld.totalRejections > 0,
      summary:
        'Concurrent real browser writes should still reject in the published version.',
      data: indexedDbOld,
    },
    {
      title: 'Real IndexedDB Stress: Current Fix',
      pass:
        indexedDbFixed.totalRejections === 0 &&
        indexedDbFixed.rowMismatches === 0,
      summary:
        'The current local package should survive the real browser concurrency harness used for the original bug.',
      data: indexedDbFixed,
    },
    {
      title: 'Background Flush: v0.4.19',
      pass: backgroundOld.unhandled.length > 0,
      summary:
        'The published version should still leak background persistence collisions as unhandled rejections.',
      data: backgroundOld,
    },
    {
      title: 'Background Flush: Current Fix',
      pass:
        backgroundFixed.unhandled.length === 0 && backgroundFixed.savedRows === 6,
      summary:
        'The current local package should suppress the original unhandled rejection loop and persist all rows in this scenario.',
      data: backgroundFixed,
    },
    {
      title: 'High Contention Ceiling: Current Fix',
      pass:
        retryCeilingFixed.rejectionCount === 0 &&
        retryCeilingFixed.savedRows === retryCeilingFixed.writerCount,
      summary:
        'Additional validation: if this fails, the original issue is improved but not fully eliminated under higher concurrency.',
      data: retryCeilingFixed,
    },
  ];

  const failedChecks = checks.filter((item) => !item.pass).map((item) => item.title);
  resultsEl.innerHTML = checks
    .map((item) => card(item.title, item.summary, item.data, item.pass))
    .join('');

  statusEl.textContent =
    failedChecks.length === 0
      ? 'All checks completed.'
      : `Completed with failures: ${failedChecks.join(', ')}`;
  statusEl.style.background = failedChecks.length === 0 ? '#dff6df' : '#fde4e2';
  statusEl.style.color = failedChecks.length === 0 ? '#176c1c' : '#ac2f2a';

  window.__results = {
    checks,
    raw: results,
  };
};

run().catch((error) => {
  statusEl.textContent = `Harness failed: ${error?.message ?? error}`;
  statusEl.style.background = '#fde4e2';
  statusEl.style.color = '#ac2f2a';
  resultsEl.innerHTML = card(
    'Harness Failure',
    'The verification harness failed before completing all checks.',
    {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    },
    false
  );
  window.__results = { error };
});
