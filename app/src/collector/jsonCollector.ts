import { Message } from "../collector/logger"
import { DataSource } from "../visualization"
import * as Rx from "rxjs"

type Response = { json(): Promise<any>, text(): Promise<string> }
declare const fetch: (url: string) => Promise<Response>

export default class JsonCollector implements DataSource {
  public dataObs: Rx.Observable<any>
  private subject: Rx.Subject<any> = new Rx.Subject()
  private url: string

  constructor(url?: string) {
    if (url) {
      this.start(url)
    } else {
      this.dataObs = this.subject.asObservable()
    }
  }

  public write: (data: any) => void = () => {
    // intentionally left blank
  }

  public restart(url: string) {
    let previous = this.subject
    this.start(url)
    previous.complete()
  }

  private receive(v: any, subject: Rx.Subject<any>): void {
    subject.next(v as Message)
  }

  private clean(str: string): string {
    return str.replace(/\/\/.*/g, "\n")
  }

  private start(url: string) {
    let subject = new Rx.Subject()
    this.subject = subject
    this.dataObs = this.subject.asObservable()
    this.url = url
    if (url.startsWith("ws://")) {
      let socket = new WebSocket(url)
      socket.onmessage = (m) => this.receive(JSON.parse(this.clean(m.data)), subject)
      this.write = (d) => socket.send(JSON.stringify(d))
      subject.do(() => { /* */ }, undefined, () => socket.close())
    } else {
      fetch(url).then(res => res.text()).then((data: any) => {
        try {
          data = JSON.parse(this.clean(data))
        } catch (e) {
          data = JSON.parse(data)
        }
        if (typeof window !== "undefined") {
          (window as any).data = data
          console.info("window.data is now filled with JSON data of", url)
        }
        if (typeof data === "object" && Array.isArray(data)) {
          data.forEach(v => this.receive(v, subject))
        }
      })
    }
  }
}
