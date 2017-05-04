export default {
  moduleName: "RxFiddle",
  format: "umd",
  dest: "bundle.js",
  entry: './index.js',
  globals: {
    "rxjs": "Rx",
    "ws": "WebSocket",
  },
  exports: "named",
  external: ["rxjs", "ws"]
}
