import { Edge as GraphEdge, Graph, GraphOptions } from "graphlib"
import * as _ from "lodash"

export default class TypedGraph<V,E> extends Graph {
    private options: GraphOptions

    constructor(name?: string, options?: GraphOptions)
    constructor(options?: GraphOptions)
    constructor(arg1?: any, arg2?: any) {
      super(typeof arg1 === "string" ? arg2 : arg1)
      if(typeof arg1 === "string") {
        this.setGraph(arg1)
      }
      this.options = typeof arg1 === "string" ? arg2 : arg1
    }

    filterNodes(filter: (node: string, label: V) => boolean): this {
      let copy = new TypedGraph<V,E>(this.options)
      
      copy.setGraph(this.graph())
      _.each(this.nodes(), (v) => {
        if (filter(v, this.node(v))) {
          copy.setNode(v, this.node(v))
        }
      })
      _.each(this.edges(), (e) => {
        if (copy.hasNode(e.v) && copy.hasNode(e.w)) {
          copy.setEdge(e.v, e.w, this.edge(e))
        }
      })

      return copy as this
    }

    filterEdges(filter: (obj: GraphEdge, label: E) => boolean): this {
      let copy = new TypedGraph<V,E>(this.options)
      copy.setGraph(this.graph())
      _.each(this.edges(), (e) => {
        let label = this.edge(e)
        if (filter(e, label)) {
          !copy.hasNode(e.v) && copy.setNode(e.v, this.node(e.v))
          !copy.hasNode(e.w) && copy.setNode(e.w, this.node(e.w))
          copy.setEdge(e.v, e.w, label)
        }
      })
      return copy as this
    }

    setNode(name: string, label?: V): this {
      if(typeof label === "undefined" && super.node(name) === "undefined") {
        throw new Error("IllegalArgument for graph Label!")
      } else if(typeof label === "undefined") {
        super.setNode(name)
      } else {
        super.setNode(name, label)
      }
      return this
    }

    node(name: string): V {
      return super.node(name) as V
    }

    setEdge(v: string, w: string, label?: E): this {
      super.setEdge(v, w, label)
      return this
    }

    edge(v: string, w: string): E;
    edge(v: GraphEdge): E;
    edge(v: any, w?: any): E {
      if(typeof v === "string" && typeof w === "string") {
        return super.edge(v, w) as E
      } else if(typeof v === "object") {
        return super.edge(v)
      } else {
        throw new Error("Illegal argument to edge_t function")
      }
    }

    toDot(nodeProps?: (n: V) => any, edgeProps: (e: E) => any = () => ({ type: 's' }), cluster: (n: V) => string = () => ""): string {
      let ns: string[] = this.nodes().map((n: string) => {
        let data = nodeProps && nodeProps(this.node(n))
        if(data) {
          let query = Object.keys(data).map(k => `${k}="${data[k]}"`).join(", ")
          return `"${n}" [${query}];`
        }
        return `"${n}";`
      })

      let es: string[] = this.edges().map((e: GraphEdge) => {
        let data = edgeProps && edgeProps(this.edge(e))
        if(data) {
          let query = Object.keys(data).map(k => `${k}="${data[k]}"`).join(", ")
          return `"${e.v}" -> "${e.w}" [${query}];`
        }
        return `"${e.v}" -> "${e.w}";`
      });

      let clusters: { [key: string]: string[] } = {}
      this.nodes().forEach((v: string) => {
        let k = cluster(this.node(v))
        if(!clusters[k]) { clusters[k] = [] }
        clusters[k].push(v)
      })

      let cs = Object.keys(clusters).map((k, index) => {
        let ns = clusters[k].join(" ")
        if(k) {
          return `subgraph cluster-${k} { ${ns}; label = "${k}" };`
        }
        return `subgraph cluster-${index} { ${ns} };`
      })

      return ["digraph g", "{",
        "rankdir=LR",
	      "splines=line",
        ...cs,
        ...ns,
        ...es,
      "}"].join("\n")
    }
}
  