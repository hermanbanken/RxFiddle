import {
  EdgeType, ISchedulerInfo, ITreeLogger,
  NodeType, ObservableTree, ObserverTree, SubjectTree,
} from "../oct/oct"
import { elvis } from "./collector"
import { IEvent } from "./event"
import TimeComposer from "./timeComposer"
import TypedGraph from "./typedgraph"

export class TreeReader {
  public treeGrapher: TreeGrapher = new TreeGrapher()
  public maxTick = -1
  public next(message: any): void {
    if (message === null) { return }
    if (message === "reset") {
      return this.treeGrapher.reset()
    }

    elvis(message, ["meta", "events"]).forEach(event => {
      this.treeGrapher.events.push(event)
      this.treeGrapher.time.reduce(event)
    })

    if (typeof message.v !== "undefined" && typeof message.w !== "undefined") {
      this.treeGrapher.addEdge(message.v, message.w, message.type, message.meta)
    } else if (typeof message.type !== "undefined") {
      this.treeGrapher.addNode(message.id, message.type, message.scheduler)
    } else if (message && message.meta) {
      this.treeGrapher.addMeta(message.id, message.meta)
    } else if (typeof message.scheduler !== "undefined") {
      this.treeGrapher.time.schedulers.push(message.scheduler)
    }
  }
}

export default TreeReader

export class TreeGrapher implements ITreeLogger {
  public graph = new TypedGraph<ObservableTree | ObserverTree, { type: EdgeType }>()
  public events: IEvent[] = []
  public time: TimeComposer = new TimeComposer()
  public contractions: { id: string, contract: string[] }[] = []
  public addNode(id: string, type: NodeType, scheduler: ISchedulerInfo): void {
    if (type === "observable") {
      this.graph.setNode(id, new ObservableTree(id, undefined, undefined, scheduler))
    } else if (type === "subject") {
      this.graph.setNode(id, new SubjectTree(id, undefined, undefined, scheduler))
    } else if (type === "observer") {
      this.graph.setNode(id, new ObserverTree(id, undefined, undefined))
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
    } else if (type === "addObserverDestination") {
      let src = this.graph.node(v) as ObserverTree
      src.setSink([this.graph.node(w) as ObserverTree])
    } else if (type === "addObserverOuter") {
      let src = this.graph.node(v) as ObserverTree
      src.setOuter(this.graph.node(w) as ObserverTree)
    } else if (type === "setObserverSource") {
      let src = this.graph.node(v) as ObservableTree
      let dst = this.graph.node(w) as ObserverTree
      dst.setObservable([src])
    }
    this.graph.setEdge(v, w, Object.assign({ type }, meta))
  }
  public addScheduler(id: string, scheduler: ISchedulerInfo): void {
    this.time.schedulers.push(scheduler)
  }
  public addContraction(id: string, nodes: string[]): void {
    this.contractions.push({ id, contract: nodes })
  }
  public reset() {
    this.graph.nodes().forEach(n => this.graph.removeNode(n))
    this.time = new TimeComposer()
  }
}
