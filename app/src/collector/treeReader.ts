import {
  EdgeType, ITreeLogger,
  NodeType, ObservableTree, ObserverTree, SubjectTree,
} from "../oct/oct"
import TypedGraph from "./typedgraph"

export class TreeReader {
  public treeGrapher: TreeGrapher = new TreeGrapher()
  public maxTick = -1
  public next(message: any): void {
    if (message === "reset") {
      this.maxTick = -1
      return this.treeGrapher.reset()
    }
    if (typeof message === "object" && typeof message.tick === "number") {
      this.maxTick = Math.max(this.maxTick, message.tick)
    }
    if (typeof message.v !== "undefined" && typeof message.w !== "undefined") {
      this.treeGrapher.addEdge(message.v, message.w, message.type, message.meta)
    } else if (typeof message.type !== "undefined") {
      this.treeGrapher.addNode(message.id, message.type, message.tick)
    } else if (message) {
      this.treeGrapher.addMeta(message.id, message.meta)
    }
  }
}

export class TreeWriter implements ITreeLogger {
  public messages: any[] = []
  public addNode(id: string, type: NodeType, tick?: number): void {
    this.messages.push({ id, type, tick })
  }
  public addMeta(id: string, meta: any, tick?: number): void {
    this.messages.push({ id, meta, tick })
  }
  public addEdge(v: string, w: string, type: EdgeType, meta?: any): void {
    this.messages.push({ v, w, type, meta })
  }
}

export class TreeGrapher implements ITreeLogger {
  public graph = new TypedGraph<ObservableTree | ObserverTree, {}>()
  public addNode(id: string, type: NodeType, tick: number): void {
    if (type === "observable") {
      this.graph.setNode(id, new ObservableTree(id, undefined, undefined, tick))
    } else if (type === "subject") {
      this.graph.setNode(id, new SubjectTree(id, undefined, undefined, tick))
    } else {
      this.graph.setNode(id, new ObserverTree(id, undefined, undefined, tick))
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
  public reset() {
    this.graph.nodes().forEach(n => this.graph.removeNode(n))
  }
}
