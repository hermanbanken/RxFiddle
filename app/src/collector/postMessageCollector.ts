import { DataSource } from "../visualization"
import * as Rx from "rxjs"

export default class PostMessageCollector implements DataSource {
  public dataObs: Rx.Observable<any>

  constructor(topic?: string) {
    this.dataObs = Rx.Observable.fromEvent<MessageEvent>(window, "message")
      .do(ping => {
        if("ping" === ping.data.type) {
          ping.source.postMessage({ type: "pong" }, ping.origin)
        }
      })
      .map(m => m.data)
      .share()
  }
}
