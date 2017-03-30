
export type MarbleClick = {
  type: "marbleClick"
  tick: number
  subscription: string
}
export type MarbleHoover = {
  type: "marbleHoover"
  tick: number
  subscription: string
}
export type DiagramOperatorHoover = {
  type: "diagramOperatorHoover"
  observable: string
}
export type DiagramOperatorClick = {
  type: "diagramOperatorClick"
  observable: string
}
export type HigherOrderHoover = {
  type: "higherOrderHoover"
  observable: string
  tick: number
}
export type HigherOrderClick = {
  type: "higherOrderClick"
  observable: string
  tick: number
}

export type TickSelection = {
  type: "tickSelection"
  tick: number
}

export type SelectionGraphEdge = {
  type: "selectionGraphEdge"
  v: string
  w: string
}

export type SelectionGraphNode = {
  type: "selectionGraphNode"
  node: string
}

export type SelectionGraphNone = {
  type: "selectionGraphNone"
}

export type UIEvent =
  MarbleClick | MarbleHoover
  | DiagramOperatorClick | DiagramOperatorHoover
  | HigherOrderHoover | HigherOrderClick
  | TickSelection
  | SelectionGraphNode | SelectionGraphEdge | SelectionGraphNone
