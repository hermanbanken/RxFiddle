import { DataSource } from "../visualization"
import * as Rx from "rxjs"
import { Observer, NextObserver } from "rxjs/Observer"
import { Subscriber } from "rxjs/Subscriber"
import { Subscription } from "rxjs/Subscription"

export type RxRunnerState = "initializing" | "ready" | "used" | "stopped"

// Emit Editor errors in this stream
function throwErrors(event: any): Rx.Observable<any> {
  if (event && event.type === "error") {
    return new Rx.Observable(o => o.error(event.error))
  }
  return Rx.Observable.of(event)
}

export type DynamicCode = {
  chunks: string[]
}
export type Code = string | DynamicCode

export interface Runner {
  action: string
  dataObs: Rx.Observable<any>
  state: Rx.Observable<RxRunnerState>
  run(code: Code): void
  stop(): void
  trigger(): void
}

export default class RxRunner implements DataSource, Runner {
  public dataObs: Rx.Observable<any>
  public state: Rx.Observable<RxRunnerState>

  protected get workerFile() { return "dist/worker-rx-5.x.x.bundle.js" }

  private code: Rx.Observable<Code>
  private stateSubject = new Rx.BehaviorSubject<RxRunnerState>("ready")
  private subject: RxRunnerSubject<any>
  private analyticsObserver?: Rx.Subscriber<any>

  constructor(code: Rx.Observable<Code>, analyticsObserver?: Rx.Subscriber<any>) {
    this.code = code
    this.subject = new RxRunnerSubject<any>({
      stateObserver: this.stateSubject,
      workerFile: this.workerFile,
    })
    this.state = this.stateSubject.asObservable()
    this.dataObs = this.subject.asObservable().startWith("reset").map(d => {
      if (d && d.type === "error") {
        throw d.error
      }
      return d
    })
    // .takeUntil(this.state.filter(s => s === "stopping"))
    this.analyticsObserver = analyticsObserver
  }

  public run(code: Code) {
    let chunks = typeof code === "string" ? [code] : code.chunks
    if (this.analyticsObserver) {
      this.analyticsObserver.next({ code: chunks.join(), type: "run" })
    }
    chunks.forEach(chunk => this.subject.next({ code: chunk, type: "run" }))
  }

  public stop() {
    this.subject.error({ wasClean: false })
  }

  public trigger() {
    if (this.stateSubject.getValue() === "used") {
      this.stop()
    } else {
      this.code.take(1).subscribe((code) => this.run(code))
    }
  }

  public get action(): string {
    switch (this.stateSubject.getValue()) {
      case "ready": return "Run"
      case "used": return "Stop"
      case "stopped": return "Restart"
      default: return "?"
    }
  }
}

export interface RunnerConfig {
  workerFile: string
  resultSelector?: <T>(e: MessageEvent) => T
  openObserver?: NextObserver<Event>
  stateObserver?: NextObserver<RxRunnerState>
  closeObserver?: NextObserver<CloseEvent>
  closingObserver?: NextObserver<void>
}

interface RunnerWorker extends Worker {
  readyState: RxRunnerState
}

class RxRunnerSubject<T> extends Rx.AnonymousSubject<T> {
  private worker: RunnerWorker
  private output: Rx.Subject<T>

  // tslint:disable-next-line:no-constructor-vars
  constructor(private config: RunnerConfig) {
    super()
    this.output = new Rx.Subject<T>()
  }

  public unsubscribe() {
    const { source, worker } = this
    if (worker && worker.readyState === "ready") {
      worker.terminate()
      this._resetState()
    }
    super.unsubscribe()
    if (!source) {
      this.destination = new Rx.ReplaySubject()
    }
  }

  public next(value: T): void {
    let { source } = this
    if (source) {
      super.next(value)
    } else if (this.worker) {
      this.worker.readyState = "used"
      this.notify("used")
      this.worker.postMessage(value)
    }
  }

  protected notify(state: RxRunnerState) {
    if (this.config.stateObserver) {
      this.config.stateObserver.next(state)
    }
  }

  protected _resetState() {
    this.worker.readyState = "stopped"
    this.notify("stopped")
    this.worker = null
    if (!this.source) {
      this.destination = new Rx.ReplaySubject()
    }
    this.output = new Rx.Subject<T>()
  }

  protected connect() {
    const worker = this.worker = new Worker(this.config.workerFile) as RunnerWorker
    const observer = this.output
    worker.readyState = "initializing"
    this.notify("initializing")

    let t = worker.terminate
    worker.terminate = function () {
      t.bind(worker)()
    }

    const subscription = new Subscription(() => {
      this.worker = null
      if (worker && worker.readyState === "ready") {
        worker.terminate()
      }
    })

    const close = (e: CloseEvent) => {
      this._resetState()
      worker.terminate()
      this.notify("stopped")
      observer.complete()
      if (e.wasClean) {
        observer.complete()
      } else {
        observer.error(e)
      }
    }

    const onOpen = () => {
      const openObserver = this.config.openObserver
      if (openObserver) {
        openObserver.next({ type: "open" } as Event)
      }
      const queue = this.destination
      this.destination = Subscriber.create(
        (x) => (worker.readyState === "ready") && worker.postMessage(x),
        (e) => close(e),
        () => close({ code: 0, reason: "complete", wasClean: true } as CloseEvent)
      )
      if (queue && queue instanceof Rx.ReplaySubject) {
        subscription.add((queue as Rx.ReplaySubject<T>).subscribe(this.destination))
      }
    }

    worker.onerror = (e: Event) => {
      this._resetState()
      observer.error(e)
    }
    worker.onmessage = (e: MessageEvent) => {
      let result: T
      let f: (m: MessageEvent) => T = this.config.resultSelector || ((m: MessageEvent) => m.data as T)
      try {
        result = f(e)
      } catch (error) {
        observer.error(error)
        return
      }

      observer.next(result)
    }

    onOpen()

    return subscription
  }

  protected _subscribe(subscriber: Subscriber<T>): Subscription {
    const { source } = this
    if (source) {
      return source.subscribe(subscriber)
    }
    if (!this.worker) {
      this.connect()
    }
    this.worker.readyState = "ready"
    this.notify("ready")
    let subscription = new Subscription()
    subscription.add(this.output.subscribe(subscriber))
    subscription.add(() => {
      const { worker } = this
      if (this.output.observers.length === 0) {
        if (worker && worker.readyState === "ready") {
          worker.terminate()
        }
        this._resetState()
      }
    })
    return subscription
  }

}
