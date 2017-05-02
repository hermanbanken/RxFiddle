import * as Rx from "rxjs"

export interface SearchToken {
  token: string
  score: number
}

export interface DocumentationMethod {
  searchTokens: SearchToken[]
}

export interface Documentation {
  library: string
  version: string
  methods: Rx.Observable<DocumentationMethod[]>
  search(query: string): Rx.Observable<{ method: DocumentationMethod, matchText: string }[]>
}

export interface DocumentationProvider {
  library: string
  language: string
  versions: string[]
  get(version: string): Documentation
}
