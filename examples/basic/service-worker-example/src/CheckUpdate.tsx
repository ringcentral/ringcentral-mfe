// name: 'app2',
// scope: 'http://localhost:3002/',
// version: '1',
// manifestRelativePath: 'precache-manifest',

import React, { useState } from 'react';

import { RegisterSuccessResult, swClient } from '@ringcentral/mfe-service-worker';

const CheckUpdate = (appInfo: {
  name: string;
  scope: string;
  manifestRelativePath: string;
}) => {
  const { name, scope, manifestRelativePath } = appInfo;
  const [version, setVersion] = useState('1');
  const [error, setError] = useState<Error>();
  const [registerResult, setRegisterResult] = useState<RegisterSuccessResult>();

  return (
    <div>
      <h3>{name}</h3>
      Version:
      <input
        value={version}
        placeholder="Input version"
        onChange={(ev) => setVersion(ev.currentTarget.value)}
      />
      <button
        type="button"
        onClick={async () => {
          try {
            const result = await swClient.registerSubApp({
              name,
              scope,
              version,
              manifestRelativePath,
            });
            setRegisterResult(result);
          } catch (e) {
            setError(e as Error);
          }
        }}
      >
        Check update
      </button>
      {registerResult && (
        <div>
          <pre>{JSON.stringify(registerResult, null, 2)}</pre>
        </div>
      )}
      {error && (
        <div style={{ color: 'red' }}>
          <div>registerError: {error.message}</div>
          <pre>{error.stack}</pre>
        </div>
      )}
      <button
        type="button"
        disabled={Boolean(registerResult?.type !== 'pre-cache')}
        onClick={() => {
          // eslint-disable-next-line no-unused-expressions
          registerResult &&
            swClient.activeSubApps([
              { name: registerResult?.name, id: registerResult?.id },
            ]);
        }}
      >
        Active
      </button>
      <button
        type="button"
        onClick={() => {
          swClient.deleteInactive([name]);
        }}
      >
        Delete inactive
      </button>
    </div>
  );
};

export default CheckUpdate;
