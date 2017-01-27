import { assert, expect } from "chai"

export default function deepCover(actual: any, expected: any, message: string = "__root__") {
  let errors: Error[] = []
  if (typeof expected === "object" && !Array.isArray(expected)) {
    expect(typeof actual).to.be.equal("object")
    for (let key in expected) {
      if (expected.hasOwnProperty(key)) {
        try {
          deepCover(actual[key], expected[key], message + `[${key}]`)
        } catch (e) {
          errors.push(e)
        }
      }
    }
    if (errors.length) {
      assert.fail(actual, expected, errors.join("\n"))
    }
  } else if (typeof expected === "object") {
    expect(actual).to.be.instanceof(Array)
    expected.forEach((e: any, index: number) => {
      try {
        deepCover(actual[index], e, message + `[${index}]`)
      } catch (e) {
        errors.push(e)
      }
    })
    if (errors.length) {
      assert.fail(actual, expected, errors.join("\n"))
    }
  } else {
    assert.equal(actual, expected, message)
  }
}

// add Chai language chain method
// chaiUse((chai, utils) => {
//   chai.Assertion.overwriteMethod('include', function(__super: any) {

//     return function (expected: any) {
//       let actual = this._obj;

//       let match = (actual: any, expected: any) => {
//         if (typeof expected === "object" && !Array.isArray(expected)) {
//           this.expect(typeof actual).to.be.equal("object")
//           for (let key in expected) {
//             match(actual[key], expected[key])
//           }
//         }
//         else if(typeof expected === "object") {
//           this.expect(actual).to.be.instanceof(Array)
//           expected.forEach((e: any, index: number) => match(e, actual[index]))
//         }
//         else {
//           this.expect(actual).to.be.equal(expected)
//         }
//       }

//       // // first, our instanceof check, shortcut
//       // new Assertion(this._obj).to.be.instanceof(Model);

//       // // second, our type check
//       // this.assert(
//       //     obj._type === type
//       //   , "expected #{this} to be of type #{exp} but got #{act}"
//       //   , "expected #{this} to not be of type #{act}"
//       //   , type        // expected
//       //   , obj._type   // actual
//       // );
//     };
//   })
// });
