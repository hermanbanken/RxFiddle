import { ObservableTree } from "../oct/oct" 

interface ISyntaxAnalyser {
  parseSyntax(syntax: string): ObservableTree[]
}
