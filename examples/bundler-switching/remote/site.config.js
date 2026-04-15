/** @type {import('@ringcentral/mfe-builder').SiteConfigFile} */
module.exports = {
  name: '@bundler-example/remote',
  exposes: {
    './src/bootstrap': './src/bootstrap',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^17.0.2' },
    'react-dom': { singleton: true, requiredVersion: '^17.0.2' },
  },
};
