import MorphModule from "./visualization/morph"
import TabIndexModule from "./visualization/tabIndexQuickDirty"
import { init as snabbdom_init } from "snabbdom"
import attrs_module from "snabbdom/modules/attributes"
import class_module from "snabbdom/modules/class"
import event_module from "snabbdom/modules/eventlisteners"
import style_module from "snabbdom/modules/style"
import { VNode } from "snabbdom/vnode"

const patch: (oldElement: Element | VNode, newElement: VNode) => VNode =
  snabbdom_init([
    class_module,
    attrs_module,
    style_module,
    event_module,
    MorphModule,
    TabIndexModule,
  ])

export default patch
