import { Edge as EdgeLabel, Message, NodeLabel } from "../collector/logger"
import TypedGraph from "../collector/typedgraph"
import "../object/extensions"
import { IObservableTree, IObserverTree, ObserverTree } from "../oct/oct"
import "../utils"
import Grapher from "./grapher"
import layoutf from "./layout"
import MorphModule from "./morph"
import { graph$ } from "./render"
import TabIndexModule from "./tabIndexQuickDirty"
import * as Rx from "rx"
import { init as snabbdom_init } from "snabbdom"
import attrs_module from "snabbdom/modules/attributes"
import class_module from "snabbdom/modules/class"
import event_module from "snabbdom/modules/eventlisteners"
import style_module from "snabbdom/modules/style"
import { VNode } from "snabbdom/vnode"

const patch = snabbdom_init([class_module, attrs_module, style_module, event_module, MorphModule, TabIndexModule])

export interface DataSource {
  dataObs: Rx.Observable<Message>
}

export type ViewState = {
  focusNodes: string[]
  openGroups: string[]
  openGroupsAll: boolean
  tick?: number
}

export type GraphNode = {
  name: string
  labels: NodeLabel[]
}
export type GraphEdge = {
  labels: EdgeLabel[]
}

export type Graphs = {
  maxTick: number,
  _sequence: number,
  main: TypedGraph<IObservableTree | IObserverTree, {}>,
  subscriptions: TypedGraph<IObserverTree, {}>,
}

export function isIObserver(a: any): a is IObserverTree {
  return a && "observable" in a
}

function distance(a: IObservableTree | IObserverTree, b: IObservableTree | IObserverTree): number | undefined {
  if (isIObserver(a) && isIObserver(b)) {
    return a.observable.id === b.observable.id ? 0.21 : 1
  }
  return undefined
}

function blueprintObserver(tree: IObservableTree, sink?: IObserverTree): IObserverTree[] {
  let subs: IObserverTree[] = []
  let sub = new ObserverTree(tree.id + "-blueprint")
  subs.push(sub)
  sub.setObservable([tree])
  if (sink) {
    sub.setSink([sink])
  }

  if (tree.sources && tree.sources.length) {
    tree.sources.forEach(source => {
      subs.push(...blueprintObserver(source, sub))
    })
  }

  return subs
}

function addBlueprints(
  subscriptions: TypedGraph<IObserverTree, {}>,
  full: TypedGraph<IObserverTree | IObservableTree, {}>
): TypedGraph<IObserverTree, {}> {
  try {
    let endpoints = full.sinks().map(n => full.node(n)).filter(n => !isIObserver(n)) as Array<IObservableTree>
    let observers = endpoints.flatMap(observable => blueprintObserver(observable))
    let copy = subscriptions.filterNodes(_ => true)
    observers.forEach(s => copy.setNode(s.id, s))
    observers.forEach(s => s.sink && copy.setEdge(s.id, s.sink.id))
    return copy
  } catch (e) {
    console.warn("Failed adding blueprints :(", e)
    return subscriptions
  }
}

function getObservableId(input: IObservableTree | IObserverTree, node: string): string {
  if (isIObserver(input) && input.observable) {
    return input.observable.id
  } else if (input && input.id) {
    return input.id
  } else {
    console.warn("getObservableId for undefined node", node, input, new Error())
    return ""
  }
}

export default class Visualizer {

  // TODO workaround for Rx.Subject's
  public focusNodes = new Rx.Subject<string[]>()
  public openGroups = new Rx.Subject<string[]>()
  public tick = new Rx.Subject<number>()

  public timeSlider: Rx.Observable<VNode>
  public DOM: Rx.Observable<VNode>
  public get viewState(): Rx.Observable<ViewState> {
    return this.focusNodes.startWith([]).combineLatest(
      this.openGroups.startWith([]),
      this.tick.startWith(undefined),
      (fn, og, t) => ({
        focusNodes: fn,
        openGroups: og,
        openGroupsAll: false,
        tick: t,
      })
    )
  }

  private clicks: Rx.Observable<string[]>
  private groupClicks: Rx.Observable<string>
  private tickSelection: Rx.Observable<number>
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
            (a, b) => distance(graphs.main.node(a), graphs.main.node(b)),
            node => getObservableId(filtered.main.node(node) || filtered.subscriptions.node(node), node)
          ),
          viewState: state,
        })
      })
    let { svg, clicks, groupClicks, tickSelection, timeSlider } = graph$(inp)

    this.timeSlider = timeSlider
    this.DOM = svg
    this.clicks = clicks
    this.groupClicks = groupClicks
    this.tickSelection = tickSelection
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
    this.tickSelection
      .subscribe(this.tick)
  }

  public stream(): Rx.Observable<{ dom: VNode, timeSlider: VNode }> {
    return Rx.Observable.defer(() => Rx.Observable.create<{ dom: VNode, timeSlider: VNode }>(subscriber => {
      let disposables = [] as Rx.Disposable[]
      disposables.push(this.DOM
        .combineLatest(this.timeSlider, (d, t) => ({ dom: d, timeSlider: t }))
        .subscribe(subscriber))
      disposables.push(this.clicks
        .scan((prev, n) => prev.length === n.length && prev.every((p, i) => p === n[i]) ? [] : n, [])
        .startWith([])
        .subscribe(this.focusNodes))
      disposables.push(this.groupClicks
        .scan((list, n) => list.indexOf(n) >= 0 ? list.filter(i => i !== n) : list.concat([n]), [])
        .startWith([])
        .subscribe(this.openGroups))
      disposables.push(this.tickSelection
        .subscribe(this.tick))
      return new Rx.Disposable(() => {
        disposables.forEach(d => d.dispose())
      })
    }))
  }

  public attach(node: HTMLElement) {
    this.app = node
    this.step()
  }

  public step() {
    this.run()
  }

  private filter(graphs: Graphs, viewState: ViewState): Graphs {
    let scope = window as any || {}
    scope.filterGraphs = graphs
    let subs = addBlueprints(graphs.subscriptions, graphs.main)
    if (typeof viewState.tick === "number") {
      console.log("filtering with tick", viewState.tick)
      return {
        _sequence: graphs._sequence,
        main: graphs.main.filterNodes((n, o) => o.tick <= viewState.tick),
        maxTick: graphs.maxTick,
        subscriptions: graphs.subscriptions.filterNodes((n, o) => o.tick <= viewState.tick), // subs
      }
    } else {
      return {
        _sequence: graphs._sequence,
        main: graphs.main,
        maxTick: graphs.maxTick,
        subscriptions: graphs.subscriptions, // subs
      }
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
