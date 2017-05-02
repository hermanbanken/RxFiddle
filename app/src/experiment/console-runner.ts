import RxRunner from "../collector/runner"
export default class ConsoleRunner extends RxRunner {
  protected get workerFile() { return "dist/worker-console-experiment.bundle.js" }
}
