import { VNode, VNodeData } from "snabbdom/vnode"

export const Codes = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
}

function handle(vnode: VNode, keyEvent?: KeyboardEvent) {
  let list = gather(vnode)
  let active: number[] = list.flatMap(n =>
    n.children.flatMap((c, i) => c.vnode.elm === (document && document.activeElement) ? [c.index, i] : []) as number[]
  ) || [0, 0]
  let idx = list.findIndex(n => n.children.some(c => c.vnode.elm === (document && document.activeElement)))
  let siblings = list[idx].children.length
  let nextIdx: number
  let next: Navigatable[]
  switch (keyEvent.keyCode) {
    case Codes.UP:
      nextIdx = (list.length + idx - 1) % list.length
      next = list[nextIdx].children
        .sort((a, b) => Math.abs(a.index - active[0]) - Math.abs(b.index - active[0])).slice(0, 1)
      break
    case Codes.DOWN:
      nextIdx = (list.length + idx + 1) % list.length
      next = list[nextIdx].children
        .sort((a, b) => Math.abs(a.index - active[0]) - Math.abs(b.index - active[0])).slice(0, 1)
      break
    case Codes.LEFT:
      nextIdx = (active[1] + siblings - 1) % siblings
      next = list[idx].children.slice(nextIdx, nextIdx + 1)
      break
    case Codes.RIGHT:
      nextIdx = (active[1] + siblings + 1) % siblings
      next = list[idx].children.slice(nextIdx, nextIdx + 1)
      break
    default:
      return
  }
  next
    .map(c => c.vnode.elm)
    .filter(e => typeof (e as any).focus === "function")
    .forEach(e => (e as any).focus())
  if (next.length) {
    keyEvent.preventDefault()
    return false
  }
}

export class Navigatable {
  public mode: "column" | "row"
  public children: Navigatable[]
  public vnode: VNode
  public index: number
  public active: boolean
  public parent?: Navigatable

  constructor(mode: "column" | "row", index: number, children: Navigatable[] = []) {
    children.forEach(c => c.parent = this)
    this.children = children
    this.mode = mode
    this.index = index
  }
}

function gather(vnode: VNode, parent?: Navigatable): Navigatable[] {
  if (typeof vnode.data === "object" && typeof vnode.data.tabIndex === "object") {
    let returned: Navigatable = new Navigatable(
      vnode.data.tabIndex.group || "column",
      vnode.data.tabIndex.index,
      (vnode.children || [])
        .filter(c => typeof c !== "string")
        .flatMap(c => gather(c as VNode))
    )
    returned.active = document && document.activeElement === vnode.elm
    returned.vnode = vnode
    returned.parent = parent
    return [returned]
  } else {
    let children = (vnode.children || [])
      .filter(c => typeof c !== "string")
      .flatMap(c => gather(c as VNode, parent))
    return children
  }
}

let tabIndexModule = {
  create: (oldVNode: VNode, vnode: VNode) => {
    if (vnode.data.tabIndexRoot === true) {
      updateEventListeners(oldVNode, vnode)
    }
  },
  destroy: (oldVNode: VNode) => {
    if (oldVNode.data.tabIndexRoot === true) {
      updateEventListeners(oldVNode, null)
    }
  },
  update: (oldVNode: VNode, vnode: VNode) => {
    if (vnode.data.tabIndexRoot === true) {
      updateEventListeners(oldVNode, vnode)
    }
  },
}

function updateEventListeners(oldVnode: VNode, vnode?: VNode): void {
  let oldListener = (oldVnode as any).tabIndexListener
  let oldElm: Element = oldVnode.elm as Element
  let elm: Element = (vnode && vnode.elm) as Element

  if (oldListener && oldElm) {
    oldElm.removeEventListener("keyup", oldListener, false)
  }

  if (elm) {
    let listener = (vnode as any).tabIndexListener = handle.bind(null, vnode)
    elm.addEventListener("keyup", listener, false)
  }
}

export default tabIndexModule
