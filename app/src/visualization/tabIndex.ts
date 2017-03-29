import { VNode, VNodeData } from "snabbdom/vnode"
declare module "snabbdom/vnode" {
  interface VNodeData {
    tabIndex?: { index?: number, group?: "column" | "row" },
    tabIndexRoot?: boolean
    attrs?: any
  }
}

export const Codes = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
}

function handle(vnode: VNode, keyEvent?: KeyboardEvent) {
  let list = gather(vnode)
  console.log("tabIndex node", keyEvent, list, keyEvent && list[0] && list[0].handle(keyEvent))
}

export class Navigatable {

  private static key(event: KeyboardEvent): number {
    if (event.keyCode === 9) { return event.shiftKey ? Codes.LEFT : Codes.RIGHT }
    if (Object.keys(Codes).some((k: string) => (Codes as any)[k] === event.keyCode)) {
      return event.keyCode
    }
  }

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

  public handle(keyEvent: KeyboardEvent) {
    let key = Navigatable.key(keyEvent)
    let active = this.getActive()
    let next: Navigatable = this
    if (key && active) {
      next = active.next(key, true) || this
    }
    console.log(next && next.index)
    if (key && next) {
      next.isActive()
      keyEvent.preventDefault()
      keyEvent.cancelBubble = true
      return false
    }
  }
  public isActive(valueOrOldNav: boolean | Navigatable = true): this {
    if (typeof valueOrOldNav === "boolean") {
      this.active = valueOrOldNav
    } else if (typeof this.index === "undefined") {
      this.children
        .filter(c => c.index < valueOrOldNav.index).slice(-1)
        .concat(this.children).slice(0, 1)
        .forEach(c => c.isActive(true))

    }
    if (this.active && this.vnode && typeof (this.vnode.elm as any).focus === "function") {
      (this.vnode.elm as HTMLElement).focus()
    }
    return this
  }
  public getParent(key: number): Navigatable | undefined {
    if ((key === Codes.LEFT || key === Codes.RIGHT) && this.parent && this.parent.mode === "row") {
      return this.parent
    } else if ((key === Codes.UP || key === Codes.DOWN) && this.parent && this.parent.mode === "column") {
      return this.parent
    } else if (this.parent) {
      return this.parent.getParent(key)
    }
  }
  public next(key: number, loop: boolean = false): Navigatable | undefined {
    let parent = this.getParent(key)
    if (!parent) {
      return loop ? this : undefined
    }
    if (key === Codes.LEFT || key === Codes.RIGHT) {
      let idx = parent.indexOf(this) + (key === Codes.LEFT ? -1 : 1)
      return parent.children[(parent.children.length + idx) % parent.children.length]
    }
    if (key === Codes.UP || key === Codes.DOWN) {
      let idx = parent.indexOf(this) + (key === Codes.UP ? -1 : 1)
      return parent.children[(parent.children.length + idx) % parent.children.length]
    }
  }
  public indexOf(nav: Navigatable): number {
    if (typeof nav === "undefined") { return -1 }
    if (this.children.indexOf(nav) >= 0) {
      return this.children.indexOf(nav)
    } else {
      return this.indexOf(this.children.find(c => c.indexOf(nav) >= 0))
    }
  }
  public getActive(): Navigatable | undefined {
    if (this.active) { return this }
    if (!this.children) { return }
    let found = this.children.find(c => typeof c.getActive() !== "undefined")
    if (found) { return found.getActive() }
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
    if (typeof vnode.data === "object" && vnode.data.tabIndexRoot) {
      return [new Navigatable("column", 0, children)]
    } else {
      return children
    }
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
