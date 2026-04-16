import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, cp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const harnessDir = path.join(__dirname, 'logger-storage-browser-harness');
const port = 4174;
const localUrl = `http://127.0.0.1:${port}/`;

const packageJson = {
  name: 'mfe-logger-browser-verify',
  private: true,
  type: 'module',
  scripts: {
    dev: `vite --host 127.0.0.1 --port ${port} --strictPort`,
  },
  dependencies: {
    vite: '^8.0.8',
    'mfe-logger-old': 'npm:@ringcentral/mfe-logger@0.4.19',
    'mfe-logger-fixed': `file:${path.join(repoRoot, 'packages/logger')}`,
  },
};

const wait = (time) => new Promise((resolve) => setTimeout(resolve, time));

const runCommand = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.stdio ?? 'inherit',
      cwd: options.cwd,
      env: options.env ?? process.env,
      shell: options.shell ?? false,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });

const waitForServer = async (retries = 30) => {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(localUrl);
      if (response.ok) return;
    } catch {
      //
    }
    await wait(500);
  }
  throw new Error(`Timed out waiting for ${localUrl}`);
};

const startServer = (cwd) => {
  const child = spawn('npm', ['run', 'dev'], {
    cwd,
    env: process.env,
    stdio: 'inherit',
    detached: process.platform !== 'win32',
  });
  return child;
};

const stopServer = (child) => {
  if (!child || child.killed) return;
  if (process.platform === 'win32') {
    child.kill('SIGTERM');
    return;
  }
  process.kill(-child.pid, 'SIGTERM');
};

const prepareWorkspace = async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'mfe-logger-browser-verify.'));
  await writeFile(
    path.join(tempDir, 'package.json'),
    `${JSON.stringify(packageJson, null, 2)}\n`
  );
  await cp(path.join(harnessDir, 'index.html'), path.join(tempDir, 'index.html'));
  await cp(path.join(harnessDir, 'main.js'), path.join(tempDir, 'main.js'));
  return tempDir;
};

const main = async () => {
  const workspace = await prepareWorkspace();
  let server;
  let browser;

  try {
    console.log(`Using temporary workspace: ${workspace}`);
    await runCommand('npm', ['install', '--no-audit', '--no-fund'], {
      cwd: workspace,
    });

    server = startServer(workspace);
    await waitForServer();

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(localUrl, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__results?.checks?.length > 0);

    const results = await page.evaluate(() => window.__results);
    console.log(JSON.stringify(results, null, 2));

    const failedChecks = results.checks.filter((item) => !item.pass);
    if (failedChecks.length) {
      throw new Error(
        `Verification failed: ${failedChecks.map((item) => item.title).join(', ')}`
      );
    }
  } finally {
    await browser?.close();
    stopServer(server);
    await rm(workspace, { recursive: true, force: true });
  }
};

main().catch((error) => {
  console.error(error.stack ?? error);
  process.exitCode = 1;
});
