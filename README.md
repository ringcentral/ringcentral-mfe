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
- **Federated types** - Opt-in TypeScript declarations for federated modules via the `dts` option

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

## Federated types

`@ringcentral/mfe-builder` can emit and consume TypeScript declarations for federated modules using the standard Module Federation type mechanism: a producer publishes `@mf-types.zip` / `@mf-types.d.ts` next to its `remoteEntry.js`, and a consumer gets typed remotes. It is opt-in via the `dts` option and off by default — when `dts` is unset the build output is unchanged.

Types are handled by [`@module-federation/dts-plugin`](https://www.npmjs.com/package/@module-federation/dts-plugin), which ships as an **optional dependency** of `@ringcentral/mfe-builder` — it is installed automatically, so no manual step is needed to use `dts`.

> `@module-federation/dts-plugin` requires **Node >= 20.18.1**. On older Node it is skipped at install time and the `dts` option is unavailable — enabling `dts` then fails with a clear error. The builder itself keeps its Node >= 16 support for projects that do not use `dts`.

### Producing types

Enable `generateTypes` in the remote's `site.config`:

```js
module.exports = {
  name: '@example/app2',
  exposes: {
    './src/bootstrap': './src/bootstrap',
  },
  dts: {
    generateTypes: {
      // A tsconfig that narrows `rootDir` to the exposed surface keeps the
      // archive to the public API instead of the whole workspace.
      tsConfigPath: './tsconfig.types.json',
    },
  },
};
```

The archive is emitted at the output root, next to `remoteEntry.js`, so consumers can locate it. If the container `filename` is nested, set `generateTypes.outputDir` to the same directory to keep the archive co-located with the remote entry.

> The exposed declarations must use relative or package-resolvable imports only. `@module-federation/dts-plugin` does not rewrite `tsconfig` path-alias imports in the emitted declarations ([module-federation/core#3363](https://github.com/module-federation/core/issues/3363)), so a public entry importing through a path alias (for example `@internal/model`) is unresolvable for consumers.

### Consuming types

Enable `consumeTypes` (or simply set `dts` when the site declares `dependencies`):

```js
module.exports = {
  name: '@example/app1',
  dependencies: {
    '@example/app2': 'http://localhost:3002/remoteEntry.js',
  },
  dts: {
    consumeTypes: true,
  },
};
```

The type-archive URL for each remote is derived from its `dependencies` entry (the same base plus `/@mf-types.zip`). When the site sets a `registry` with `registryAutoFetch: true` (and the default `fetch` registry type), the URLs are instead resolved from the registry at build time so the types match the version the runtime resolves; on any registry miss or failure the derived URL is used.

Add the fetched types to the consumer's `tsconfig.json` so the editor and compiler pick them up:

```json
{
  "compilerOptions": {
    "paths": {
      "*": ["./@mf-types/*"]
    }
  }
}
```

Remote types update out of band from the consumer's lockfile; delete the local `./@mf-types` directory to force a refresh.

### Limitations

- No dev-time hot type reload — `dev` is forced off; types are generated and consumed at build time.
- `tsconfig` path-alias imports in a public entry are not rewritten in the emitted declarations ([module-federation/core#3363](https://github.com/module-federation/core/issues/3363)); use relative or package-resolvable imports.
- Build-time registry resolution needs the `registry` endpoint reachable from the build environment; otherwise the static derivation from `dependencies` is used.

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

This repo publishes packages through GitHub Actions when a GitHub Release is published.

1. Update package versions.

```sh
# stable release (example: 0.4.19)
yarn update:version patch

# first beta release (example: 0.4.19-beta.0)
yarn update:version prepatch --preid beta

# next beta release (example: 0.4.19-beta.1)
yarn update:version prerelease --preid beta
```

2. Submit PR and wait for CI to pass.
3. Merge PR after review.
4. Create a release in GitHub:
   - Stable release:
     - Tag format: `vX.Y.Z` (for example `v0.4.19`)
     - Do not mark as pre-release
     - Published to npm dist-tag `latest`
   - Beta release:
     - Tag format: `vX.Y.Z-beta.N` (for example `v0.4.19-beta.0`)
     - Mark as `This is a pre-release`
     - Published to npm dist-tag `beta`

> Safety check: if a GitHub pre-release tag does not contain `-beta.`, the publish workflow will fail intentionally.

## License

`RingCentral Micro Frontends` is [MIT licensed](https://github.com/ringcentral/ringcentral-mfe/blob/main/LICENSE).
