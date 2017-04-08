declare const CodeMirror: Function

let scope = window as any
scope.Rx = Rx

let editor = scope.editor = CodeMirror(document.querySelector("#editor"), {
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

// Dynamic behaviour
editor.on("change", () => {
  localStorage.setItem("code", editor.getValue())
  parent.postMessage({
    desiredWidth: getWidth() * 8 + editor.getGutterElement().clientWidth + 15,
  }, location.origin)
})
CodeMirror.signal(editor, "change")

function getWidth(): number {
  let tabSize = editor.getOption("tabSize")
  let spaces = range(0, tabSize).map(_ => "_").join("")
  let code = editor.getValue()
  return code
    .split("\n")
    .map((line: string) => line.replace(/\t/g, spaces).length)
    .sort((a: number, b: number) => b - a)[0] || 0
}

function range(start: number, end: number): number[] {
  let r = []
  for (let i = start; i < end; i++) {
    r.push(i)
  }
  return r
}
