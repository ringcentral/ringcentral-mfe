import React from 'react';
import ReactDOM from 'react-dom';
import { expose, getMeta } from '@ringcentral/mfe-react';
import { getGlobalTransport, PickListeners } from '@ringcentral/mfe-transport';
import { useSentry } from '@ringcentral/mfe-sentry';
import { useLogger, ConsoleTransport, StorageTransport } from '@ringcentral/mfe-logger';

import type App3 from '@example/app3/src/bootstrap';
import App from './App';

(window as any)._log2 = useLogger({
  name: 'app2',
  transports: [
    new ConsoleTransport({
      enabled: true,
    }),
    new StorageTransport({
      enabled: true,
    }),
  ],
  enabled: true,
});

const { setTag, setExtra, setUser } = useSentry({
  dsn: 'https://3873f0fcfd0747308a2033d32a15b326@sentry-ui.dev.glip.net/10',
  urls: ['localhost:3002'],
  sampleRate: 1,
});

setTag('currentApp2', 'app2');
setExtra('currentApp2', 'app2');
setUser({ id: 'app2-user', username: 'test2' });

setTimeout(() => {
  throw new Error('app2-throw');
}, 6000);

window.error2 = () => {
  setTimeout(() => {
    throw new Error('app2-throw');
  }, 1000);
};

console.log(JSON.stringify(getMeta(), null, 2));

export default expose({
  init: () => {
    console.log('App 2 init');
  },
  render: (
    element = document.getElementById('root'),
    props?: any,
    mfeId?: string
  ) => {
    console.log('mfeId', mfeId);
    ReactDOM.render(<App />, element);
    return () => {
      ReactDOM.unmountComponentAtNode(element!);
    };
  },
  transport: getGlobalTransport<PickListeners<typeof App3>>(),
});
