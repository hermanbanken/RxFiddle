import ConsoleRunner from "./console-runner"
import * as Rx from "rxjs"
import { h } from "snabbdom/h"
import { VNode } from "snabbdom/vnode"

export default class ConsoleVisualizer {
  public dom: Rx.Observable<VNode>
  constructor(dataSource: ConsoleRunner) {
    this.dom = dataSource.dataObs
      .repeat()
      .map(message => {
        if (message === "reset") {
          return h("div.reset", "Restarted at " + new Date())
        }
        if (typeof message === "object" && "level" in message && "arguments" in message) {
          return h(`div.level-${message.level}`, message.arguments)
        }
        return h("div", JSON.stringify(message))
      })
      .scan((list, next) => list.concat([next]), [])
      .startWith([])
      .map(list => h("div.console-messages", {
        hook: {
          postpatch: (old, next) => { scrollToBottom(next.elm as HTMLElement) },
        },
      }, list))
  }
}

function scrollToBottom(elm: HTMLElement) {
  elm.scrollTop = elm.scrollHeight
}
