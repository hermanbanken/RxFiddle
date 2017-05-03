importScripts("instrumentation/rxjs-5.x.x/Rx.js")
import TreePoster from "../../collector/treePoster"
import "../../experiment/sample-data"
import { onWorkerMessage } from "../worker-utils"
import { TreeCollector } from "./collector"
import Instrumentation from "./instrumentation"

onmessage = onWorkerMessage(() => {
  let poster = new TreePoster(m => (postMessage as (m: any) => void)(m))
  let collector = new TreeCollector(poster)
  let instrumentation: Instrumentation = new Instrumentation(collector)
  instrumentation.setup()
  console.info("Ready for RxJS 5 instrumentation");
  (Rx as any).version = "5.3.0"
})
