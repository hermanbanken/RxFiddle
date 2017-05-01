import { Edge as GraphEdge, Graph, GraphOptions } from "graphlib"
import * as _ from "lodash"

export default class TypedGraph<V, E> extends Graph {
  private options: GraphOptions

  constructor(name?: string, options?: GraphOptions)
  constructor(options?: GraphOptions)
  constructor(arg1?: any, arg2?: any) {
    super(typeof arg1 === "string" ? arg2 : arg1)
    if (typeof arg1 === "string") {
      this.setGraph(arg1)
    }
    this.options = typeof arg1 === "string" ? arg2 : arg1
  }

  public filterNodes(filter: (node: string, label: V) => boolean): this {
    let copy = new TypedGraph<V, E>(this.options)

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

  public filterEdges(filter: (obj: GraphEdge, label: E) => boolean): this {
    let copy = new TypedGraph<V, E>(this.options)
    copy.setGraph(this.graph())
    _.each(this.nodes(), n => copy.setNode(n, this.node(n)))
    _.each(this.edges(), (e) => {
      let label = this.edge(e)
      if (filter(e, label)) {
        if (!copy.hasNode(e.v)) { copy.setNode(e.v, this.node(e.v)) }
        if (!copy.hasNode(e.w)) { copy.setNode(e.w, this.node(e.w)) }
        copy.setEdge(e.v, e.w, label)
      }
    })
    return copy as this
  }

  public flatMap<V2, E2>(
    nodeMap: (id: string, label: V) => { id: string, label: V2 }[],
    edgeMap: (id: GraphEdge, label: E) => { id: GraphEdge, label: E2 }[]
  ) {
    let copy = new TypedGraph<V2, E2>(this.options)
    copy.setGraph(this.graph())
    _.each(this.nodes(), (n) => {
      nodeMap(n, this.node(n)).forEach(({ id, label }) => copy.setNode(id, label))
    })
    _.each(this.edges(), (e) => {
      edgeMap(e, this.edge(e)).forEach(({ id, label }) => copy.setEdge(id.v, id.w, label))
    })
    return copy
  }

  public clone() {
    let copy = new TypedGraph<V, E>(this.options)
    copy.setGraph(this.graph())
    _.each(this.nodes(), (id) => {
      let label = this.node(id)
      copy.setNode(id, label)
    })
    _.each(this.edges(), (id) => {
      let label = this.edge(id)
      copy.setEdge(id.v, id.w, label)
    })
    return copy
  }

  public contractEdge(e: GraphEdge): this {
    let removed = e.w
    let cloned = this.clone()
    cloned.removeEdge(e.v, e.w)
    this.nodeEdges(removed)
      .filter(re => !(e.v === re.v && e.w === re.w))
      .forEach(re => {
        let label = cloned.edge(re)
        cloned.removeEdge(re.v, re.w)
        cloned.setEdge(re.v === removed ? e.v : re.v, re.w === removed ? re.v : re.w, label)
      })
    cloned.removeNode(removed)
    return cloned as this
  }

  public setNode(name: string, label?: V): this {
    if (typeof label === "undefined" && super.node(name) === "undefined") {
      throw new Error("IllegalArgument for graph Label!")
    } else if (typeof label === "undefined") {
      super.setNode(name)
    } else {
      super.setNode(name, label)
    }
    return this
  }

  public node(name: string): V {
    return super.node(name) as V
  }

  public setEdge(v: string, w: string, label?: E): this {
    super.setEdge(v, w, label)
    return this
  }

  public edge(v: string, w: string): E;
  public edge(v: GraphEdge): E;
  public edge(v: any, w?: any): E {
    if (typeof v === "string" && typeof w === "string") {
      return super.edge(v, w) as E
    } else if (typeof v === "object") {
      return super.edge(v)
    } else {
      throw new Error("Illegal argument to edge_t function")
    }
  }

  public toDot(
    nodeProps?: (n: V) => any,
    edgeProps: (e: E) => any = () => ({ type: "s" }),
    cluster: (n: V) => string = () => "",
    extraProps: () => any = () => ["rankdir=LR", "splines=line"]
  ): string {
    let ns: string[] = this.nodes().map((n: string) => {
      let data = nodeProps && nodeProps(this.node(n))
      if (data) {
        let query = Object.keys(data).map(k => `${k}="${data[k]}"`).join(", ")
        return `${dotEscape(n)} [${query}];`
      }
      return `${dotEscape(n)};`
    })

    let es: string[] = this.edges().map((e: GraphEdge) => {
      let data = edgeProps && edgeProps(this.edge(e))
      if (data) {
        let query = Object.keys(data).map(k => `${k}="${data[k]}"`).join(", ")
        return `${dotEscape(e.v)} -> ${dotEscape(e.w)} [${query}];`
      }
      return `${dotEscape(e.v)} -> ${dotEscape(e.w)};`
    });

    let clusters: { [key: string]: string[] } = {}
    this.nodes().forEach((v: string) => {
      let k = cluster(this.node(v))
      if (!clusters[k]) { clusters[k] = [] }
      clusters[k].push(`${dotEscape(v)}`)
    })

    let cs = Object.keys(clusters).map((k, index) => {
      let cns = clusters[k].join(" ")
      if (k) {
        return `subgraph cluster${k} { ${cns}; label = "${k}" };`
      }
      return `subgraph cluster${index} { ${cns} };`
    })

    return ["digraph g", "{",
      ...extraProps(),
      ...cs,
      ...ns,
      ...es,
      "}"].join("\n")
  }
}

function dotEscape(n: string) {
  return n.match(/[\-.()]/) ? `"${n.replace(/[()]/g, "")}"` : n
}
