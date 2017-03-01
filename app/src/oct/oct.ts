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

  graph: TypedGraph<(IObservableTree|IObserverTree),{}>
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

  public inspect(depth: number, opts: any) {
    return `ObservableTree(${this.id}, ${this.name}, ${(this.sources || []).map(s => pad(inspect(s, depth + 2, opts), 2))})`
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

  graph: TypedGraph<(IObservableTree|IObserverTree),{}>
  constructor(id: string, graph: TypedGraph<(IObservableTree|IObserverTree),{}>) {
    this.id = id
    this.graph = graph
    graph.setNode(id, this)
  }

  public setSink(sinks: IObserverTree[], name?: string) {
    if(this.sink === sinks[0]) {
      return this
    }
    this.sink = sinks[0]
    sinks.forEach(s => s.addInflow(this))
    sinks.forEach(s => this.graph.setEdge(this.id, s.id, { label: 'sink' + name }))
    return this
  }
  public addInflow(inflow: IObserverTree) {
    this.inflow = this.inflow || []
    if(this.inflow.indexOf(inflow) >= 0) {
      return this
    }
    this.inflow.push(inflow)
    this.graph.setEdge(inflow.id, this.id, {})
    return this
  }
  public setObservable(observable: IObservableTree[]): IObserverTree {
    if(this.observable) {
      if(this.observable !== observable[0]) {
        console.log("Adding second observable to ", this, "being", observable[0])
      }
      return this
    }
    this.observable = observable[0]
    observable.forEach(o => this.graph.setEdge(o.id, this.id, { label: 'observable' }))
    return this
  }

  public inspect(depth: number, opts: any) {
    if(this.sink) {
      return `ObserverTree(${this.id}, ${this.name}, \n${pad(inspect(this.sink, depth + 1, opts), 1)}\n)`
    } else {
      return `ObserverTree(${this.id}, ${this.name})`
    }
  }
}

function pad(string: string, depth: number): string {
  if(depth <= 0 || !string) {
    return string
  }
  return pad(string.split("\n").map(l => "  " + l).join("\n"), depth - 1)
}

function inspect(i: any, depth: number, opts: any): string {
  if(i && i.inspect) {
    return i.inspect(depth, opts)
  } else if(i && i.toString) {
    return i.toString()
  } else {
    return i
  }
}

function addInflow(this: IObserverTree & { sgraph?: TypedGraph<IObservableTree|IObserverTree,{}> }, inflow: IObserverTree): IObserverTree {
  this.inflow = this.inflow || []
  this.inflow.push(inflow)
  if(this.sgraph) this.sgraph.setEdge(inflow.id, this.id, {})
  return this
}

export class SubjectTree implements ObservableTree, ObserverTree {
  public id: Id
  public name: string
  public args: IArguments
  public inflow?: IObserverTree[]
  public sources?: IObservableTree[]
  public observable: IObservableTree
  public sink?: IObserverTree
  public sinks?: IObserverTree[]
  public events: IEvent[] = []

  constructor(id: string, graph: TypedGraph<(IObservableTree|IObserverTree),{}>) {
    this.id = id
    this.graph = graph
    graph.setNode(id, this)
  }

  public addSink(sinks: IObserverTree[], name?: string) {
    let prev = this.sinks || []
    this.setSink(sinks, name)
    this.sinks = prev.concat(sinks)
    return this
  }

  // Mixin Observable & Observer methods
  setSink: (sinks: IObserverTree[], name?: string) => this;
  addInflow: (inflow: IObserverTree) => this;
  setObservable: (observable: IObservableTree[]) => IObserverTree;
  setSources: (sources: IObservableTree[]) => IObservableTree;
  graph: TypedGraph<(IObservableTree|IObserverTree),{}>

  public inspect(depth: number, opts: any) {
    return `SubjectTree(${this.id}, ${this.name}, \n${pad(inspect(this.sink, depth + 2, opts), 2)}\n)`
  }
}

applyMixins(SubjectTree, [ObservableTree, ObserverTree]);

function applyMixins(derivedCtor: any, baseCtors: any[]) {
  baseCtors.forEach(baseCtor => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
      // Only mix non-defined's, causing implemented methods to act as overloads. 
      // Allows mixin to have a specialized constructor for example.
      if(typeof derivedCtor.prototype[name] === "undefined") {
        derivedCtor.prototype[name] = baseCtor.prototype[name];
      }
    });
  });
}
