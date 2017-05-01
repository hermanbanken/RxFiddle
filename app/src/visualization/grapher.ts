import { Message } from "../collector/logger"
import TreeReader from "../collector/treeReader"
import TypedGraph from "../collector/typedgraph"
import { EdgeType, IObserverTree, ObservableTree, ObserverTree, SubjectTree } from "../oct/oct"
import { DataSource, Graphs } from "./index"
import * as Rx from "rx"

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
      .debounce(10)
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
