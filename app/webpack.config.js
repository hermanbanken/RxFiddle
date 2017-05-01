let path = require("path")

module.exports = {
  entry: {
    "main": "./src/main.ts",
    "editor": "./src/editor.ts",
    "experiment": "./src/experiment.ts",
    "worker-rx-4.1.0": "./src/instrumentation/rxjs-4.1.0/worker.ts",
    "worker-rx-5.x.x": "./src/instrumentation/rxjs-5.x.x/worker.ts",
    "worker-console-experiment": "./src/instrumentation/console-experiment/worker.ts",
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
      { test: /\.tsx?$/, loader: "babel-loader!ts-loader" },
      {
        test: /\.(js|jsx)$/,
        use: 'babel-loader?presets[]=es2015',
        // exclude: /node_modules|bower_components)/,
      },
    ],
  },
  externals: {
    rx: 'Rx',
    rxjs: 'Rx',
    "rxjs/Rx": 'Rx',
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