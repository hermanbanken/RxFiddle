import { DataSource } from "../visualization"
import * as Rx from "rxjs"

export type RxRunnerState = "ready" | "starting" | "running" | "stopping" | "stopped"

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

  protected workerFile = "dist/worker-rx-5.x.x.bundle.js"

  private code: Rx.Observable<Code>
  private stateSubject = new Rx.BehaviorSubject<RxRunnerState>("ready")
  private worker: Worker
  private workerReady: boolean
  private handler: (message: any) => void
  private analyticsObserver?: Rx.Subscriber<any>

  constructor(code: Rx.Observable<Code>, analyticsObserver?: Rx.Subscriber<any>) {
    this.code = code
    this.dataObs = Rx.Observable
      .fromEventPattern<any>(h => {
        this.handler = (m) => h(m.data)
        this.stateSubject.next("ready")
      }, h => {
        if (this.stateSubject.getValue() !== "stopped") {
          this.stop()
        }
      })
      .flatMap(throwErrors)
      .delay(0, Rx.Scheduler.async)
      .takeUntil(this.stateSubject.filter(s => s === "stopped"))
      .let(o => {
        return Rx.Observable.defer(() => {
          console.log("Subscribing to RxRunner.dataObs")
          return o.merge(new Rx.Observable(() => {
            return () => console.log("Unsubscribing RxRunner.dataObs")
          }))
        })
      })
    this.stateSubject.next("ready")
    this.state = this.stateSubject
    this.analyticsObserver = analyticsObserver
    this.prepare()
  }

  public run(code: Code) {
    this.stateSubject.next("starting")
    this.prepare()
    this.workerReady = false
    if (this.handler) { this.handler({ data: "reset" }) }
    let chunks = typeof code === "string" ? [code] : code.chunks
    if (this.analyticsObserver) {
      this.analyticsObserver.next({ code: chunks.join(), type: "run" })
    }
    chunks.forEach(chunk => this.worker.postMessage({ code: chunk, type: "run" }))
    this.stateSubject.next("running")
  }

  public stop() {
    this.prepare()
    if (this.analyticsObserver) {
      this.analyticsObserver.next({ type: "stop" })
    }
    this.stateSubject.next("stopped")
  }

  public trigger() {
    if (this.stateSubject.getValue() === "ready" || this.stateSubject.getValue() === "stopped") {
      this.code.take(1).subscribe((code) => this.run(code))
    } else if (this.stateSubject.getValue() === "running") {
      return this.stop()
    }
  }

  public get action(): string {
    switch (this.stateSubject.getValue()) {
      case "ready": return "Run"
      case "starting":
      case "running": return "Stop"
      case "stopping":
      case "stopped": return "Restart"
      default: return "?"
    }
  }

  private prepare() {
    if (!this.workerReady) {
      if (this.worker) {
        this.worker.terminate()
      }
      this.worker = new Worker(this.workerFile)
      this.worker.onmessage = (m) => this.handler(m)
      this.workerReady = true
    }
  }
}
