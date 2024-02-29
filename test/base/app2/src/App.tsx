import { dynamicLoad, useIframe } from '@ringcentral/mfe-react';
import React, { FC } from 'react';
import ButtonContainer from './ButtonContainer';

const App: FC<{ version?: string }> = () => {
  // @ts-ignore
  const App3Component = !global.isIT
    ? useIframe({
        name: 'app3',
        attrs: {
          height: '100%',
        },
      })
    : () => null;
  return (
    <div style={{ border: '3px solid blue', padding: '3px' }}>
      <h1>Nested</h1>
      <h2>App 2: version: 0.0.1</h2>
      <ButtonContainer />
      <br />
      <App3Component />
    </div>
  );
};

export default App;
