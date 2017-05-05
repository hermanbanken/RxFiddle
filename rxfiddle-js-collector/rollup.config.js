export default {
  moduleName: "RxFiddle",
  format: "umd",
  dest: "rxfiddle.js",
  entry: './dist/rxfiddle-js-collector/index.js',
  globals: {
    "rxjs": "Rx",
    "ws": "WebSocket",
  },
  exports: "named",
  external: ["rxjs", "ws"]
}
