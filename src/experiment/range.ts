export function handleRangeTouch(e: TouchEvent) {
  let target = e.target as HTMLInputElement
  if ((target as any).type === "range") {
    let p = relPosition(target, e.touches[0])
    let x = Math.max(0, Math.min(1, p.x / target.clientWidth))
    let min = parseInt(target.min, 10)
    let max = parseInt(target.max, 10)
    target.value = `${min + (max - min) * x}`
  }
  if (e.cancelable) {
    e.preventDefault()
  }
  // return false
}

function relPosition(element: HTMLElement, event: { clientX: number, clientY: number }) {
  let offset = getPosition(element)
  return {
    x: event.clientX - offset.x,
    y: event.clientY - offset.y,
  }
}

function getPosition(element: HTMLElement) {
  let xPosition = 0
  let yPosition = 0
  while (element) {
    xPosition += (element.offsetLeft - element.scrollLeft + element.clientLeft)
    yPosition += (element.offsetTop - element.scrollTop + element.clientTop)
    element = element.offsetParent as HTMLElement
  }
  return { x: xPosition, y: yPosition }
}
