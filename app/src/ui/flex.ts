import h from "snabbdom/h"
import { VNode } from "snabbdom/vnode"

export function vbox(...nodes: VNode[]) {
  return h(`div.flexy.flexy-v`, nodes)
}
export function vboxo(options: any, ...nodes: VNode[]) {
  return h(`div.flexy.flexy-v.${options.class}`, nodes.filter(n => typeof n !== "undefined"))
}
export function hboxo(options: any, ...nodes: VNode[]) {
  return h(`div.flexy.${options.class}`, nodes.filter(n => typeof n !== "undefined"))
}
export function hbox(...nodes: VNode[]) {
  return h(`div.flexy`, nodes.filter(n => typeof n !== "undefined"))
}
