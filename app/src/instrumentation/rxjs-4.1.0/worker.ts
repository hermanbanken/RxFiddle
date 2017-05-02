importScripts("../src/instrumentation/rxjs-4.1.0/rx.all.js")

import TreePoster from "../../collector/treePoster"
import { onWorkerMessage } from "../worker-utils"
import { TreeCollector } from "./collector"
import Instrumentation, { defaultSubjects } from "./instrumentation"

console.info("Ready for RxJS 4 instrumentation");
(Rx as any).version = "4.1.0"

let poster = new TreePoster(m => (postMessage as (m: any) => void)(m))
let collector = new TreeCollector(poster)
let instrumentation: Instrumentation = new Instrumentation(defaultSubjects, collector)
instrumentation.setup()

onmessage = onWorkerMessage
