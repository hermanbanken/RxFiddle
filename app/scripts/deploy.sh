#!/bin/bash

# Prepare
touch building.txt # ensure stash is created
git stash -u
git branch -D gh-pages-tmp || true
DEPLOYHEAD=`git name-rev --name-only HEAD`
SHA=`git rev-parse HEAD`
git checkout --orphan gh-pages-tmp
git commit -m "Copy of $SHA"

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
