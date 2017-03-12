import Instrumentation, { defaultSubjects } from "./collector/instrumentation"
import Collector from "./collector/logger"
import { TreeCollector, TreeWindowPoster } from "./collector/treeCollector"
import * as Rx from "rx"

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

let instrumentation: Instrumentation
function run() {
  if (instrumentation) {
    instrumentation.teardown()
  }

  let code = editor.getValue()
  if (localStorage) {
    localStorage.setItem("code", code)
  }
  window.parent.postMessage({ hash: { type: "editor", code: encodeURI(btoa(code)) } }, location.origin)

  let poster = new TreeWindowPoster()
  let collector = new TreeCollector(poster)
  instrumentation = new Instrumentation(defaultSubjects, collector)
  instrumentation.setup()
  poster.reset()

  // tslint:disable-next-line:no-eval
  eval(code)
}

let button = document.querySelector("#run") as HTMLButtonElement
button.onclick = run
