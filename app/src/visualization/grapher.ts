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
  graph = expandSubjects(graph)
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

export class GrapherAdvanced extends Grapher {
  constructor(collector: DataSource) {
    super(collector)
    this.treeReader = new TreeReader()
    this.graph = this.makeGraphObservable()
  }
}
