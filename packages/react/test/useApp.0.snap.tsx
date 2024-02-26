import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { useApp } from '@ringcentral/mfe-react';

export default async () => {
  const App1 = () => {
    const App2 = useApp({
      name: '@example/app2',
      loader: () => global.mockImport('@example/app2'),
    });
    return <App2 />;
  };
  render(<App1 />);
  await act(() => Promise.resolve());
  expect(screen.queryByText('test')).toBeInTheDocument();
}
