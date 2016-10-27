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
}

export interface IObservableLens<T> {
  subscriptions(): ISubscriptionLens<T>
  all(): AddObservable[]
}

export interface ILens<T> {
  find(selector: string | number): IObservableLens<T>
}

export function lens<T>(collector: Collector): ILens<T> {
  return {
    find: (selector: string | number) => {
      let obs = () => typeof selector === "number" ?
        [collector.data[selector]] :
        collector.data.filter(e =>
          e instanceof AddObservable &&
          (e.method === selector)
        ) as AddObservable[]

      let subs = () => {
        let obsIds = obs().map(o => (<AddObservable>o).id)
        return obsIds
          .map(id => collector.indices.observables[id].subscriptions)
          .map(subIds => subIds.map(subId => collector.data[subId] as AddSubscription))
          .reduce((list, next) => list.concat(next), [])
      }

      let events = () => {
        let subsIds = subs().map(s => s.id)
        return subsIds
          .map(subId => collector.indices.subscriptions[subId].events)
          .map(eventIds => eventIds.map(eid => collector.data[eid] as AddEvent))
          .reduce((list, next) => list.concat(next), [])
          .map(e => e.event)
      }

      return {
        all: () => obs(),
        subscriptions: () => ({
          all: () => subs(),
          completes: () => events().filter(e => e.type === "complete"),
          errors: () => events().filter(e => e.type === "error"),
          events,
          nexts: () => events().filter(e => e.type === "next"),
        }),
      } as IObservableLens<T>
    },
  }
}
