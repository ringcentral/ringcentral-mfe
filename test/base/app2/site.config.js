/** @type {import('@ringcentral/mfe-builder').SiteConfigFile} */

// use `yarn start --env foo=bar --env production --env spa`
module.exports = (env) => {
  return {
    name: '@base/app2',
    registry: 'http://localhost:4000/app2-registry.json',
    dependencies: {
      '@base/app3': {
        entry: 'http://localhost:4003/remoteEntry.js',
        version: '>1.0.0',
      },
    },
    exposes: {
      './src/bootstrap': './src/bootstrap',
    },
    shared: {
      react: { singleton: true },
      'react-dom': { singleton: true },
    },
  };
};
