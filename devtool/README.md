# Building

```
../node_modules/.bin/typings typings.json
../node_modules/.bin/tsc -p tsconfig.json
yarn run dist-instrument; yarn run copy-ready-src; yarn run zip
```

Then add the dist folder to Chrome Extensions (chrome://extensions)