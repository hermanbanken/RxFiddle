import { DataSource } from "../visualization"
import * as Rx from "rx"

export type RxRunnerState = "ready" | "starting" | "running" | "stopping" | "stopped"

// Emit Editor errors in this stream
function throwErrors(event: any): Rx.Observable<any> {
  if (event && event.type === "error") {
    return Rx.Observable.create(o => o.onError(event.error))
  }
  return Rx.Observable.just(event)
}

export type DynamicCode = {
  chunks: string[]
}
export type Code = string | DynamicCode

export default class RxRunner implements DataSource {
  public dataObs: Rx.Observable<any>
  public state: Rx.Observable<RxRunnerState>

  private code: Rx.Observable<Code>
  private stateSubject = new Rx.BehaviorSubject<RxRunnerState>("ready")
  private worker: Worker
  private handler: (message: any) => void

  constructor(code: Rx.Observable<Code>) {
    this.code = code
    this.dataObs = Rx.Observable
      .fromEventPattern<any>(h => {
        console.log("RxRunner Subscribed")
        this.handler = (m) => h(m.data)
        this.stateSubject.onNext("ready")
      }, h => {
        console.log("RxRunner Disposed")
        this.stop()
      })
      .flatMap(throwErrors)
      .delay(0, Rx.Scheduler.async)
      .takeUntil(this.stateSubject.filter(s => s === "stopped"))
    this.stateSubject.onNext("ready")
    this.state = this.stateSubject
  }

  public run(code: Code) {
    this.stateSubject.onNext("starting")
    this.worker = new Worker("../dist/worker-rx-4.1.0.bundle.js")
    this.worker.onmessage = this.handler
    this.handler({ data: "reset" })
    let chunks = typeof code === "string" ? [code] : code.chunks
    chunks.forEach(chunk => this.worker.postMessage({ code: chunk, type: "run" }))
    this.stateSubject.onNext("running")
  }

  public stop() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = undefined
    }
    this.stateSubject.onNext("stopped")
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
}
