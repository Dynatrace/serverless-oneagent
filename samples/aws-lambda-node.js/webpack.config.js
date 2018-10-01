/*
 * WARNING!
 *
 * This example is only there to show that you _can_ overtake the configuration
 * manually. This is *strongly discouraged* since serverless-webpack V3 as it
 * does not work with individual packaging of functions and prevents you to
 * use optimizations like Webpack's tree shaking.
 */

const path = require("path");
const nodeExternals = require('webpack-node-externals')
const slsw = require('serverless-webpack');

module.exports = {
  entry: slsw.lib.entries,
  target: "node",
  output: {
    libraryTarget: "commonjs",
    path: path.join(__dirname, ".webpack"),
    filename: "[name].js"
  },
  //externals: [ "@dynatrace/oneagent" ]
};
