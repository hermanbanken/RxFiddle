let path = require("path")

module.exports = {
  entry: {
    "main": "./src/main.ts",
    "editor": "./src/editor.ts",
    "worker-rx-4.1.0": "./src/instrumentation/rxjs-4.1.0/worker.ts",
  },
  devtool: "source-map",
  output: {
    filename: "./dist/[name].bundle.js"
  },
  resolve: {
    // Add '.ts' and '.tsx' as a resolvable extension.
    extensions: [".webpack.js", ".web.js", ".ts", ".tsx", ".js"]
  },
  module: {
    loaders: [
      // all files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'
      { test: /\.tsx?$/, loader: "ts-loader" }
    ]
  },
  externals: {
    rx: 'Rx',
    graphlib: 'graphlib',
    dagre: 'dagre',
    lodash: '_',
  },
  devServer: {
    contentBase: path.join(__dirname, "static"),
    compress: true,
    port: 9000
  }
}