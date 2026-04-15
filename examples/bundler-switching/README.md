# Bundler Switching Example

Demonstrates how `@ringcentral/mfe-builder`'s `ModuleFederationPlugin` works identically with both **webpack 5** and **Rspack** — and how the two can be mixed freely at runtime.

## Apps

| App    | Port | Description                        |
| ------ | ---- | ---------------------------------- |
| host   | 3001 | Loads `Button` from the remote app |
| remote | 3002 | Exposes a `Button` component       |

## Quick start

Install dependencies from the monorepo root first:

```bash
# from ringcentral-mfe root
yarn install && yarn build
```

Then from this directory:

```bash
# start both apps with webpack (default)
yarn start:webpack

# — or —

# start both apps with Rspack
yarn start:rspack
```

Each app UI shows which bundler produced it, so you can verify the mix-and-match scenarios below.

## Mix-and-match (host and remote use different bundlers)

Open two terminal windows from this directory:

```bash
# Terminal 1 — host with webpack, remote with rspack
cd host  && yarn start:webpack   # http://localhost:3001
cd remote && yarn start:rspack   # http://localhost:3002
```

```bash
# Terminal 2 — host with rspack, remote with webpack
cd host  && yarn start:rspack    # http://localhost:3001
cd remote && yarn start:webpack  # http://localhost:3002
```

Because the remote-entry protocol is bundler-agnostic (standard Module Federation), both configurations work correctly.

## How bundler switching works

`@ringcentral/mfe-builder` detects the `BUNDLER` environment variable at the Node.js build-process level:

```js
// inside @ringcentral/mfe-builder
const { BannerPlugin, container, DefinePlugin } = (
  process.env.BUNDLER === 'rspack' ? require('@rspack/core') : require('webpack')
);
```

The `start:rspack` / `build:rspack` scripts in each app's `package.json` pass `BUNDLER=rspack` via `cross-env`:

```json
"start:rspack": "cross-env BUNDLER=rspack rspack serve --config rspack.config.js"
```

The `site.config.js` file is **shared** between both configs — no duplication.

## Config comparison

### webpack.config.js
```js
const { DefinePlugin } = require('webpack');           // from webpack
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('@ringcentral/mfe-builder');
// babel-loader handles TypeScript + JSX
```

### rspack.config.js
```js
const { DefinePlugin, HtmlRspackPlugin } = require('@rspack/core'); // from @rspack/core
const { ModuleFederationPlugin } = require('@ringcentral/mfe-builder');
// builtin:swc-loader handles TypeScript + JSX (no extra deps)
```

The `ModuleFederationPlugin` import and `site.config.js` are identical in both files.

## Host-only apps: `injectMeta` requirement

Host apps (those that consume remotes but expose nothing) do **not** generate a `remoteEntry.js`.
The MFE banner script — which initialises `dynamicImport` so remote entries can be loaded at runtime — must therefore be injected into the main bundle instead.

Add `optimization.injectMeta: ['main']` to the host's `site.config.js`:

```js
// host/site.config.js
module.exports = {
  name: '@bundler-example/host',
  optimization: {
    injectMeta: ['main'],   // inject banner into main.js
  },
  dependencies: { ... },
};
```

Without this, `dynamicImport` is never initialised, the federated import promise never resolves, and the remote component shows "Loading…" indefinitely.
