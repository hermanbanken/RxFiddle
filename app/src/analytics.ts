import { UUID } from "./utils"
import * as Rx from "rx"

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

function websocket<D>(url: string): Rx.Observable<{ inbox: Rx.Observable<D>, outbox: Rx.IObserver<D> }> {
  return Rx.Observable.defer(() => {
    return Rx.Observable.create<{ inbox: Rx.Observable<D>, outbox: Rx.IObserver<D> }>(observer => {
      let connection = new WebSocket(url)
      let closes = Rx.Observable.fromEvent<MessageEvent>(connection, "close")
        .subscribe(e => observer.onError(new Error("Disconnected")))
      let opens = Rx.Observable.fromEvent<MessageEvent>(connection, "open")
        .subscribe(open => {
          observer.onNext({
            inbox: Rx.Observable.fromEvent<MessageEvent>(connection, "message").map(d => d.data as D),
            outbox: {
              onNext(message: D) { connection.send(typeof message === "object" ? JSON.stringify(message) : message) },
              onError(e: Error) {
                connection.send({
                  message: e.message, name: e.name,
                  stack: e.stack, type: "error",
                })
              },
              onCompleted() { connection.close(); observer.onCompleted() },
            } as Rx.IObserver<D>,
          })
        })
      return () => {
        opens.dispose()
        closes.dispose()
        connection.close()
      }
    })
  })
    // Retry with increasing timeouts on errors and cooldown every second
    .retryWhen(errors => Rx.Observable
      .merge(
      errors.map(_ => 1),
      Rx.Observable.timer(5000).map(_ => -1)
      )
      .scan((acc, mod) => Math.max(0, acc + mod), 0)
      .delay(k => Rx.Observable.timer(Math.pow(2, k) * 100))
    )
}

let queue = [] as any[]
let connection: { inbox: Rx.Observable<any>, outbox: Rx.IObserver<any> }
websocket("wss://data.rxfiddle.net/ws/" + session).subscribe(c => {
  connection = c
  queue.forEach(m => m instanceof Error ? c.outbox.onError(m) : c.outbox.onNext(m))
  queue = []
})

let AnalyticsObserver: Rx.IObserver<any> = {
  onNext(m) {
    if (connection) { connection.outbox.onNext(m) } else { queue.push(m) }
  },
  onError(e) {
    if (connection) { connection.outbox.onError(e) } else { queue.push(e) }
  },
  onCompleted() {
    if (connection) { connection.outbox.onCompleted() }
  },
}

export default AnalyticsObserver
