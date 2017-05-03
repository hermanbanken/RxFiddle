importScripts("instrumentation/rxjs-4.1.0/rx.all.js")
import TreePoster from "../../collector/treePoster"
import "../../experiment/sample-data"
import { onWorkerMessage } from "../worker-utils"
import { TreeCollector } from "./collector"
import Instrumentation, { defaultSubjects } from "./instrumentation"

onmessage = onWorkerMessage(() => {
  let poster = new TreePoster(m => (postMessage as (m: any) => void)(m))
  let collector = new TreeCollector(poster)
  let instrumentation: Instrumentation = new Instrumentation(defaultSubjects(Rx), collector)
  instrumentation.setup()
  console.info("Ready for RxJS 4 instrumentation");
  (Rx as any).version = "4.1.0"
})
