/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const { DefinePlugin } = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('@ringcentral/mfe-builder');
const packageJson = require('./package.json');

/** @type {import('webpack').Configuration} */
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
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          presets: [
            ['@babel/preset-react', { runtime: 'automatic' }],
            '@babel/preset-typescript',
          ],
        },
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({ version: packageJson.version }),
    new DefinePlugin({
      __DEV__: JSON.stringify(true),
      __BUNDLER__: JSON.stringify('webpack'),
    }),
    new HtmlWebpackPlugin({ template: './public/index.html' }),
  ],
};
