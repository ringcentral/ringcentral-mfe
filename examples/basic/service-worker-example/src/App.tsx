import React, { useState } from 'react';

/* eslint-disable react/button-has-type */
/* eslint-disable no-shadow */
/* eslint-disable react/no-unstable-nested-components */
import { onUpdateEntry, useApp } from '@ringcentral/mfe-react';
import { SubAppStatus, swClient } from '@ringcentral/mfe-service-worker';

import CheckUpdate from './CheckUpdate';

onUpdateEntry((...data) => {
  console.log('onUpdateEntry', data);
});
const App = () => {
  const App2Component = useApp({
    name: '@example/app2',
    loader: () => import('@example/app2/src/bootstrap'),
  });
  const App3Component = useApp({
    name: '@example/app3',
    loader: () => import('@example/app3/src/bootstrap'),
  });
  const [subAppStatus, setSubAppStatus] = useState<SubAppStatus[]>([]);
  return (
    <div>
      App1 using native dynamic import to load App2
      <div>
        <div>
          <button
            onClick={() => {
              swClient.deleteInactive();
            }}
          >
            Delete all inactive
          </button>
        </div>
        <CheckUpdate
          name="app2"
          scope="http://localhost:3002/"
          manifestRelativePath="precache-manifest"
        />
        <CheckUpdate
          name="app3"
          scope="http://localhost:3003/"
          manifestRelativePath="precache-manifest"
        />
      </div>
      <div>
        <button
          type="button"
          onClick={() =>
            swClient.getSubAppStatus().then((status) => {
              setSubAppStatus(status);
            })
          }
        >
          getSubAppStatus()
        </button>
        {subAppStatus.length ? (
          <div>
            <pre>{JSON.stringify(subAppStatus, null, 2)}</pre>
          </div>
        ) : undefined}
      </div>
      <div>
        <App2Component
          loading={() => {
            return <div>app2 loading</div>;
          }}
          fallback={() => {
            return <div>app2 error</div>;
          }}
        />
        <App3Component />
      </div>
    </div>
  );
};

export default App;
