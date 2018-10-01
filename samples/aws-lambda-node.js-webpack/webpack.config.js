
const path = require("path");
const slsw = require('serverless-webpack');

module.exports = {
  entry: slsw.lib.entries,
  target: "node",
  mode: "production",
  output: {
    libraryTarget: "commonjs",
    path: path.join(__dirname, ".webpack"),
    filename: "[name].js"
  }
};
