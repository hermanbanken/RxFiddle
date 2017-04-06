import {
  EdgeType, ISchedulerInfo, ITreeLogger,
  NodeType, ObservableTree, ObserverTree, SubjectTree,
} from "../oct/oct"
import { elvis, isDisposable, isObservable, isObserver } from "./collector"
import { Event, IEvent, Timing } from "./event"
import TypedGraph from "./typedgraph"
import * as Rx from "rx"

export class TreeReaderAdvanced {
  public treeGrapher: TreeGrapherAdvanced = new TreeGrapherAdvanced()
  public maxTick = -1
  public next(message: any): void {
    if (message === "reset") {
      this.maxTick = -1
      return this.treeGrapher.reset()
    }
    if (typeof message === "object" && typeof message.timing !== "undefined") {
      this.maxTick = Math.max(this.maxTick, message.timing.tick)
      if (isNaN(this.maxTick)) {
        console.log("Corrupted by ", message)
      }
    }
    if (typeof message.v !== "undefined" && typeof message.w !== "undefined") {
      this.treeGrapher.addEdge(message.v, message.w, message.type, message.meta)
    } else if (typeof message.type !== "undefined") {
      this.treeGrapher.addNode(message.id, message.type, message.timing)
    } else if (message && message.meta) {
      this.treeGrapher.addMeta(message.id, message.meta)
    } else if (typeof message.scheduler !== "undefined") {
      this.treeGrapher.schedulers.push(message.scheduler)
    }
  }
}

export class TreeGrapherAdvanced implements ITreeLogger {
  public graph = new TypedGraph<ObservableTree | ObserverTree, {}>()
  public schedulers: ISchedulerInfo[] = []
  public addNode(id: string, type: NodeType, timing: Timing): void {
    if (type === "observable") {
      this.graph.setNode(id, new ObservableTree(id, undefined, undefined, timing))
    } else if (type === "subject") {
      this.graph.setNode(id, new SubjectTree(id, undefined, undefined, timing))
    } else {
      this.graph.setNode(id, new ObserverTree(id, undefined, undefined, timing))
    }
  }
  public addMeta(id: string, meta: any): void {
    let existing: any = this.graph.node(id) || {}
    for (let key in meta) {
      if (meta.hasOwnProperty(key)) {
        existing[key] = (existing[key] || [])
        existing[key].push(meta[key])
      }
    }
    this.graph.setNode(id, existing)
  }
  public addEdge(v: string, w: string, type: EdgeType, meta?: any): void {
    if (type === "addSource") {
      let dest = this.graph.node(w) as ObservableTree
      let sources = (dest.sources || []).concat([this.graph.node(v) as ObservableTree])
      dest.setSources(sources)
    } else if (type === "addObserverSink") {
      let src = this.graph.node(v) as ObserverTree
      src.setSink([this.graph.node(w) as ObserverTree], meta.label)
    } else if (type === "setObserverSource") {
      let src = this.graph.node(v) as ObservableTree
      let dst = this.graph.node(w) as ObserverTree
      dst.setObservable([src])
    }
    this.graph.setEdge(v, w, meta)
  }
  public addScheduler(id: string, scheduler: ISchedulerInfo): void {
    this.schedulers.push(scheduler)
  }
  public reset() {
    this.graph.nodes().forEach(n => this.graph.removeNode(n))
    this.schedulers = []
  }
}
