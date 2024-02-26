import React from 'react';
import ReactDOM from 'react-dom';
import { expose, getMeta } from '@ringcentral/mfe-react';
import App from './App';

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
