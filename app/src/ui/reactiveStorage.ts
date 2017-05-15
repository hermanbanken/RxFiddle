import * as Rx from "rxjs"

export default class ReactiveStorage<T, Source> extends Rx.Subject<T> {
  private sub: Rx.Subscription
  private from?: {
    source: ReactiveStorage<Source, any>,
    projectDown: (r: Source) => T,
    projectUp: (t: T, existing: Source) => Source
  }
  // tslint:disable-next-line:no-constructor-vars
  constructor(private key: string) {
    super()
  }
  public setSource<S>(from: {
    source: ReactiveStorage<Source, S>,
    projectDown: (r: Source) => T,
    projectUp: (t: T, existing: Source) => Source
  }) {
    this.from = from
    return this
  }
  public project<P>(down: (r: T) => P, up: (t: P, existing: T) => T): ReactiveStorage<P, T> {
    return new ReactiveStorage<P, T>(undefined).setSource({
      projectDown: down,
      projectUp: up,
      source: this,
    })
  }
  public get current(): T {
    if (this.from) {
      return this.from.projectDown(this.from.source.current)
    }
    return localStorage.getItem(this.key) as any as T
  }
  public next(value: T) {
    if (this.from) {
      this.from.source.next(this.from.projectUp(value, this.from.source.current))
      return
    }
    if (localStorage.getItem(this.key) as any as T !== value) {
      localStorage.setItem(this.key, value as any as string)
    }
    super.next(value)
  }
  public unsubscribe() {
    this.sub.unsubscribe()
    this.sub = undefined
    super.unsubscribe()
  }
  protected _subscribe(subscriber: Rx.Subscriber<T>): Rx.Subscription {
    if (this.from) {
      return this.from.source.map(r => this.from.projectDown(r)).subscribe(subscriber)
    }
    if (!this.sub) {
      this.sub = Rx.Observable.fromEvent(window, "storage")
        .filter((e: StorageEvent) => e.key === this.key)
        .startWith({ key: this.key, newValue: localStorage.getItem(this.key) })
        .subscribe((e: StorageEvent) => this.next(e.newValue as any as T))
    }
    return super._subscribe(subscriber)
  }
}
