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

if (localStorage && localStorage.getItem("code")) {
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

  let collector = new TreeCollector(new TreeWindowPoster())
  instrumentation = new Instrumentation(defaultSubjects, collector)
  instrumentation.setup()

  // tslint:disable-next-line:no-eval
  eval(code)
}

let button = document.querySelector("#run") as HTMLButtonElement
button.onclick = run
