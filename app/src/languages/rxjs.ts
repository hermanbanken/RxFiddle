import { Documentation, DocumentationMethod, DocumentationProvider } from "./provider"
import * as Rx from "rxjs"

export class RxJSDocumentationProvider implements DocumentationProvider {
  public library = "RxJS"
  public language = "JavaScript"
  public versions: string[] = ["4", "5"]
  public get(version: string): Documentation {
    if (version === "4") {
      return new RxJS4Documentation()
    } else if (version === "5") {
      return new RxJS5Documentation()
    }
  }
}

class RxJS4Documentation implements Documentation {
  public version = "4"
  public library = "RxJS"
  public methods = Rx.Observable.of([])
  public search(query: string): Rx.Observable<{ method: DocumentationMethod; matchText: string; }[]> {
    return Rx.Observable.of([])
  }
}

class RxJS5Documentation implements Documentation {
  public library = "RxJS"
  public version = "5"
  public methods = Rx.Observable.of([])
  public search(query: string): Rx.Observable<{ method: DocumentationMethod; matchText: string; }[]> {
    return Rx.Observable.of([])
  }
}
