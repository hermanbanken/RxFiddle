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
  language: Language
  library: LibraryVersion
}
