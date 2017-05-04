/* FlatMap extension of Array prototype */
declare global {
  interface Array<T> {
    flatMap<R>(f: (t: T, index: number, all: T[]) => R[]): Array<R>
  }
}
export function flatMap<T, R>(f: (t: T, index: number, all: T[]) => R[]): R[] {
  return this.reduce((p: R[], n: T, index: number) => p.concat(f(n, index, this)), [])
}
Array.prototype.flatMap = flatMap

/* random */
export function endsWith(self: string, suffix: string): boolean {
  return self.indexOf(suffix, self.length - suffix.length) !== -1
}

export function last<T>(list: T[]): T {
  return list.length >= 1 ? list[list.length - 1] : undefined
}

export function head<T>(list: T[]): T {
  return list.length >= 1 ? list[0] : undefined
}

export function getPrototype(input: any): any {
  return input.protoype || input.__proto__
}
