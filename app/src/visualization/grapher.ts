import { Message } from "../collector/logger"
import { TreeReader } from "../collector/treeReader"
import { TreeReaderAdvanced } from "../collector/treeReaderAdvanced"
import TypedGraph from "../collector/typedgraph"
import { IObserverTree, ObservableTree } from "../oct/oct"
import { DataSource, Graphs } from "./index"

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
      .scan(grapherNext, this.treeReader).map(reader => ({
        _sequence: Grapher.sequence++,
        main: reader.treeGrapher.graph
          .filterNodes(n => true),
        maxTick: reader.maxTick,
        subscriptions: reader.treeGrapher.graph
          .filterNodes((n, l) => !(l instanceof ObservableTree)) as TypedGraph<IObserverTree, {}>,
      }))
    ).repeat()
  }
}

function grapherNext(reader: TreeReader, event: Message): TreeReader {
  reader.next(event)
  return reader
}

export class GrapherAdvanced extends Grapher {
  constructor(collector: DataSource) {
    super(collector)
    this.treeReader = new TreeReaderAdvanced()
    this.graph = this.makeGraphObservable()
  }
}
