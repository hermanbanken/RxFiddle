import RxRunner from "../collector/runner"
export default class ConsoleRunner extends RxRunner {

  protected get defaultConfig() {
    return {
      libraryFile: "instrumentation/rxjs-5.x.x/Rx.js",
      workerFile: "dist/worker-console-experiment.bundle.js",
    }
  }

}
