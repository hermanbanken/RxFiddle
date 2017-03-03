import { Edge as EdgeLabel, EventLabel, Message, NodeLabel } from "../collector/logger"
import { TreeCollector, TreeReader, TreeWriter } from "../collector/treeCollector"
import TypedGraph from "../collector/typedgraph"
import { IObservableTree, IObserverTree, ObservableTree, ObserverTree, SubjectTree } from "../oct/oct"
import "../object/extensions"
import "../utils"
import layoutf from "./layout"
import MorphModule from "./morph"
import { graph, graph$ } from "./render"
import * as Rx from "rx"
import { init as snabbdom_init } from "snabbdom"
import attrs_module from "snabbdom/modules/attributes"
import class_module from "snabbdom/modules/class"
import event_module from "snabbdom/modules/eventlisteners"
import style_module from "snabbdom/modules/style"
import { VNode } from "snabbdom/vnode"

const patch = snabbdom_init([class_module, attrs_module, style_module, event_module, MorphModule])

export interface DataSource {
  dataObs: Rx.Observable<Message>
}

export type ViewState = {
  focusNodes: string[]
  openGroups: string[]
  openGroupsAll: boolean
}

export type GraphNode = {
  name: string
  labels: NodeLabel[]
}
export type GraphEdge = {
  labels: EdgeLabel[]
}

export type Graphs = {
  _sequence: number,
  main: TypedGraph<IObservableTree | IObserverTree, {}>,
  subscriptions: TypedGraph<IObserverTree, {}>,
}

export class Grapher {

  public graph: Rx.Observable<Graphs>

  constructor(collector: DataSource) {
    let sequence = 0
    this.graph = Rx.Observable.defer(() => collector.dataObs
      .scan(grapherNext, new TreeReader()).map(reader => ({
        _sequence: sequence++,
        main: reader.treeGrapher.graph,
        subscriptions: reader.treeGrapher.graph
          .filterNodes((n, l) => !(l instanceof ObservableTree)) as TypedGraph<IObserverTree, {}>,
      }))
    ).repeat()
  }
}

export function grapherNext(reader: TreeReader, event: Message): TreeReader {
  reader.next(event)
  return reader
}

function isIObserver(a: any): a is IObserverTree {
  return a && "observable" in a
}

function distance(a: IObservableTree | IObserverTree, b: IObservableTree | IObserverTree): number | undefined {
  if (isIObserver(a) && isIObserver(b)) {
    return a.observable.id === b.observable.id ? 0.21 : 1
  }
  return undefined
}

export default class Visualizer {

  // TODO workaround for Rx.Subject's
  public focusNodes = new Rx.Subject<string[]>()
  public openGroups = new Rx.Subject<string[]>()

  public DOM: Rx.Observable<VNode>
  public get viewState(): Rx.Observable<ViewState> {
    return this.focusNodes.startWith([]).combineLatest(this.openGroups.startWith([]), (fn, og) => ({
      focusNodes: fn,
      openGroups: og,
      openGroupsAll: false,
    }))
  }

  private clicks: Rx.Observable<string[]>
  private groupClicks: Rx.Observable<string>
  private grapher: Grapher
  private app: HTMLElement | VNode

  constructor(grapher: Grapher, dom?: HTMLElement, controls?: HTMLElement) {
    this.grapher = grapher
    this.app = dom

    let inp = grapher.graph
      .debounce(10)
      .combineLatest(this.viewState, (graphs, state) => {
        let filtered = this.filter(graphs, state)
        return ({
          _sequence: graphs._sequence,
          graphs: filtered,
          layout: layoutf(
            filtered.subscriptions,
            state.focusNodes,
            (a, b) => distance(graphs.main.node(a), graphs.main.node(b))
          ),
          viewState: state,
        })
      })
    let { svg, clicks, groupClicks } = graph$(inp)

    this.DOM = svg
    this.clicks = clicks
    this.groupClicks = groupClicks
  }

  public run() {
    this.DOM
      .subscribe(d => {
        let old = this.app
        try {
          checkChildrenDefined(d, "new")
          this.app = patch(this.app, d)
        } catch (e) {
          (window as any).vnode = d
          console.warn("Snabbdom patch error. VNode available in window.vnode.", e, d)
          if (e.message.indexOf("of undefined") >= 0) {
            if (!(old instanceof HTMLElement)) {
              checkChildrenDefined(old, "old")
            }
            checkChildrenDefined(d)
          }
        }
      })
    this.clicks
      .scan((prev, n) => prev.length === n.length && prev.every((p, i) => p === n[i]) ? [] : n, [])
      .startWith([])
      .subscribe(this.focusNodes)
    this.groupClicks
      .scan((list, n) => list.indexOf(n) >= 0 ? list.filter(i => i !== n) : list.concat([n]), [])
      .startWith([])
      .subscribe(this.openGroups)
  }

  public attach(node: HTMLElement) {
    this.app = node
    this.step()
  }

  public step() {
    this.run()
  }

  private filter(graphs: Graphs, viewState: ViewState): Graphs {
    return {
      _sequence: graphs._sequence,
      main: graphs.main,
      subscriptions: graphs.subscriptions,
    }
  }
}

function checkChildrenDefined(node: VNode | string, parents: string = "", ...info: any[]): void {
  if (typeof node === "string") {
    return
  }
  if (typeof node === "undefined") {
    console.warn("Undefined VNode child found at ", parents, ...info)
  } else if (typeof node === "object" && "children" in node && Array.isArray(node.children)) {
    node.children.forEach((c, i) => checkChildrenDefined(c, parents + "/" + node.sel + "[" + i + "]",
      node.elm && (node.elm as HTMLElement).childNodes[i], node))
  } else {
    // console.warn("Uknown vnode", node, parents)
  }
}