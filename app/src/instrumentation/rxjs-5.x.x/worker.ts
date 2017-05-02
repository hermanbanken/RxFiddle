importScripts("../src/instrumentation/rxjs-5.x.x/Rx.min.js")

import TreePoster from "../../collector/treePoster"
import { onWorkerMessage } from "../worker-utils"
import { TreeCollector } from "./collector"
import Instrumentation from "./instrumentation"

console.info("Ready for RxJS 5 instrumentation");
(Rx as any).version = "5.3.0"

let poster = new TreePoster(m => (postMessage as (m: any) => void)(m))
let collector = new TreeCollector(poster)
let instrumentation: Instrumentation = new Instrumentation(collector)
instrumentation.setup()

onmessage = onWorkerMessage
