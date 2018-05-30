import { IEvent, IEventType } from "./event"

function marble(event: IEventType) {
  return event[0].toLowerCase()
}

export function render(inputs: { events: IEvent[], id?: string }[]): string[] {
  let times = inputs.reduce(
    (store: number[], { events: list }) => store.concat(list.map(_ => _.timing.clocks.tick)),
    []
  )
  times.sort()
  return inputs.map(({ events: stream, id }, index) => {
    let result = ""
    let ts = times.slice(0)
    let es = stream.slice(0).sort((a, b) => a.timing.clocks.tick - b.timing.clocks.tick)
    for (let t = 0, s = 0; t < ts.length; t++) {
      if (s < es.length && ts[t] === es[s].timing.clocks.tick) {
        result += marble(es[s++].type)
      } else {
        result += "-"
      }
    }
    return id ? `${id} ${result}` : result
  })
}
