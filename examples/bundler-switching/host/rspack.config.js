/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const { DefinePlugin, HtmlRspackPlugin } = require('@rspack/core');
const { ModuleFederationPlugin } = require('@ringcentral/mfe-builder');
const packageJson = require('./package.json');

// Set BUNDLER=rspack before running this config so that ModuleFederationPlugin
// loads @rspack/core instead of webpack (see package.json start:rspack script).

/** @type {import('@rspack/core').Configuration} */
module.exports = {
  entry: './src/index',
  mode: 'development',
  devServer: {
    port: 3001,
    client: { overlay: false },
    static: path.join(__dirname, 'dist'),
  },
  output: {
    publicPath: 'auto',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.(j|t)sx?$/,
        loader: 'builtin:swc-loader',
        options: {
          jsc: {
            parser: { syntax: 'typescript', tsx: true },
            transform: { react: { runtime: 'automatic' } },
          },
        },
        type: 'javascript/auto',
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({ version: packageJson.version }),
    new DefinePlugin({
      __DEV__: JSON.stringify(true),
      __BUNDLER__: JSON.stringify('rspack'),
    }),
    new HtmlRspackPlugin({ template: './public/index.html' }),
  ],
};
