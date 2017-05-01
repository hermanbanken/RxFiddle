import { Message } from "../collector/logger"
import TreeReader from "../collector/treeReader"
import TypedGraph from "../collector/typedgraph"
import { EdgeType, IObserverTree, ObservableTree, ObserverTree, SubjectTree } from "../oct/oct"
import { DataSource, Graphs } from "./index"
import * as Rx from "rxjs"

export default class Grapher {

  public static sequence = 0
  public graph: Rx.Observable<Graphs>
  protected treeReader: TreeReader
  protected collector: DataSource

  constructor(collector: DataSource) {
    this.collector = collector
    this.treeReader = new TreeReader()
    this.graph = this.makeGraphObservable()
  }

  protected makeGraphObservable(): Rx.Observable<Graphs> {
    return Rx.Observable.defer(() => this.collector.dataObs
      .scan(grapherNext, this.treeReader)
      .debounceTime(10)
      .startWith(this.treeReader)
      .map(readerToGraph)
    )
      .repeat()
      .do(graphs => {
        if (typeof window === "object") {
          (window as any).graphs = graphs
        }
      })
  }
}

function grapherNext(reader: TreeReader, event: Message): TreeReader {
  reader.next(event)
  return reader
}

function readerToGraph(reader: TreeReader) {
  let graph = reader.treeGrapher.graph

  // Apply filters
  graph = swapSubjectAsObservables(graph)
  graph = contractSubjectObservables(graph)
  graph = stripEndPointSafeSubscribers(graph)

  return ({
    _sequence: Grapher.sequence++,
    events: reader.treeGrapher.events,
    main: graph
      .filterNodes(n => true),
    subscriptions: graph
      .filterNodes((n, l) => !(l instanceof ObservableTree))
      .filterEdges((e, l) => l.type === "addObserverDestination") as TypedGraph<IObserverTree, {}>,
    time: reader.treeGrapher.time,
    toDot: () => dotGraph(graph),
  })
}

function dotGraph(graph: TG) {
  let dot = graph.toDot(
    (n) => ({
      color: n instanceof SubjectTree ? "purple" : (n instanceof ObserverTree ? "red" : "blue"),
      label: (n && n.names.join("\n") || n && n.id)
      + (n instanceof ObserverTree ? `(${n.events.length})` : "")
      // + "\\n" + (n instanceof ObservableTree && n.calls ? n.calls.map(_ => _.method).join(",") : "")
      ,
    }),
    e => Object.assign(e, { minlen: (e as any).label === "source" ? 1 : 1 }),
    undefined, // n => n instanceof ObserverTree ? "red" : "blue",
    () => ["rankdir=TB"]
  )
  if (typeof window !== "undefined") {
    window.open("graphviz.html#" + btoa(dot))
  }
  return dot
}

export type TG = TypedGraph<ObserverTree | ObservableTree, { type: EdgeType }>

/**
 * Filter: remove SafeSubscriber wrappers that RxJS 5 adds around subscribes with lambdas,
 * preventing duplicate subscribers at end of flow
 */
function stripEndPointSafeSubscribers(graph: TG): TG {
  return graph.filterNodes(n => {
    let es = graph.nodeEdges(n)
    // Detect single incoming destination edge
    if (es.length === 1 && es[0].w === n && graph.edge(es[0]).type === "addObserverDestination") {
      return false
    }
    return true
  })
}

/**
 * Filter: replace AnonymousSubject's that actually are observables
 */
function swapSubjectAsObservables(graph: TG): TG {
  return graph.flatMap(
    (id, label) => label instanceof SubjectTree && graph.nodeEdges(id).every(e => isObservableEdge(graph.edge(e))) ?
      [{ id, label: asObservableTree(label) }] :
      [{ id, label }],
    (id, label) => [{ id, label }]
  )
}

/**
 * Filter: connect Subject
 */
function contractSubjectObservables(graph: TG): TG {
  return graph.nodes()
    .filter(n => graph.node(n) instanceof SubjectTree)
    // .filter(n => graph.nodeEdges(n).every(e => graph.edge(e).type === "addObserverDestination"))
    .map(n => graph.inEdges(n))
    .filter(es => es && es.length > 0)
    .map(es => es && es.find(e => graph.edge(e).type === "addObserverDestination") || es[0])
    .reduce((prev, edge) => prev.contractEdge(edge, e => graph.edge(e).type === "addObserverDestination"), graph)
}

function isObservableEdge(edge: { type: EdgeType }) {
  return edge.type === "addSource" || edge.type === "setObserverSource"
}

function asObservableTree(subjectTree: SubjectTree): ObservableTree {
  let tree = new ObservableTree(subjectTree.id)
  tree.names = subjectTree.names
  tree.sources = subjectTree.sources
  tree.scheduler = subjectTree.scheduler
  tree.calls = (subjectTree as ObservableTree).calls
  return tree
}
