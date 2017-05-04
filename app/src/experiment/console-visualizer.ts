import ConsoleRunner from "./console-runner"
import * as Rx from "rxjs"
import { h } from "snabbdom/h"
import { VNode } from "snabbdom/vnode"

export default class ConsoleVisualizer {
  public dom: Rx.Observable<VNode>
  constructor(dataSource: ConsoleRunner) {
    this.dom = dataSource.dataObs
      .repeat()
      .scan((state, message) => {
        let kept = state.keep < 0 ? state.list.slice(0) : state.list.slice(-state.keep)
        let keep = message === "reset" ? 1 : -1
        return { list: kept.concat([{ date: new Date(), message, json: JSON.stringify(message) }]), keep }
      }, { keep: -1, list: [] })
      .map(_ => _.list)
      .startWith([])
      .map(list => h("div.console-messages", {
        hook: {
          postpatch: (old, next) => { scrollToBottom(next.elm as HTMLElement) },
        },
      }, list.map(format)))
  }
}

function format({ message, date, json }: { message: any, date: Date, json: string }, i: number) {
  if (message === "reset") {
    return h("div.reset", i === 0 ? "Restarted at " + date : "Stopped at " + date)
  }
  if (typeof message === "object" && "level" in message && "arguments" in message) {
    return h(`div.level-${message.level}`, message.arguments)
  }
  return h("div", json)
}

function scrollToBottom(elm: HTMLElement) {
  elm.scrollTop = elm.scrollHeight
}
