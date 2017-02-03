import * as Rx from "rx"

export default class TestObserver<T> implements Rx.Observer<T> {
  public nexts: T[] = []
  public error?: any = null
  public completed: boolean = false
  public events: any[] = []

  public onNext(value: T): void {
    this.nexts.push(value)
    this.events.push({ time: new Date(), value })
  }
  public onError(exception: any): void {
    this.error = exception
    this.events.push({ time: new Date(), exception })
  }
  public onCompleted(): void {
    let completed = this.completed = true
    this.events.push({ time: new Date(), completed })
  }
  public makeSafe(disposable: Rx.IDisposable): Rx.Observer<T> {
    return this
  }
  public dispose(): void {
    let disposed = true
    this.events.push({ time: new Date(), disposed })
  }
}