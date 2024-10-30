/* eslint-disable @typescript-eslint/no-var-requires */
const express = require('express');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');

const app = express();
const [config1, config2] = require('./webpack.config');

const compiler1 = webpack(config1);
const compiler2 = webpack(config2);

app.use(
  webpackDevMiddleware(compiler1, {
    publicPath: config1.output.publicPath,
  })
);

app.use(
  webpackDevMiddleware(compiler2, {
    publicPath: `${config2.output.publicPath}worker/`,
  })
);

app.listen(3003, () => {
  console.log('App3 listening on port 3003!\n');
});
