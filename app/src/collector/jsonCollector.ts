import { ICollector, AddStackFrame, AddObservable, AddSubscription, AddEvent, AddSubscriptionImpl } from "./logger"
import { Event } from "./event"
import { StackFrame } from "../utils"

type Response = { json(): Promise<any> }
declare const fetch: (url: string) => Promise<Response>

export default class JsonCollector implements ICollector {
  data: (AddStackFrame | AddObservable | AddSubscription | AddEvent)[] = []
  
  indices = {
    observables: { },
    stackframes: { },
    subscriptions: { },
  }

  get length(): number {
    return this.data.length
  }

  getLog(id: number): AddObservable | AddSubscription | AddEvent | AddStackFrame {
    return this.data[id]
  }
  getStack(id: number): AddStackFrame | null {
    if(this.data[id] instanceof AddStackFrame) {
      return this.data[id] as AddStackFrame
    } else {
      return null
    }
  }
  getObservable(id: number): AddObservable | null {
    if(this.data[id] instanceof AddObservable) {
      return this.data[id] as AddObservable
    } else {
      return null
    }
  }
  getSubscription(id: number): AddSubscription | null {
    if("observableId" in this.data[id]) {
      return this.data[id] as AddSubscription
    } else {
      return null
    }
  }
  getEvent(id: number): AddEvent | null {
    if(this.data[id] instanceof AddEvent) {
      return this.data[id] as AddEvent
    } else {
      return null
    }
  }

  private write: (data: any) => void = () => {}

  constructor(private url: string) {
    if(url.startsWith("ws://")) {
      let socket = new WebSocket(url);
      socket.onmessage = (m) => this.receive(JSON.parse(m.data))
      this.write = (d) => socket.send(JSON.stringify(d))
    } else {
      fetch(url).then(res => res.json()).then(data => {
        if(typeof data === "object" && Array.isArray(data)) {
          data.forEach(v => this.receive(v))
        }
      })
    }
  }

  receive(v: any): void {
    if("event" in v && "subscription" in v) {
      let r = this.merge(new AddEvent(), v, { 
        event: Event.fromJson(v.event) 
      })
      this.data.push(r)
    }
    if("observableId" in v) {
      let r = this.merge(new AddSubscriptionImpl(), v)
      this.data.push(r)
    }
    if("stackframe" in v) {
      let r = this.merge(new AddStackFrame(), v)
      this.data.push(r)
    }
    if("method" in v) {
      let r = this.merge(new AddObservable(), v)
      this.data.push(r)
    }
  }

  private merge<T>(fresh: T, ...inputs: any[]): T {
    for(let input of inputs) {
      for (let key in input) {
        (<any>fresh)[key] = input[key]
      }
    }
    return fresh
  }
}