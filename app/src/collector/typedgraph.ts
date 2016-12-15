import { Edge as GraphEdge, Graph } from "graphlib"

export default class TypedGraph<V,E> extends Graph {
    setNode(name: string, label?: V): this {
      super.setNode(name, label)
      return this
    }

    removeNode(name: string): this {
      super.removeNode(name)
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
  }
  