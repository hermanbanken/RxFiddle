import { Message } from "../collector/logger"
import { DataSource } from "../visualization"
import * as Rx from "rx"

type Response = { json(): Promise<any>, text(): Promise<string> }
declare const fetch: (url: string) => Promise<Response>

export default class JsonCollector implements DataSource {
  public dataObs: Rx.Observable<any>

  private subject: Rx.Subject<any> = new Rx.Subject()
  private url: string

  constructor(url: string) {
    this.url = url
    if (url.startsWith("ws://")) {
      let socket = new WebSocket(url)
      socket.onmessage = (m) => this.receive(JSON.parse(this.clean(m.data)))
      this.write = (d) => socket.send(JSON.stringify(d))
    } else {
      fetch(url).then(res => res.text()).then((data: any) => {
        data = JSON.parse(this.clean(data))
        if (typeof window !== "undefined") {
          (window as any).data = data
          console.info("window.data is now filled with JSON data of", url)
        }
        if (typeof data === "object" && Array.isArray(data)) {
          data.forEach(v => this.receive(v))
        }
      })
    }

    this.dataObs = this.subject.asObservable()
  }

  public write: (data: any) => void = () => {
    // intentionally left blank
  }

  private receive(v: any): void {
    this.subject.onNext(v as Message)
  }

  private clean(str: string): string {
    return str.replace(/\/\/.*/g, "\n")
  }
}
