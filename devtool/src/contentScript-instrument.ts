import TreePoster from "../../dist/src/collector/treePoster"
import { TreeCollector } from "../../dist/src/instrumentation/rxjs-4.1.0/collector"
import Instrumentation, { defaultSubjects } from "../../dist/src/instrumentation/rxjs-4.1.0/instrumentation"


(function () {
  let ranOnce = false

  function run(Rx: any) {
    console.log("Found Rx", Rx)
    if (Rx && Rx.Observable && typeof Rx.Observable.of(1).debounce === "function" && !ranOnce) {
      ranOnce = true
      let defaultSubjects = {
        Observable: Rx.Observable,
        "Observable.prototype": Rx.Observable.prototype,
        "ConnectableObservable.prototype": Rx.ConnectableObservable.prototype,
        "ObservableBase.prototype": Rx.ObservableBase.prototype,
        "AbstractObserver.prototype": Rx.internals.AbstractObserver.prototype,
        "AnonymousObserver.prototype": Rx.AnonymousObserver.prototype,
        "Subject.prototype": Rx.Subject.prototype,
      }
      let poster = new TreePoster(m => (postMessage as (m: any) => void)(m))
      let collector = new TreeCollector(poster)
      let instrumentation: Instrumentation = new Instrumentation(defaultSubjects, collector)
      instrumentation.setup()
    }
  }

  let scope = this as any
  let outer = window as any
  let Rx = scope && scope.Rx || outer && outer.Rx
  if (Rx) {
    run(Rx)
  } else {
    (window as any).instrumentRx = run;
    (window as any).id = 1;
    [].slice.call(document.scripts, 0).forEach((other: HTMLScriptElement) => {
      let script = document.createElement("script")
      script.setAttribute("type", "text/javascript");
      (document.head as any).instrumentRx = run
      script.innerHTML = `if(Rx) { 
        document.head.Rx = Rx;
        window.instrumentRx && window.instrumentRx(Rx) || document.head.instrumentRx && document.head.instrumentRx(Rx)
      }`
      if (other.nextSibling) {
        other.parentNode.insertBefore(script, other.nextSibling)
      } else {
        other.parentNode.appendChild(script)
      }
    })
  }
})()
