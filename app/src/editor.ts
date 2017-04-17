declare const CodeMirror: Function & {
  signal: Function
}

let editor = CodeMirror(document.querySelector("#editor"), {
  lineNumbers: true,
})

window.addEventListener("message", (e) => {
  if (e.data && e.data === "requestCode") {
    parent.postMessage({ code: editor.getValue() }, location.origin)
  }
  if (e.data && e.data && typeof e.data.code === "string") {
    if (editor.getValue() !== e.data.code) {
      editor.setValue(e.data.code)
    }
  }
})


// Dynamic behaviour
editor.on("change", () => {
  parent.postMessage({
    desiredWidth: getWidth() * editor.defaultCharWidth() + editor.getGutterElement().clientWidth + 15,
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
