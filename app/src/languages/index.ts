import { RunnerConfig } from "../collector/runner"
import { Documentation } from "./provider"
import { RxJSDocumentationProvider } from "./rxjs"

export let documentationProviders = [
  new RxJSDocumentationProvider(),
]

export interface LanguageServices {
}

export interface Language {
  name: LanguagesName
  services: LanguageServices
}

export type LanguagesName = "JavaScript" | "Java" | "Scala" | "Swift"

export interface Library {
  languages: Language[]
  versions: string[]
}

export interface LibraryVersion {
  languages: Language[]
  version: string
}

export interface LanguageCombination {
  id: string
  name: string
  language: Language
  library: LibraryVersion
  documentation?: Documentation
  runnerConfig?: RunnerConfig
}

let JAVASCRIPT: Language = {
  name: "JavaScript",
  services: {},
}

export let RxJS4: LanguageCombination = {
  id: "rxjs4",
  language: JAVASCRIPT,
  library: {
    languages: [JAVASCRIPT],
    version: "4",
  },
  name: "RxJS 4",
  get documentation() { return new RxJSDocumentationProvider().get("4") },
  get runnerConfig(): RunnerConfig {
    return {
      libraryFile: "instrumentation/rxjs-4.1.0/rx.all.js",
      workerFile: "dist/worker-rx-4.1.0.bundle.js",
    }
  },
}

export let RxJS5: LanguageCombination = {
  id: "rxjs5",
  language: JAVASCRIPT,
  library: {
    languages: [JAVASCRIPT],
    version: "5",
  },
  name: "RxJS 5",
  get documentation() { return new RxJSDocumentationProvider().get("5") },
  get runnerConfig(): RunnerConfig {
    return {
      libraryFile: "instrumentation/rxjs-5.x.x/Rx.js",
      workerFile: "dist/worker-rx-5.x.x.bundle.js",
    }
  },
}

export default [RxJS4, RxJS5] as LanguageCombination[]
