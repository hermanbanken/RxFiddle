import * as Rx from "rxjs"
import RxFiddle from "rxfiddle"

new RxFiddle({ Rx }).serve({ port: 8080 })

/* Rest of your application here */
Rx.Observable.of(1, 2, 3)
  .map(x => x * 2)
  .subscribe()
