importScripts("../src/instrumentation/rxjs-4.1.0/rx.all.js")

import TreePoster from "../../collector/treePoster"
import { TreeCollector } from "./collector"
import Instrumentation, { defaultSubjects } from "./instrumentation"

export type ToWorkerMessage = { type: "run", code: string }

function formatError(e: Error): any {
  return {
    message: e.message,
    name: e.name,
    original: typeof (e as any).original !== "undefined" ? formatError((e as any).original) : undefined,
    stack: e.stack.toString(),
  }
}

/** 
 * Have single location for evil eval,
 * so we can infer it's stackTrace beforehand 
 * and strip that from the errors coming from it 
 */
function scopedEval(code: string) {
  // tslint:disable-next-line:no-eval
  return eval(code)
}

function evalAndRepackageErrors(code: string): { type: "result", result: any } | { type: "error", error: any } {
  try {
    return { result: scopedEval(code), type: "result" }
  } catch (e) {
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

let poster = new TreePoster(m => (postMessage as (m: any) => void)(m))
let collector = new TreeCollector(poster)
let instrumentation: Instrumentation = new Instrumentation(defaultSubjects, collector)
instrumentation.setup()

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
