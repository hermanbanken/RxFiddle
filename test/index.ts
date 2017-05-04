import { Observable } from "rxjs/Observable"
import { Subscriber } from "rxjs/Subscriber"
import * as Rx from "rxjs"
import "rxjs/add/observable/of"
import "rxjs/add/operator/map"
import { RxFiddle } from "rxfiddle"

new RxFiddle({ 
  Observable: Rx.Observable, 
  SubscriberProto: Rx.Subscriber.prototype, 
  ObservableProto: Rx.Observable.prototype
}).serve({ port: 8080 })

/* Rest of your application here */
let obs = Observable.of(1, 2, 3)
let obs2 = obs.map(x => x * 2)
let sub = obs2.subscribe()

console.log((obs as any).prototype)
console.log((obs2 as any).prototype)
console.log((sub as any).prototype)