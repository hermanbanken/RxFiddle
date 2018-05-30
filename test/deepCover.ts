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
