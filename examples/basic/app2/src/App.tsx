import { useApp } from '@ringcentral/mfe-react';
import React, { FC } from 'react';
import ButtonContainer from './ButtonContainer';

const App: FC<{ version?: string }> = () => {
  const App3Component = useApp({
    name: '@example/app3',
    loader: () => import('@example/app3/src/bootstrap'),
  });
  return (
    <div style={{ border: '3px solid blue', padding: '3px' }}>
      <h1>Nested app</h1>
      <h2>App 2</h2>
      <ButtonContainer />
      <br />
      <App3Component />
    </div>
  );
};

export default App;
