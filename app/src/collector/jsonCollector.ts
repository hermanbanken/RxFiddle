import { Message } from "../collector/logger"
import { DataSource } from "../visualization"
import { Event } from "./event"
import { AddEvent, AddObservable, AddStackFrame, AddSubscription, AddSubscriptionImpl, ICollector } from "./logger"
import * as Rx from "rx"

type Response = { json(): Promise<any> }
declare const fetch: (url: string) => Promise<Response>

export default class JsonCollector implements ICollector, DataSource {
  public data: (AddStackFrame | AddObservable | AddSubscription | AddEvent)[] = []
  public dataObs: Rx.Observable<any>

  public indices = {
    observables: {} as { [id: number]: { childs: number[], subscriptions: number[], inner: number[] } },
    stackframes: {} as { [source: string]: number },
    subscriptions: {} as { [id: number]: { events: number[], scoping: number[] } },
  }

  get length(): number {
    return this.data.length
  }

  private subject: Rx.Subject<any> = new Rx.Subject()
  private url: string

  constructor(url: string) {
    this.url = url
    if (url.startsWith("ws://")) {
      let socket = new WebSocket(url);
      socket.onmessage = (m) => this.receive(JSON.parse(m.data))
      this.write = (d) => socket.send(JSON.stringify(d))
    } else {
      fetch(url).then(res => res.json()).then(data => {
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

  public getLog(id: number): AddObservable | AddSubscription | AddEvent | AddStackFrame {
    return this.data[id]
  }
  public getStack(id: number): AddStackFrame | null {
    if (this.data[id] instanceof AddStackFrame) {
      return this.data[id] as AddStackFrame
    } else {
      return null
    }
  }
  public getObservable(id: number): AddObservable | null {
    if (this.data[id] instanceof AddObservable) {
      return this.data[id] as AddObservable
    } else {
      return null
    }
  }
  public getSubscription(id: number): AddSubscription | null {
    if ("observableId" in this.data[id]) {
      return this.data[id] as AddSubscription
    } else {
      return null
    }
  }
  public getEvent(id: number): AddEvent | null {
    if (this.data[id] instanceof AddEvent) {
      return this.data[id] as AddEvent
    } else {
      return null
    }
  }

  public write: (data: any) => void = () => {
    // intentionally left blank
  }

  private receive(v: any): void {
    this.subject.onNext(v as Message)

    if ("event" in v && "subscription" in v) {
      let r = this.merge(new AddEvent(), v, {
        event: Event.fromJson(v.event)
      })
      this.data.push(r)
      // index
      let index = this.indices.subscriptions[r.subscription]
      if (typeof index === "undefined") {
        index = this.indices.subscriptions[r.subscription] = { events: [], scoping: [] }
      }
      index.events.push(this.data.length - 1)
    }
    if ("observableId" in v) {
      let r = this.merge(new AddSubscriptionImpl(), v)
      this.data.push(r)
      // index
      if (typeof r.scopeId !== "undefined") {
        if (typeof this.indices.subscriptions[r.scopeId] === "object") {
          this.indices.subscriptions[r.scopeId].scoping.push(r.id)
        } else {
          console.warn("Invalid index", this.indices, "scopeId", r.scopeId, "id", r.id)
        }
      }
    }
    if ("stackframe" in v) {
      let r = this.merge(new AddStackFrame(), v)
      this.data.push(r)
      // index
      this.indices.stackframes[r.stackframe.source] = r.id
    }
    if ("method" in v) {
      let r = this.merge(new AddObservable(), v)
      this.data.push(r)
      // index
      this.indices.observables[r.id] = { childs: [], inner: [], subscriptions: [] }
      r.parents.forEach(parent => {
        let index = this.indices.observables[parent]
        if (typeof index !== "undefined") {
          index.childs.push(r.id)
        }
      })
    }
  }

  private merge<T>(fresh: T, ...inputs: any[]): T {
    for (let input of inputs) {
      for (let key in input) {
        if (input.hasOwnProperty(key)) {
          (fresh as any)[key] = input[key]
        }
      }
    }
    return fresh
  }
}
