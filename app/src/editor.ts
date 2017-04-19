declare const CodeMirror: Function & {
  signal: Function
}

type Pos = { line: number, ch: number }

let scope = window as any
scope.Rx = Rx

let editor = scope.editor = CodeMirror(document.querySelector("#editor"), {
  lineNumbers: true,
})

function handleMessage(e: any) {
  if (e.data && e.data === "requestCode") {
    parent.postMessage({ code: editor.getValue() }, location.origin)
  }
  if (e.data && e.data && typeof e.data.code === "string") {
    if (editor.getValue() !== e.data.code) {
      editor.setValue(e.data.code)
    }
  }
  if (typeof e.data.ranges === "object") {
    console.log("Marking Text ranges", e.data.ranges)
    e.data.ranges.forEach(({ from, to, options }: { from: Pos, to: Pos, options: any }) =>
      editor.markText(from, to, options)
    )
  }
  if (typeof e.data.lineClasses === "object") {
    console.log("Marking line classes", e.data.lineClasses)
    e.data.lineClasses.forEach(({ line, where, class: clasz }: { line: number, where: string, class: string }) =>
      editor.addLineClass(line, where, clasz)
    )
  }
}

window.addEventListener("message", handleMessage)

let hash = window.location.hash
if (hash.indexOf("blob=") >= 0) {
  let json = atob(decodeURI(hash.substr(hash.indexOf("blob=") + "blob=".length)))
  JSON.parse(json).forEach((data: any) => handleMessage({ data }))
} else if (localStorage && localStorage.getItem("code")) {
  editor.setValue(localStorage.getItem("code"))
}


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
