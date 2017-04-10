import h from "snabbdom/h"
import { VNode } from "snabbdom/vnode"

export function vbox(...nodes: VNode[]) {
  return h("div.flexy.flexy-v", nodes)
}
export function hbox(...nodes: VNode[]) {
  return h("div.flexy", nodes)
}
