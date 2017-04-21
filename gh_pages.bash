git add dist src/instrumentation/rxjs-4.1.0/rx.all.js -f
git commit -m "Build"
git branch -D gh-pages
git subtree split --prefix app -b gh-pages
git push -f origin gh-pages:gh-pages
