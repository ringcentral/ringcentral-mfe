# RingCentral Micro Frontends

![Node CI](https://github.com/ringcentral/ringcentral-mfe/workflows/Node%20CI/badge.svg)
[![npm version](https://badge.fury.io/js/@ringcentral%2Fmfe-core.svg)](https://badge.fury.io/js/@ringcentral%2Fmfe-core)
![license](https://img.shields.io/npm/l/@ringcentral/mfe-core)

`RingCentral Micro Frontends` is a micro frontends framework for building Web applications, and it's based on [Module Federation](https://webpack.js.org/concepts/module-federation/) of Webpack.

- **@ringcentral/mfe-builder**: Provides Webpack plugin for RC MFE builds
- **@ringcentral/mfe-cli**: A core MFE CLI for registry
- **@ringcentral/mfe-core**: A core MFE runtime
- **@ringcentral/mfe-react**: Provide React-based MFE runtime
- **@ringcentral/mfe-shared**: Shared collection at runtime and build-time
- **@ringcentral/mfe-transport**: Provide a global communication transport for MFE
- **@ringcentral/mfe-service-worker**: Provide a service-worker for MFE
- **@ringcentral/mfe-sentry**: Provide a global sentry for MFE
- **@ringcentral/mfe-logger**: Provide a global logger for MFE

## Features

- **Dependencies management** - Set `site.config.json` or `site.config.js`
- **Compatible with building local-only SPA** - Use `yarn build --env spa`
- **Multiple types of rendering containers** - Support Micro-App/iframe/WebComponent
- **MFE Lifecycle** - Provide `init`, `mount` and `unmount` APIs as lifecycles
- **Generic Communication** - Use `@ringcentral/mfe-transport` as a global communication transport for MFE
- **CSS isolation** - Support CSS modules CSS isolation injection for Webpack `style-loader` and so on.
- **Debugger/Logger** - Provide meta info for Debugging/Logging.
- **Version control** - Support custom registry for MFE remote entry version control

## Installation

```sh
yarn add @ringcentral/mfe-builder -D
yarn add @ringcentral/mfe-react
```

Or use npm

```sh
npm install -D @ringcentral/mfe-builder
npm install @ringcentral/mfe-react
```

## Usage

1. Set `site.config.js` or `site.config.json` in the root path.

```js
/** @type {import('@ringcentral/mfe-builder').SiteConfigFile} */

module.exports = () => {
  return {
    name: '@example/app1',
    dependencies: {
      '@example/app2': 'http://localhost:3002/remoteEntry.js',
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
```

And use `ModuleFederationPlugin` for Webpack config from `@ringcentral/mfe-builder`.

```js
const { ModuleFederationPlugin } = require('@ringcentral/mfe-builder');

module.exports = {
  //...
  plugins: [
    new ModuleFederationPlugin(),
  ],
};
```

2. Define `app1` and `app2` exposed APIs in bootstrap files.

```ts
import { expose } from '@ringcentral/mfe-react';

export default expose({
  init: () => {
    //
  },
  render: (element = document.getElementById('root')) => {
    ReactDOM.render(<App />, element);
    return () => {
      ReactDOM.unmountComponentAtNode(element!);
    };
  },
});
```

3. Consume `app2` MFE in `app1`.

```ts
import { useApp } from '@ringcentral/mfe-react';

const App2 = useApp({
  name: '@example/app2',
  loader: () => import('@example/app2/src/bootstrap'),
});
```

4. You can bootstrap `app1` and `app2` projects with RC MFE.

## Usage in SharedWorker

1. Use SharedWorker in host application with `getWorkerName`
2. Dynamically import bootstrap file in worker thread
3. Add another entry points with `target: 'webworker'` and set `output.publicPath` and `output.path` in MFE webpack config(e.g. `examples/basic/app3/webpack.config.js`).

> `webpack dev server` is not supported in multiple entry points, so you need to build and serve the worker file manually(e.g. `examples/basic/app3/dev.js`).
> After building, all files in the `worker` directory except for `remoteEntry.js` do not need to be deployed.This means that you will have two MFE bundled files in different directories, e.g. `http://localhost:3000/remoteEntry.js` and `http://localhost:3000/worker/remoteEntry.js`. The name of the `worker` directory config is hardcode here.

## Contribution

> Note: `packages/builder/src/make.ts` and `packages/shared/src/*`
> 
> Make sure that any variables of the function are serializable and passed in externally, and disable async await syntax, otherwise it will throw error in MFE runtime.

1. Clone the repo

```sh
git clone https://github.com/ringcentral/ringcentral-mfe.git
```

2. bootstrap the repo

```sh
cd mfe
yarn install
```

3. Install and bootstrap the basic example

```sh
cd examples/basic
yarn install
```

4. Watch the sub-project `@ringcentral/mfe-builder` and `@ringcentral/mfe-shared`.

```sh
cd ../..
yarn watch
```

5. Start the basic example.

```sh
yarn start
```

6. Run testing

- Write and watch unit testing

```sh
yarn test
```

- Write and run E2E testing with `playwright`

```sh
yarn e2e:test
```

- Write and run integration testing

```sh
yarn it:test
```

7. Submit commit with `commitizen`

```sh
yarn commit
```

8. Run all tests in CI.

```sh
yarn ci:test
```

9. Submit PR and wait for the CI to pass.

10. Merge PR after the review.

### Publish a new version

1. Run `yarn update:version` to update the version of the package.
2. Submit PR and wait for the CI to pass.
3. Merge PR after the review.
4. Draft a new release in the GitHub release page [https://github.com/ringcentral/ringcentral-mfe/releases](https://github.com/ringcentral/ringcentral-mfe/releases).

> Release title should be like `x.x.x`

## License

`RingCentral Micro Frontends` is [MIT licensed](https://github.com/ringcentral/ringcentral-mfe/blob/main/LICENSE).
