import { signin, uid } from "./firebase"
import { database } from "firebase"
import { Observer } from "rxjs"

signin()

let queue = [] as any[]
let snapshot: database.Reference
uid().filter(u => u !== null).map(u => database().ref(`users/${u}/logs`))
  .subscribe(ref => {
    snapshot = ref
    queue.splice(0, queue.length).forEach(m => ref.push().set(m))
  })

let AnalyticsObserver: Observer<any> = {
  next(m) {
    let message = { event: JSON.stringify(m), t: Date.now() }
    if (snapshot) { snapshot.ref.push().set(message) } else { queue.push(message) }
  },
  error(e) {
    let message = { event: JSON.stringify({ type: "error", m: e }), t: Date.now() }
    if (snapshot) { snapshot.ref.push().set(message) } else { queue.push(message) }
  },
  complete() {
    let message = { event: JSON.stringify({ type: "complete" }), t: Date.now() }
    if (snapshot) { snapshot.ref.push().set(message) } else { queue.push(message) }
  },
}

export default AnalyticsObserver
