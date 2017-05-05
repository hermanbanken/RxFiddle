import { Observable } from "rxjs/Observable"
import { Subscriber } from "rxjs/Subscriber"
import "rxjs/add/observable/of"
import "rxjs/add/operator/map"
import RxFiddle from "rxfiddle"

new RxFiddle({ 
  Observable: Observable,
  Subscriber: Subscriber,
}).serve({ port: 8080 })

/* Rest of your application here */
Observable.of(1, 2, 3)
  .map(x => x * 2)
  .subscribe()
