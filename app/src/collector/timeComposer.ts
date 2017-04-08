import { ISchedulerInfo } from "../oct/oct"
import { IEvent } from "./event"

function expand(bound: { min: number, max: number }, next: number): { min: number, max: number } {
  if (isNaN(next)) { return bound }
  if (typeof bound === "undefined") { return { max: next, min: next } }
  return {
    max: Math.max(bound.max, next),
    min: Math.min(bound.min, next),
  }
}

export default class TimeComposer {
  public schedulers: ISchedulerInfo[]
  public events: IEvent[]

  public bounds: { [schedulerId: string]: { min: number, max: number } } = {}

  public reduce(event: IEvent): this {
    Object.keys(event.timing.clocks).forEach(id => this.bounds[id] = expand(this.bounds[id], event.timing.clocks[id]))
    return this
  }

  public max(): number {
    return this.bounds.tick && this.bounds.tick.max || 0
    // return Object.keys(this.bounds).filter(k => this.bounds.hasOwnProperty(k)).map(k => this.bounds[k].max)[0]
  }
  public min(): number {
    return this.bounds.tick && this.bounds.tick.min || 0
    // return Object.keys(this.bounds).filter(k => this.bounds.hasOwnProperty(k)).map(k => this.bounds[k].min)[0]
  }
}
