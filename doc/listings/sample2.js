let keyup$ = Observable.fromEvent(w, "keyup")
let keydown$ = Observable.fromEvent(w, "keydown")
let click$ = Observable.fromEvent(w, "click")                      

keydown$.flatMap(keyup =>
  click$.takeUntil(keyup$).count()
)