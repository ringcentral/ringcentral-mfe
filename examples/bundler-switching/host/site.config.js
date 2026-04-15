/** @type {import('@ringcentral/mfe-builder').SiteConfigFile} */
module.exports = {
  name: '@bundler-example/host',
  optimization: {
    // Inject the MFE banner (which sets up dynamicImport) into main.js so it
    // runs before any federated remote is lazily loaded.  Without this, host-only
    // apps (no exposes → no remoteEntry.js) would never execute the banner and
    // remote loading would hang indefinitely.
    injectMeta: ['main'],
  },
  dependencies: {
    '@bundler-example/remote': {
      entry: 'http://localhost:3002/remoteEntry.js',
      version: '>0.0.1',
    },
  },
  shared: {
    react: { singleton: true, requiredVersion: '^17.0.2' },
    'react-dom': { singleton: true, requiredVersion: '^17.0.2' },
  },
};
