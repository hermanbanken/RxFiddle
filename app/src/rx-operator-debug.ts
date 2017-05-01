import { Observable } from "rxjs"
import { Operator } from "rxjs/operator"
import { Subscriber } from "rxjs/subscriber"
import { Subscription } from "rxjs/subscription"

export function debug<T>(name: string): DebugOperator<T> {
  return new DebugOperator(name)
}

export default class DebugOperator<T> implements Operator<T, T> {

  // tslint:disable-next-line:no-constructor-vars
  constructor(private name: string) {
  }

  public call(subscriber: Subscriber<T>, source: Observable<T>): Subscription {
    console.log(this.name, "subscribe")
    let sub = source.do(
      (x) => console.log(this.name, "next", x),
      (e) => console.log(this.name, "error", e),
      () => console.log(this.name, "complete")
    ).subscribe(subscriber)
    sub.add(() => {
      console.log(this.name, "unsubscribe")
    })
    return sub
  }
}
