import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { useIframe } from '@ringcentral/mfe-react';

export default async () => {
  const App1 = () => {
    const App2 = useIframe({
      name: '@example/app2',
    });
    return <App2 />;
  };
  render(<App1 />);
  await act(() => Promise.resolve());
  expect(document.querySelector('iframe')!).toBeInTheDocument();
}
