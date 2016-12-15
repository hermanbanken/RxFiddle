///<reference path="extensions.d.ts"/>

Object.values = function objectValues(obj: any){
  let values: any[] = []
  for(let key in obj) {
    values.push(obj[key])
  }
  return values
}