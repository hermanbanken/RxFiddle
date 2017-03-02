import { Edge as EdgeLabel, EventLabel, Message, NodeLabel } from "../collector/logger"
import TypedGraph from "../collector/typedgraph"
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
  full: TypedGraph<GraphNode, GraphEdge>,
  main: TypedGraph<GraphNode, GraphEdge>,
  subscriptions: TypedGraph<number, undefined>,
}

export class Grapher {

  public graph: Rx.Observable<Graphs>

  constructor(collector: DataSource) {
    // this.viewState = viewState.startWith(emptyViewState)
    this.graph = collector.dataObs
      .scan(grapherNext, {
        full: new TypedGraph<GraphNode, GraphEdge>(),
        main: new TypedGraph<GraphNode, GraphEdge>(),
        subscriptions: new TypedGraph<number, undefined>(),
      })
    // .combineLatest(this.viewState, this.filter)
  }
}

function setEdge<V, E>(
  v: string | number, w: string | number,
  graph: TypedGraph<V, E>,
  nodeCreate: () => V, value?: E
) {
  v = `${v}`
  w = `${w}`
  if (!graph.hasNode(v)) {
    graph.setNode(v, nodeCreate())
  }
  if (!graph.hasNode(w)) {
    graph.setNode(w, nodeCreate())
  }
  graph.setEdge(v, w, value)
}

export function grapherNext(graphs: Graphs, event: Message) {
  let { main, subscriptions } = graphs
  switch (event.type) {

    case "node": main.setNode(`${event.id}`, {
      labels: [],
      name: event.node.name,
    })
      break

    case "edge":
      let e: GraphEdge = main.edge(`${event.edge.v}`, `${event.edge.w}`) || {
        labels: [],
      }
      e.labels.push(event)

      let edgeLabel = event.edge.label
      if (edgeLabel.type === "subscription sink") {
        setEdge(edgeLabel.v, edgeLabel.w, subscriptions, () => ({}))
        setEdge(edgeLabel.v, edgeLabel.w, main, () => ({}))
      }

      setEdge(event.edge.v, event.edge.w, main, () => ({}), e)
      break

    case "label":
      let node = main.node(`${event.node}`) || "subscription" in event.label && main.node(`${(event.label as EventLabel).subscription}`)
      if (node && node.labels) { node.labels.push(event) }
      let label = event.label
      if (label.type === "subscription") {
        subscriptions.setNode(label.id.toString(10), event.node)
      }
      break

    default: break
  }

  ; (window as any).graph = graph

  return { full: main.filterNodes(() => true), main, subscriptions }
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

  private clicks: Rx.Observable<string>
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
          graphs: filtered,
          layout: layoutf(filtered.main, state.focusNodes),
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
      .subscribe(d => this.app = patch(this.app, d))
    this.clicks
      .scan((list, n) => list.indexOf(n) >= 0 ? list.filter(i => i !== n) : list.concat([n]), [])
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
      full: graphs.full,
      main: graphs.main.filterNodes((id, node: GraphNode) => {
        // if (id) { return true } // TODO remove dummy
        let annotations = (node ? node.labels || [] : [])
          .filter(ann => ann.label.type === "observable")
        if (annotations.length === 0) {
          return false
        }
        return annotations
          .some(ann => !ann.groups.length || ann.groups.slice(-1).some(g => viewState.openGroups.indexOf(`${g}`) >= 0))
        // let groups = node.labels.flatMap(l => l.groups && l.groups.slice(-1) || [])
        // if (groups && groups.length > 0) {
        //   console.log("groups", groups, "testing", groups.slice(-1)
        //     .find(g => viewState.openGroups.indexOf(`${g}`) >= 0))
        // }
        // return viewState.openGroupsAll ||
        //   !groups ||
        //   groups.length === 0 ||
        //   (groups.find(g => viewState.openGroups.indexOf(`${g}`) >= 0) && true)
      }).filterEdges((ids, edge) => {
        // if (ids) { return true } // TODO remove dummy
        return edge && edge.labels
          .filter(ann => ann.edge.label.type === "observable link")
          .some(ann => (
            !ann.group ||
            viewState.openGroups.indexOf(`${ann.group}`) === -1
          ) && (
              !ann.groups ||
              !ann.groups.length ||
              ann.groups.slice(-1).some(g => viewState.openGroups.indexOf(`${g}`) >= 0)
            )
          )
      }),
      subscriptions: graphs.subscriptions,
    }
  }
}
