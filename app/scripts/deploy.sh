# Prepare
touch building.txt # ensure stash is created
git stash -u
DEPLOYHEAD=`git rev-parse --verify HEAD`
git checkout gh-pages
git reset $DEPLOYHEAD --hard

# Build
tsc -p .
yarn run distlibs
yarn run build
git add -f $(find dist -type f -maxdepth 1)
git add -f dist/instrumentation
git commit -m 'Build'
git push -f origin gh-pages

# Reset
git checkout $DEPLOYHEAD
git stash pop
rm building.txt
yarn run distlibs
tsc -p .
