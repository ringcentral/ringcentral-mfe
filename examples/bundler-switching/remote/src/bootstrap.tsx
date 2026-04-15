import ReactDOM from 'react-dom';
import { expose } from '@ringcentral/mfe-react';
import Button from './Button';

export default expose({
  init: () => {},
  render: (element = document.getElementById('root')) => {
    ReactDOM.render(<Button />, element);
    return () => {
      ReactDOM.unmountComponentAtNode(element!);
    };
  },
});
