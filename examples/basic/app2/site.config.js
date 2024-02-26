/** @type {import('@ringcentral/mfe-builder').SiteConfigFile} */

// use `yarn start --env foo=bar --env production --env spa`
module.exports = (env) => {
  return {
    name: '@example/app2',
    registry: 'http://localhost:3000/app2-registry.js',
    registryType: 'jsonp',
    dependencies: {
      '@example/app3': 'http://localhost:3003/remoteEntry.js',
    },
    exposes: {
      './src/bootstrap': './src/bootstrap',
    },
    shared: {
      react: { singleton: true },
      'react-dom': { singleton: true },
      '@ringcentral/mfe-sentry': {
        singleton: true,
      },
      '@ringcentral/mfe-logger': {
        singleton: true,
      },
    },
  };
};
