import React from 'react';
import ReactDOM from 'react-dom';
import { expose, getMeta } from '@ringcentral/mfe-react';
import { getGlobalTransport, PickListeners } from '@ringcentral/mfe-transport';
import type App3 from '@base/app3/src/bootstrap';
import App from './App';

console.log(JSON.stringify(getMeta(), null, 2));

export default expose({
  init: () => {
    console.log('App 2 init');
  },
  render: (element = document.getElementById('root')) => {
    // @ts-ignore
    ReactDOM.render(<App />, element);
    return () => {
      ReactDOM.unmountComponentAtNode(element!);
    };
  },
  transport: getGlobalTransport<PickListeners<typeof App3>>(),
});
