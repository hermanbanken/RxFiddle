/* tslint:disable */
module rx {
  interface ObservableStatic {
    prototype: any;
  }
}

interface ObservableStatic {
  prototype: any;
}

interface Object {
  getName(): string;
}
/* tslint:enable */

function getName() {
  let funcNameRegex = /function (.{1,})\(/;
  let results = (funcNameRegex).exec((this).constructor.toString());
  return (results && results.length > 1) ? results[1] : "";
}
Object.prototype.getName = getName;
