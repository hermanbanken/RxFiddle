import { GraphEdge, GraphNode } from "../visualization"
import {
  Complete,
  Error,
  IEvent,
  Next,
} from "./event"
import Collector, {
  AddObservable, AddSubscription,
} from "./logger"
import TypedGraph from "../collector/typedgraph"

export interface Observable {
  id: string
  labels: {
    name: string
    method: string
    args: string
  }[]
}

export interface Subscription {
  events: IEvent[]
}

export interface ISubscriptionLens<T> {
  events(): IEvent[]
  nexts(): Next<T>[]
  completes(): Complete[]
  errors(): Error[]
  all(): Subscription[]
  scoping(): ISubscriptionLens<T>
}

export interface IObservableLens<T> {
  all(): Observable[]
  childs(): IObservableLens<T>
  each(): IObservableLens<T>[]
  internals(): IObservableLens<T>
  subscriptions(): ISubscriptionLens<T>
}

export interface ILens<T> {
  all(): IObservableLens<T>
  roots(): IObservableLens<T>
  find(selector: string | number): IObservableLens<T>
}

// function subsLens<T>(collector: Collector, subs: () => AddSubscription[]): ISubscriptionLens<T> {
//   let events = () => {
//     let subsIds = subs().map(s => s && s.id).filter(v => typeof v !== "undefined")
//     return subsIds
//       .map(subId => collector.indices.subscriptions[subId].events)
//       .map(eventIds => eventIds.map(eid => collector.getEvent(eid)))
//       .reduce((list, next) => list.concat(next), [])
//       .map(e => e.event)
//   }

//   let scoping = () => {
//     return subs().map(s => s.id)
//       .map(subId => collector.indices.subscriptions[subId].scoping)
//       .reduce((list, ls) => list.concat(ls), [])
//       .map(subId => collector.getSubscription(subId))
//   }

//   return {
//     all: () => subs(),
//     completes: () => events().filter(e => e.type === "complete"),
//     errors: () => events().filter(e => e.type === "error") as Error[],
//     events,
//     nexts: () => events().filter(e => e.type === "next") as Next<T>[],
//     scoping: () => subsLens(collector, scoping),
//   } as ISubscriptionLens<T>
// }

// function obsLens<T>(collector: Collector, get: () => AddObservable[]): IObservableLens<T> {
//   let subs = () => {
//     let obsIds = get().map(o => (<AddObservable>o).id)
//     return obsIds
//       .map(id => collector.indices.observables[id].subscriptions)
//       .map(subIds => subIds.map(subId => collector.getSubscription(subId)))
//       .reduce((list, next) => list.concat(next), [])
//   }

//   return {
//     all: () => get(),
//     childs: () => {
//       let query = () => get()
//         .map(_ => collector.indices.observables[_.id].childs)
//         .reduce((list, _) => list.concat(_), [])
//         .map(i => collector.getObservable(i))
//         .filter(_ => typeof _.callParent === "undefined")
//       return obsLens<T>(collector, query)
//     },
//     each: () => get().map(obs => obsLens(collector, () => [obs])),
//     internals: () => {
//       let query = () => {
//         let ids = get().map(o => o.id)
//         return collector.data
//           .filter(o =>
//             o instanceof AddObservable &&
//             typeof o.callParent === "number" &&
//             ids.indexOf(o.callParent) >= 0
//           ) as AddObservable[]
//       }
//       return obsLens<T>(collector, query)
//     },
//     subscriptions: () => subsLens(collector, subs),
//   } as IObservableLens<T>
// }

// export function lens<T>(collector: Collector): ILens<T> {
//   return {
//     all: () => {
//       let obs = () => collector.data
//         .filter(e => e instanceof AddObservable) as AddObservable[]
//       return obsLens<T>(collector, obs)
//     },
//     find: (selector: string | number) => {
//       let obs = () => typeof selector === "number" ?
//         [collector.getObservable(selector)] :
//         collector.data.filter(e =>
//           e instanceof AddObservable &&
//           (e.method === selector)
//         ) as AddObservable[]

//       return obsLens<T>(collector, obs)
//     },
//     roots: () => {
//       let obs = () => collector.data
//         .filter(e => e instanceof AddObservable && e.parents.length === 0) as AddObservable[]
//       return obsLens<T>(collector, obs)
//     }
//   }
// }

export class SubscriptionLens {
  constructor(public lens: Lens) {
    //
  }
}

export class Lens {
  public static sinks() {
    return new Lens([{ type: "sinks" }])
  }

  public static find(selector: string) {
    return new Lens([{ type: "find", selector }])
  }

  constructor(public selectors: LensAction[] = []) {
    //
  }

  public filter(selector: string) {
    return new Lens(this.selectors.concat([{ type: "find", selector }]))
  }

  public subscriptions() {
    return new SubscriptionLens(this)
  }

  public execute(collector: Collector): Observable[] {
    return []
    // let main = this.graphs(collector).main
    // let nodes = this.selectors.reduce((prev, action) => {
    //   switch (action.type) {
    //     case "find":
    //       return prev.filter(n => n.node.labels.some(nl => {
    //         let label = nl.label
    //         return label.type === "observable" ? label.method === action.selector : false
    //       }))
    //     case "up":
    //       return prev.flatMap(n => main.inEdges(n.id).map(e => ({ id: e.v, node: main.node(e.v) })))
    //     case "down":
    //       return prev.flatMap(n => main.outEdges(n.id).map(e => ({ id: e.w, node: main.node(e.w) })))
    //     default: return prev
    //   }
    // }, main.nodes().map(n => ({ id: n, node: main.node(n) })))

    // return nodes.map(n => ({
    //   id: n.id,
    //   labels: n.node.labels.map(nl => nl.label).flatMap(label => label.type === "observable" ? [{
    //     args: label.args + "",
    //     method: label.method,
    //     name: label.method,
    //   }] : []),
    // }))
  }

  protected graphs(collector: Collector) {
    return {}
    // return collector.messages.reduce(grapherNext, {
    //   main: new TypedGraph<GraphNode, GraphEdge>(),
    //   subscriptions: new TypedGraph<number, undefined>(),
    // })
  }
}

function collect<T>(start: T, f: (start: T) => T[]): T[] {
  return f(start).flatMap(n => [n].concat(collect(n, f)))
}

export type LensAction = Find | Up | Down | Sinks

export interface Up {
  type: "up"
}

export interface Down {
  type: "down"
}

export interface Sinks {
  type: "sinks"
}

export interface Find {
  type: "find"
  selector: string
}
