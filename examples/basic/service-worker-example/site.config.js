module.exports = {
  $schema: '../../../node_modules/@ringcentral/mfe-shared/site-schema.json',
  name: '@example/service-worker',
  prefix: 'example-service-worker',
  // "registry": "http://localhost:3000/service-worker-registry.js",
  // "registryType": "jsonp",
  optimization: {
    injectMeta: ['main'],
  },
  dependencies: {
    '@example/app2': {
      entry: 'http://localhost:3002/remoteEntry.js',
      version: '>1.0.0',
    },
    '@example/app3': 'http://localhost:3003/remoteEntry.js',
  },
  exposes: {
    './src/bootstrap': './src/bootstrap',
  },
  shared: {
    react: {
      singleton: true,
    },
    'react-dom': {
      singleton: true,
    },
  },
};
