export type ToWorkerMessage = { type: "run", code: string } | { type: "importScripts", url: string }

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
  // tslint:disable-next-line:only-arrow-functions
  (function () {
    // tslint:disable-next-line:no-eval
    return eval(code)
  }).call(scope)
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
      let result = /\n\s+at Object.<anonymous> \((.*)\)/.exec(dummyError.stack)
      if (result === null) {
        return { error: e.stack, type: "error" }
      }
      let stack: string = e.stack.toString()
      let index = stack.lastIndexOf(`at Object.<anonymous> (${result[1]})`)
      stack = stack.substring(0, index)
      stack = stack.split(`eval at <anonymous> (${result[1]}), `).join("")
      e.stack = stack
    }
    return { error: formatError(e), type: "error" }
  }
}

export function onWorkerMessage(e: MessageEvent) {
  let message = e.data as ToWorkerMessage
  switch (message.type) {
    case "importScripts":
      importScripts(message.url)
      break
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
