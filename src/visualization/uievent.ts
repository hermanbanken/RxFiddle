import { IEvent } from "../collector/event"

export type MarbleClick = {
  type: "marbleClick"
  marble: IEvent
  subscription: string
}
export type MarbleHoover = {
  type: "marbleHoover"
  marble: IEvent
  subscription: string
}
export type MarbleHooverEnd = {
  type: "marbleHooverEnd"
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

export type Scheduler = {
  type: "scheduler"
  id: string
}

export type SchedulerTimeRange = {
  type: "timeRange"
  scheduler: string
  min: number
  max: number
}

export type UIEvent =
  MarbleClick | MarbleHoover | MarbleHooverEnd
  | DiagramOperatorClick | DiagramOperatorHoover
  | HigherOrderHoover | HigherOrderClick
  | TickSelection
  | SelectionGraphNode | SelectionGraphEdge | SelectionGraphNone
  | Scheduler | SchedulerTimeRange
