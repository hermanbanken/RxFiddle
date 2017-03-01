import { IEvent } from "../collector/event"
import TypedGraph from "../collector/typedgraph"

export type Id = string

export interface IObservableTree {
  id: Id
  name: string
  call?: MethodCall
  sources?: IObservableTree[]
  setSources(sources: IObservableTree[]): IObservableTree
}

export interface MethodCall {
  method: string
  args: IArguments
}

export class ObservableTree implements IObservableTree {
  public id: Id
  public name: string
  public call?: MethodCall
  public sources?: IObservableTree[]

  private graph: TypedGraph<(IObservableTree|IObserverTree),{}>
  constructor(id: string, graph: TypedGraph<(IObservableTree|IObserverTree),{}>) {
    this.id = id
    this.graph = graph
    graph.setNode(id, this)
  }

  public setSources(sources: IObservableTree[]): IObservableTree {
    this.sources = sources
    sources.forEach(s => this.graph.setEdge(s.id, this.id, { label: 'source' }))
    return this
  }
}

export interface IObserverTree {
  id: Id
  name: string
  observable: IObservableTree
  sink?: IObserverTree
  inflow?: IObserverTree[]
  events: IEvent[]
  setSink(sinks: IObserverTree[], name?: string): IObserverTree
  addInflow(inflow: IObserverTree): IObserverTree
  setObservable(observable: IObservableTree[]): IObserverTree
}

export class ObserverTree implements IObserverTree {
  public id: Id
  public name: string
  public observable: IObservableTree
  public sink?: IObserverTree
  public inflow?: IObserverTree[]
  public events: IEvent[] = []

  private graph: TypedGraph<(IObservableTree|IObserverTree),{}>
  constructor(id: string, graph: TypedGraph<(IObservableTree|IObserverTree),{}>) {
    this.id = id
    this.graph = graph
    graph.setNode(id, this)
  }

  public setSink(sinks: IObserverTree[], name?: string) {
    this.sink = sinks[0]
    sinks.forEach(s => s.addInflow(this))
    sinks.forEach(s => this.graph.setEdge(this.id, s.id, { label: 'sink' + name }))
    return this
  }
  public addInflow(inflow: IObserverTree) {
    this.inflow = this.inflow || []
    this.inflow.push(inflow)
    this.graph.setEdge(inflow.id, this.id, {})
    return this
  }
  public setObservable(observable: IObservableTree[]): IObserverTree {
    this.observable = observable[0]
    observable.forEach(o => this.graph.setEdge(o.id, this.id, { label: 'observable' }))
    return this
  }
}

export class SubjectTree implements IObservableTree, IObserverTree {
  public id: Id
  public name: string
  public args: IArguments
  public inflow?: IObserverTree[]
  public sources?: IObservableTree[]
  public observable: IObservableTree
  public sink?: IObserverTree
  public sinks?: IObserverTree[]
  public events: IEvent[] = []

  private graph: TypedGraph<(IObservableTree|IObserverTree),{}>
  constructor(id: string, graph: TypedGraph<(IObservableTree|IObserverTree),{}>) {
    this.id = id
    this.graph = graph
    graph.setNode(id, this)
  }

  public setSink(sinks: IObserverTree[], name?: string) {
    this.addSink(sinks, name)
    return this
  }
  public addSink(sinks: IObserverTree[], name?: string) {
    this.sinks = (this.sinks || []).concat(sinks)
    sinks.forEach(s => this.graph.setEdge(this.id, s.id, { label: 'sink '+name }))
    return this
  }
  public addInflow(inflow: IObserverTree) {
    this.inflow = this.inflow || []
    this.inflow.push(inflow)
    this.graph.setEdge(inflow.id, this.id)
    return this
  }
  public setSources(sources: IObservableTree[]): IObservableTree {
    this.sources = sources
    sources.forEach(o => this.graph.setEdge(o.id, this.id, { label: 'source' }))
    return this
  }
  public setObservable(observable: IObservableTree[]): IObserverTree {
    this.observable = observable[0]
    observable.forEach(o => this.graph.setEdge(o.id, this.id, { label: 'observable' }))
    return this
  }
}
