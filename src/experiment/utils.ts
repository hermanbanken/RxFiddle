import * as Rx from "rxjs"

export function formatSeconds(seconds: number): string {
  let minutes = Math.floor(seconds / 60)
  seconds = seconds % 60
  return `${minutes.toFixed(0)}:${seconds < 10 ? "0" + seconds.toFixed(0) : seconds.toFixed(0)}`
}

export let devToolOpen: Rx.Observable<boolean> = new Rx.Observable(observer => {
  let element = new Image() as any
  element.title = "Good. You opened the console."
  element.toString = () => "Good. You opened the console."
  element.__defineGetter__("id", () => {
    observer.next(true)
    observer.complete()
  })
  if (console) {
    console.log(element)
  }
}).publishReplay(1)
// devToolOpen.subscribe(n => alert("Open!"))
