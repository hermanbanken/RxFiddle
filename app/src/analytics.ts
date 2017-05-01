import { UUID } from "./utils"
import { Observable, Subscriber } from "rxjs"
// import "rxjs/add/observable/create"
// import "rxjs/add/observable/fromEvent"
// import "rxjs/add/operator/map"
// import "rxjs/add/operator/retryWhen"

function getOrCreate(key: string, create: () => string) {
  if (typeof localStorage !== "undefined" && localStorage.getItem(key)) {
    return localStorage.getItem(key)
  } else if (typeof localStorage !== "undefined") {
    let value = create()
    localStorage.setItem(key, value)
    return value
  } else {
    return create()
  }
}

let key = "rxfiddle_browsersession"
let session = UUID()
let browser = getOrCreate(key, UUID)

function websocket<D>(url: string): Observable<{ inbox: Observable<D>, outbox: Subscriber<D> }> {
  return Observable.defer(() => {
    return Observable.create((observer: Subscriber<{ inbox: Observable<D>, outbox: Subscriber<D> }>) => {
      let connection = new WebSocket(url)
      let closes = Observable.fromEvent<MessageEvent>(connection, "close")
        .subscribe(e => observer.error(new Error("Disconnected")))
      let opens = Observable.fromEvent<MessageEvent>(connection, "open")
        .subscribe(open => {
          observer.next({
            inbox: Observable.fromEvent<MessageEvent>(connection, "message").map(d => d.data as D),
            outbox: {
              next(message: D) { connection.send(typeof message === "object" ? JSON.stringify(message) : message) },
              error(e: Error) {
                connection.send({
                  message: e.message, name: e.name,
                  stack: e.stack, type: "error",
                })
              },
              complete() { connection.close(); observer.complete() },
            } as Subscriber<D>,
          })
        })
      return () => {
        opens.unsubscribe()
        closes.unsubscribe()
        connection.close()
      }
    })
  })
    // Retry with increasing timeouts on errors and cooldown every second
    .retryWhen(errors => Observable
      .merge(
      errors.map(_ => 1),
      Observable.timer(5000).map(_ => -1)
      )
      .scan((acc, mod) => Math.max(0, acc + mod), 0)
      .delayWhen(k => Observable.timer(Math.pow(2, k) * 100))
    )
}

let queue = [] as any[]
let connection: { inbox: Observable<any>, outbox: Subscriber<any> }
websocket("wss://data.rxfiddle.net/ws/" + session).subscribe(c => {
  connection = c
  queue.forEach(m => m instanceof Error ? c.outbox.error(m) : c.outbox.next(m))
  queue = []
})

let AnalyticsObserver: Subscriber<any> = Subscriber.create(
  (m) => { if (connection) { connection.outbox.next(m) } else { queue.push(m) } },
  (e) => { if (connection) { connection.outbox.error(e) } else { queue.push(e) } },
  () => { if (connection) { connection.outbox.complete() } },
)

export default AnalyticsObserver
