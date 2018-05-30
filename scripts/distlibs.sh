# Production usage
cp node_modules/rxjs/bundles/Rx.js dist/Rx.js
cp node_modules/rxjs/bundles/Rx.min.js dist/Rx.min.js

# Instrumentation usage
mkdir -p dist/instrumentation/rxjs-4.1.0
cp node_modules/rx/dist/rx.all.js dist/instrumentation/rxjs-4.1.0/rx.all.js

mkdir -p dist/instrumentation/rxjs-5.x.x
cp node_modules/rxjs/bundles/Rx.js dist/instrumentation/rxjs-5.x.x/Rx.js

# Libs
cp -R node_modules/graphlib/dist/graphlib.min.js dist/graphlib.min.js
