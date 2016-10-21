import { IEvent, IEventType } from "./event";

function marble(event: IEventType) {
  return event[0].toLowerCase();
}

export function render(events: IEvent[][]): string[] {
  var times = events.reduce((store: number[], list) => store.concat(list.map(_ => _.time)), [])
  times.sort();
  return events.map(stream => {
    var result = "";
    var ts = times.slice(0), es = stream.slice(0).sort((a, b) => a.time - b.time);
    for (var t = 0, s = 0; t < ts.length; t++) {
      if (s < es.length && ts[t] == es[s].time) {
        result += marble(es[s++].type);
      } else {
        result += "-";
      }
    }
    return result;
  })
}