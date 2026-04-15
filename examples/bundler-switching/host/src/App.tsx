import { useApp } from '@ringcentral/mfe-react';
import type RemoteBootstrap from '@bundler-example/remote/src/bootstrap';

const App = () => {
  const RemoteButton = useApp<typeof RemoteBootstrap>({
    name: '@bundler-example/remote',
    loader: () => import('@bundler-example/remote/src/bootstrap'),
  });

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h1>Host App</h1>
      <p>
        Host bundler: <strong>{__BUNDLER__}</strong>
      </p>
      <hr />
      <h2>Remote component (loaded via Module Federation)</h2>
      <RemoteButton
        loading={() => <span>Loading remote…</span>}
        fallback={() => (
          <span style={{ color: 'red' }}>
            Failed to load remote. Make sure the remote dev server is running on
            port 3002.
          </span>
        )}
      />
    </div>
  );
};

export default App;
