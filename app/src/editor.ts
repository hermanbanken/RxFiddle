declare const CodeMirror: Function

let scope = window as any
scope.Rx = Rx

let editor = CodeMirror(document.querySelector("#editor"), {
  lineNumbers: true,
})

let hash = window.location.hash
if (hash.indexOf("blob=") >= 0) {
  editor.setValue(atob(decodeURI(hash.substr(hash.indexOf("blob=") + "blob=".length))))
} else if (localStorage && localStorage.getItem("code")) {
  editor.setValue(localStorage.getItem("code"))
}

window.addEventListener("message", (e) => {
  if (e.data && e.data === "requestCode") {
    parent.postMessage({ code: editor.getValue() }, location.origin)
  }
})

// import * as Rx from "rx"
// function formatError(e: Error): any {
//   return {
//     message: e.message,
//     name: e.name,
//     original: typeof (e as any).original !== "undefined" ? formatError((e as any).original) : undefined,
//     stack: e.stack.toString(),
//   }
// }
// /** 
//  * Have single location for evil eval,
//  * so we can infer it's stackTrace beforehand 
//  * and strip that from the errors coming from it 
//  */
// function scopedEval(code: string) {
//   // tslint:disable-next-line:no-eval
//   return eval(code)
// }

// function evalAndRepackageErrors(code: string): { type: "result", result: any } | { type: "error", error: any } {
//   try {
//     return { result: scopedEval(code), type: "result" }
//   } catch (e) {
//     // Infer eval location
//     try {
//       scopedEval("throw new Error('ERROR')")
//     } catch (dummyError) {
//       // clean up error stack trace
//       let result = /\n\s+at scopedEval \((.*)\)/.exec(dummyError.stack)
//       let stack: string = e.stack.toString()
//       let index = stack.lastIndexOf(`at scopedEval (${result[1]})`)
//       stack = stack.substring(0, index)
//       stack = stack.split(`eval at scopedEval (${result[1]}), `).join("")
//       e.stack = stack
//     }
//     return { error: formatError(e), type: "error" }
//   }
// }

// let instrumentation: Instrumentation
// function run() {
//   if (instrumentation) {
//     instrumentation.teardown()
//   }

//   let code = editor.getValue()
//   if (localStorage) {
//     localStorage.setItem("code", code)
//   }
//   window.parent.postMessage({ hash: { type: "editor", code: encodeURI(btoa(code)) } }, location.origin)

//   let poster = new TreeWindowPoster()
//   poster.reset()
//   let collector = new TreeCollector(poster)
//   instrumentation = new Instrumentation(defaultSubjects, collector)
//   instrumentation.setup()

//   // Execute user code
//   let result = evalAndRepackageErrors(code)

//   if (result.type === "error") {
//     window.parent.postMessage({
//       error: result.error,
//       type: "error",
//     }, location.origin)
//   }
// }

// let button = document.querySelector("#run") as HTMLButtonElement
// if (button) { button.onclick = run }
// window.addEventListener("message", (e) => {
//   if (e.data && e.data === "run") {
//     run()
//   }
// })
