/* eslint-disable prefer-destructuring */
/* eslint-disable @typescript-eslint/no-var-requires */
const { DefinePlugin } = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const { ModuleFederationPlugin, insertStyle } = require('@ringcentral/mfe-builder');
const {
  GenerateManifestWebpackPlugin,
} = require('@ringcentral/mfe-service-worker/dist/webpack-plugin/generate-manifest-webpack-plugin');
const packageJson = require('./package.json');

module.exports = {
  entry: './src/index',
  mode: 'development',
  devServer: {
    client: {
      overlay: false,
    },
    static: path.join(__dirname, 'dist'),
    port: 3002,
    allowedHosts: 'all',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    },
  },
  output: {
    publicPath: 'auto',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      react: path.resolve(__dirname, '../../../node_modules/react'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(j|t)sx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          presets: ['@babel/preset-react', '@babel/preset-typescript'],
        },
      },
      {
        test: /\.css$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'style-loader',
            options: {
              insert: insertStyle,
            },
          },
          {
            loader: 'css-loader',
            options: {
              modules: true,
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      version: packageJson.version,
    }),
    new DefinePlugin({
      __DEV__: JSON.stringify(true),
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    new GenerateManifestWebpackPlugin({
      exclude: [/\.map$/, /asset-manifest\.json$/, /\.wav$/, /readme\.md/i],
      dontCacheBustURLsMatching:
        /(\.[a-z0-9]{20}\.)|(\/[a-z0-9]{20}\.)|(-[a-z0-9]{32}\.)/,
      manifestFileName: 'precache-manifest',
    }),
  ],
};
