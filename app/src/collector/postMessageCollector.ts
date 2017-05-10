import { DataSource } from "../visualization"
import * as Rx from "rxjs"
import { Scheduler } from "rxjs/Scheduler"

type Response = { json(): Promise<any>, text(): Promise<string> }
declare const fetch: (url: string) => Promise<Response>

export default class LocalStorageCollector implements DataSource {
  public dataObs: Rx.Observable<any>
  public subscriptions: Rx.Subscription
  public topics: Rx.Observable<string[]> = Rx.Observable
    .fromEvent(window, "storage")
    .filter((e: StorageEvent) => e.key === "rxfiddle_topics")
    .map((e: StorageEvent) => e.newValue)
    .startWith(localStorage.getItem("rxfiddle_topics"))
    .map((json) => JSON.parse(json) as string[])
  private subject = new Rx.ReplaySubject()
  private topic: string

  constructor(topic?: string) {
    this.subscriptions = new Rx.Subscription()
    this.dataObs = this.subject.asObservable()
    if (!topic) {
      this.topics.subscribe(index => {
        console.log("Found topics", index, "starting", index.slice(-1)[0])
        this.start(index.slice(-1)[0])
      })
    } else {
      this.start(topic)
    }
  }

  public write: (data: any) => void = () => {
    // intentionally left blank
  }

  public restart(topic: string) {
    this.start(topic)
  }

  private start(topic: string) {
    this.topic = topic
    this.subscriptions.unsubscribe()
    this.subscriptions = new Rx.Subscription()
    this.subject.next("restart")

    let countKey = `rxfiddle_topic_${topic}_count`
    let sub = Rx.Observable.fromEvent(window, "storage")
      .filter((e: StorageEvent) => e.key === countKey)
      .debounceTime(10)
      .map((e: StorageEvent) => parseInt(e.newValue, 10))
      .scan((state: { prev: number, last: any[] }, next: number) => {
        let last = []
        console.log("Reading messages from", state.prev, "to", next)
        for (let i = state.prev; i < next; i++) {
          last.push(JSON.parse(localStorage.getItem(`rxfiddle_topic_${topic}_${i}`)))
        }
        return { last, prev: next }
      }, { last: [], prev: 0 })
      .flatMap(state => state.last)
      .subscribe(this.subject)

    this.subscriptions.add(sub)
  }
}

export class LocalStorageSender {
  private count: number = 0
  // tslint:disable-next-line:no-constructor-vars
  public constructor(private topic: string) {
    if (!localStorage) {
      throw new Error("LocalStorage support is required to use this RxFiddle MessageSender")
    }
    let topics = this.get("rxfiddle_topics") || []
    this.set("rxfiddle_topics", topics.concat([topic]))
  }
  public send(message: any) {
    this.count++
    try {
      this.set(`rxfiddle_topic_${this.topic}_count`, this.count)
      this.set(`rxfiddle_topic_${this.topic}_${this.count - 1}`, message)
    } catch (e) {
      this.clear()
    }
  }
  private get(key: string): any {
    return JSON.parse(localStorage.getItem(key))
  }
  private set(key: string, value: any) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      console.warn("Cleared LocalStorage as it was full")
      this.clear()
    }
  }
  private clear() {
    Object.keys(localStorage).filter(k => k.startsWith("rxfiddle_topic")).forEach(key => localStorage.removeItem(key))
  }
}

// export class BatchedLocalStorageSender {
//   private subject: Rx.Subject<any>
//   private count: number = 0
//   private _send: number = 0
//   // tslint:disable-next-line:no-constructor-vars
//   public setup(topic: string, scheduler: Scheduler) {
//     let topics = JSON.parse(localStorage.getItem("rxfiddle_topics")) || []
//     localStorage.setItem("rxfiddle_topics", JSON.stringify(topics.concat([topic])))

//     this.subject = new Rx.ReplaySubject()
//     this.subject.bufferTime(1000, scheduler).subscribe(ms => {
//       this._send += ms.length
//       if (this.count !== this.count) {
//         console.log("count", this.count, this._send)
//       }
//       if (ms.length > 0) {
//         localStorage.setItem(`rxfiddle_topic_${topic}`, `${this.count}`)

//         console.log("Sending batch of ", ms.length)
//         postMessage({ message: { batch: ms }, topic }, window.location.origin)
//       }
//     }, e => console.warn(e))
//   }
//   public send(message: any) {
//     this.count++
//     this.subject.next(message)
//   }
// }
