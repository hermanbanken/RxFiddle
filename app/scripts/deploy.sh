#!/bin/bash

# Prepare
touch building.txt # ensure stash is created
git stash -u
git branch -D gh-pages-tmp || true
DEPLOYHEAD=`git name-rev --name-only HEAD`
git checkout -b gh-pages-tmp
git reset $DEPLOYHEAD --hard

# Build
tsc -p .
yarn run distlibs
yarn run build
git add -f $(find dist -type f -maxdepth 1)
git add -f dist/instrumentation
git commit -m 'Build'

# Deploy
cd ..
git branch -D gh-pages
git subtree split --prefix app -b gh-pages
git push -f origin gh-pages
cd app

# Reset
git checkout $DEPLOYHEAD
git stash pop
rm building.txt
yarn run distlibs
tsc -p .
