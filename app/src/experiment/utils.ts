import * as Rx from "rx"

export function formatSeconds(seconds: number): string {
  let minutes = Math.floor(seconds / 60)
  seconds = seconds % 60
  return `${minutes.toFixed(0)}:${seconds < 10 ? "0" + seconds.toFixed(0) : seconds.toFixed(0)}`
}

export let devToolOpen = Rx.Observable.create(observer => {
  let element = new Image() as any
  element.title = "Good. You opened the console."
  element.toString = () => "Good. You opened the console."
  element.__defineGetter__("id", () => {
    observer.onNext(true)
    observer.onCompleted()
  })
  if (console) {
    console.log(element)
  }
}).shareReplay(1)
// devToolOpen.subscribe(n => alert("Open!"))
