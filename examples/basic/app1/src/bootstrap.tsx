import React from 'react';
import ReactDOM from 'react-dom';
import { expose, getMeta } from '@ringcentral/mfe-react';
import { useSentry } from '@ringcentral/mfe-sentry';
import App from './App';

const { setTag, setExtra, setUser } = useSentry({
  dsn: 'https://b5a2fa3a1a19484c84b9d2c5fd36a5d0@sentry-ui.dev.glip.net/9',
  urls: ['localhost:3001'],
  tracesSampleRate: 1,
});

setTag('currentApp1', 'app1');
setExtra('currentApp1', 'app1');
setUser({ id: 'app1-user', username: 'test1' });

setTimeout(() => {
  // eslint-disable-next-line no-new
  new Promise((resolve, reject) => {
    reject(new Error('app1-throw'));
  });
}, 4000);

window.error1 = () => {
  setTimeout(() => {
    throw new Error('app1-throw');
  }, 1000);
};

console.log(JSON.stringify(getMeta(), null, 2));

export default expose({
  init: () => {
    //
  },
  render: (element = document.getElementById('root')) => {
    ReactDOM.render(<App />, element);
    return () => {
      ReactDOM.unmountComponentAtNode(element!);
    };
  },
});
