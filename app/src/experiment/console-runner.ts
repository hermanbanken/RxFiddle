import RxRunner from "../collector/runner"
export default class ConsoleRunner extends RxRunner {
  protected workerFile = "dist/worker-console-experiment.bundle.js"
}
