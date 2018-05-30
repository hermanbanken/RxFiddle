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

function importance(info: ISchedulerInfo) {
  return info.type === "virtual" && 2 || info.id !== "tick" && 1 || 0
}

export default class TimeComposer {
  public schedulers: ISchedulerInfo[] = []
  public events: IEvent[] = []

  public bounds: { [schedulerId: string]: { min: number, max: number } } = {}

  public reduce(event: IEvent): this {
    this.events.push(event)
    Object.keys(event.timing.clocks).forEach(id => this.bounds[id] = expand(this.bounds[id], event.timing.clocks[id]))
    return this
  }

  public max(scheduler: string = "tick"): number {
    return this.bounds[scheduler] && this.bounds[scheduler].max || 0
  }
  public min(scheduler: string = "tick"): number {
    return this.bounds[scheduler] && this.bounds[scheduler].min || 0
  }
  public unit(scheduler: string = "tick"): string {
    if (scheduler === "tick") { return "" }
    let info = this.schedulers.find(s => s.id === scheduler)
    return info && info.type === "virtual" ? "" : "ms"
  }
  public defaultId(): string {
    return "tick"
  }

  public bins(count: number, scheduler: string = "tick"): Uint8Array {
    let arr = new Uint8Array(count)
    let min = this.min(scheduler)
    let max = this.max(scheduler)
    let maxScale = 0
    for (let n of this.events) {
      if (n.timing.scheduler === scheduler) {
        let t = count * (n.timing.clocks[scheduler] - min) / (max - min)
        let i = Math.max(0, Math.min(count - 1, Math.floor(t)))
        arr[i]++
        if (arr[i] > maxScale) { maxScale = arr[i] }
      }
    }
    for (let i = 0; i < count; i++) {
      arr[i] *= 60 / maxScale
    }
    return arr
  }

}
