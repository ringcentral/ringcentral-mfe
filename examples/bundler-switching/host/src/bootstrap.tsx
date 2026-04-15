import ReactDOM from 'react-dom';
import { expose } from '@ringcentral/mfe-react';
import App from './App';

export default expose({
  init: () => {},
  render: (element = document.getElementById('root')) => {
    ReactDOM.render(<App />, element);
    return () => {
      ReactDOM.unmountComponentAtNode(element!);
    };
  },
});
