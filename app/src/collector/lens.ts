import {
  Complete,
  Error,
  IEvent,
  Next,
} from "./event"
import Collector, {
  AddEvent, AddObservable, AddSubscription,
} from "./logger"

export interface ISubscriptionLens<T> {
  events(): IEvent[]
  nexts(): Next<T>[]
  completes(): Complete[]
  errors(): Error[]
  all(): AddSubscription[]
  scoping(): ISubscriptionLens<T>
}

export interface IObservableLens<T> {
  all(): AddObservable[]
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

function subsLens<T>(collector: Collector, subs: () => AddSubscription[]): ISubscriptionLens<T> {
  let events = () => {
    let subsIds = subs().map(s => s.id)
    return subsIds
      .map(subId => collector.indices.subscriptions[subId].events)
      .map(eventIds => eventIds.map(eid => collector.data[eid] as AddEvent))
      .reduce((list, next) => list.concat(next), [])
      .map(e => e.event)
  }

  let scoping = () => {
    return subs().map(s => s.id)
      .map(subId => collector.indices.subscriptions[subId].scoping)
      .reduce((list, ls) => list.concat(ls), [])
      .map(subId => collector.data[subId]) as AddSubscription[]
  }

  return {
    all: () => subs(),
    completes: () => events().filter(e => e.type === "complete"),
    errors: () => events().filter(e => e.type === "error") as Error[],
    events,
    nexts: () => events().filter(e => e.type === "next") as Next<T>[],
    scoping: () => subsLens(collector, scoping),
  } as ISubscriptionLens<T>
}

function obsLens<T>(collector: Collector, get: () => AddObservable[]): IObservableLens<T> {
  let subs = () => {
    let obsIds = get().map(o => (<AddObservable>o).id)
    return obsIds
      .map(id => collector.indices.observables[id].subscriptions)
      .map(subIds => subIds.map(subId => collector.data[subId] as AddSubscription))
      .reduce((list, next) => list.concat(next), [])
  }

  return {
    all: () => get(),
    childs: () => {
      let query = () => get()
        .map(_ => collector.indices.observables[_.id].childs)
        .reduce((list, _) => list.concat(_), [])
        .map(i => collector.data[i] as AddObservable)
        .filter(_ => typeof _.callParent === "undefined")
      return obsLens<T>(collector, query)
    },
    each: () => get().map(obs => obsLens(collector, () => [obs])),
    internals: () => {
      let query = () => {
        let ids = get().map(o => o.id)
        return collector.data
          .filter(o =>
            o instanceof AddObservable &&
            typeof o.callParent === "number" &&
            ids.indexOf(o.callParent) >= 0
          ) as AddObservable[]
      }
      return obsLens<T>(collector, query)
    },
    subscriptions: () => subsLens(collector, subs),
  } as IObservableLens<T>
}

export function lens<T>(collector: Collector): ILens<T> {
  return {
    all: () => {
      let obs = () => collector.data
        .filter(e => e instanceof AddObservable) as AddObservable[]
      return obsLens<T>(collector, obs)
    },
    find: (selector: string | number) => {
      let obs = () => typeof selector === "number" ?
        [collector.data[selector] as AddObservable] :
        collector.data.filter(e =>
          e instanceof AddObservable &&
          (e.method === selector)
        ) as AddObservable[]

      return obsLens<T>(collector, obs)
    },
    roots: () => {
      let obs = () => collector.data
        .filter(e => e instanceof AddObservable && e.parents.length === 0) as AddObservable[]
      return obsLens<T>(collector, obs)
    }
  }
}
