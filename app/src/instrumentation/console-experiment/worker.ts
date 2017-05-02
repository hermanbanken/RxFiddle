importScripts("instrumentation/rxjs-5.x.x/Rx.js")
import { formatArguments } from "../../collector/logger"
import { onWorkerMessage } from "../worker-utils"

// tslint:disable:max-line-length
// tslint:disable:semicolon

function post(level: string, args: IArguments) {
  (postMessage as (m: any) => void)({ arguments: formatArguments(args), level })
}

let actualConsole = console
let Console = {
  error(...args: any[]) { post("error", arguments); actualConsole.error.apply(actualConsole, arguments) },
  warn(...args: any[]) { post("warn", arguments); actualConsole.warn.apply(actualConsole, arguments) },
  log(...args: any[]) { post("log", arguments); actualConsole.log.apply(actualConsole, arguments) },
  info(...args: any[]) { post("info", arguments); actualConsole.info.apply(actualConsole, arguments) },
  debug(...args: any[]) { post("debug", arguments); actualConsole.debug.apply(actualConsole, arguments) },
  assert(value: boolean) { post("assert", arguments); actualConsole.assert.apply(actualConsole, arguments) },
  clear() { /* */ },
  count() { /* */ },
  dir() { /* */ },
  dirxml() { /* */ },
  exception() { /* */ },
  group() { /* */ },
  groupCollapsed() { /* */ },
  groupEnd() { /* */ },
  profile() { /* */ },
  profileEnd() { /* */ },
  select() { /* */ },
  table() { /* */ },
  time() { /* */ },
  timeEnd() { /* */ },
  trace() { /* */ },
  Console: new Object() as any,
  msIsIndependentlyComposed(element: Element): boolean { return false },
}
console = Console

onmessage = onWorkerMessage(() => {
  /* noop */
})
