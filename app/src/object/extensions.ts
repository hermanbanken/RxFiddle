///<reference path="extensions.d.ts"/>

Object.values = function objectValues(obj: any) {
  let values: any[] = []
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      values.push(obj[key])
    }
  }
  return values
}
