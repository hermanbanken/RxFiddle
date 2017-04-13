import { Message } from "../collector/logger"
import { TreeReader } from "../collector/treeReader"
import { TreeReaderAdvanced } from "../collector/treeReaderAdvanced"
import TypedGraph from "../collector/typedgraph"
import { IObserverTree, ObservableTree } from "../oct/oct"
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
      .map(reader => ({
        _sequence: Grapher.sequence++,
        events: reader.treeGrapher.events,
        main: reader.treeGrapher.graph
          .filterNodes(n => true),
        subscriptions: reader.treeGrapher.graph
          .filterNodes((n, l) => !(l instanceof ObservableTree)) as TypedGraph<IObserverTree, {}>,
        time: reader.treeGrapher.time,
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
