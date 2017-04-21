importScripts("../src/instrumentation/rxjs-4.1.0/rx.all.js")
import { formatArguments } from "../../collector/logger"

export type ToWorkerMessage = { type: "run", code: string }

function post(level: string, args: IArguments) {
  (postMessage as (m: any) => void)({ arguments: formatArguments(args), level })
}

// tslint:disable:max-line-length
// tslint:disable:semicolon
let actualConsole = console
let Console = {
  error(...args: any[]) { post("error", arguments); actualConsole.error.apply(actualConsole, arguments) },
  warn(...args: any[]) { post("warn", arguments); actualConsole.warn.apply(actualConsole, arguments) },
  log(...args: any[]) { post("log", arguments); actualConsole.log.apply(actualConsole, arguments) },
  info(...args: any[]) { post("info", arguments); actualConsole.info.apply(actualConsole, arguments) },
  debug(...args: any[]) { post("debug", arguments); actualConsole.debug.apply(actualConsole, arguments) },
  assert(value: boolean) { post("assert", arguments); actualConsole.assert.apply(actualConsole, arguments) },
  clear() { },
  count() { },
  dir() { },
  dirxml() { },
  exception() { },
  group() { },
  groupCollapsed() { },
  groupEnd() { },
  profile() { },
  profileEnd() { },
  select() { },
  table() { },
  time() { },
  timeEnd() { },
  trace() { },
  Console: new Object() as any,
  msIsIndependentlyComposed(element: Element): boolean { return false },
}
console = Console
// tslint:enable:max-line-length 
// tslint:enable:semicolon

function formatError(e: Error): any {
  return {
    message: e.message,
    name: e.name,
    original: typeof (e as any).original !== "undefined" ? formatError((e as any).original) : undefined,
    stack: e.stack.toString(),
  }
}

let scope = {}

/** 
 * Have single location for evil eval,
 * so we can infer it's stackTrace beforehand 
 * and strip that from the errors coming from it 
 */
function scopedEval(code: string) {
  let indirect = eval;
  // tslint:disable-next-line:only-arrow-functions
  (function () {
    var console: any = Console as any
    // tslint:disable-next-line:no-eval
    return (indirect)(code)
  }).call(scope)
}

function evalAndRepackageErrors(code: string): { type: "result", result: any } | { type: "error", error: any } {
  try {
    return { result: scopedEval(code), type: "result" }
  } catch (e) {
    console.error(e)
    // Infer eval location
    try {
      scopedEval("throw new Error('ERROR')")
    } catch (dummyError) {
      // clean up error stack trace
      let result = /\n\s+at scopedEval \((.*)\)/.exec(dummyError.stack)
      if (result === null) {
        return { error: e.stack, type: "error" }
      }
      let stack: string = e.stack.toString()
      let index = stack.lastIndexOf(`at scopedEval (${result[1]})`)
      stack = stack.substring(0, index)
      stack = stack.split(`eval at scopedEval (${result[1]}), `).join("")
      e.stack = stack
    }
    return { error: formatError(e), type: "error" }
  }
}

onmessage = (e: MessageEvent) => {
  let message = e.data as ToWorkerMessage
  switch (message.type) {
    case "run":
      // Execute user code
      let result = evalAndRepackageErrors(message.code)
      if (result.type === "error") {
        (postMessage as (m: any) => void)({
          error: result.error,
          type: "error",
        })
      }
      break
    default: break
  }
}
