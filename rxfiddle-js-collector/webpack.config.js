let path = require("path")
let webpack = require('webpack');

module.exports = {
  entry: {
    "index": "./index.ts",
  },
  devtool: "source-map",
  output: {
    filename: "./[name].bundle.js"
  },
  resolve: {
    // Add '.ts' and '.tsx' as a resolvable extension.
    extensions: [".webpack.js", ".web.js", ".ts", ".js"]
  },
  module: {
    loaders: [
      // all files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'
      { test: /\.tsx?$/, loader: "babel-loader!ts-loader" },
      {
        test: /\.(js|jsx)$/,
        use: 'babel-loader?presets[]=es2015',
      },
    ],
    noParse: /(\/(ws)\/|^ws$)/
  },
<<<<<<< Updated upstream
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      sourceMap: true
    })
  ],
  externals: {
    rx: 'Rx',
    rxjs: 'Rx',
    "rxjs/Rx": 'Rx',
  },
=======
  externals: [{
    "rxjs": "Rx"
  },/^[^.]/],
>>>>>>> Stashed changes
}