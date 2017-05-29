import { Observable } from "rxjs/Observable"
import { Subscriber } from "rxjs/Subscriber"
import "rxjs/add/observable/fromEvent"
import "rxjs/add/observable/of"
import "rxjs/add/operator/map"
import "rxjs/add/operator/scan"
import "rxjs/add/operator/startWith"
import RxFiddle from "rxfiddle"

new RxFiddle({ 
  Observable: Observable,
  Subscriber: Subscriber,
}).openWindow({ address: "http://localhost:8085#type=postMessage", origin: "http://localhost:8085" })

/* Rest of your application here */
Observable.of(1, 2, 3)
  .map(x => x * 2)
  .subscribe()

Observable.fromEvent(document.querySelector("button"), "click" )
  .scan<number>((p, _) => p + 1, 0)
  .startWith(0)
  .subscribe(c => (document.querySelector("#counter") as HTMLElement).innerText = `${c}`)