import { personal, uid, signin } from "./firebase"
import { database } from "firebase"
import { Subscriber, Observable } from "rxjs"

signin()

let queue = [] as any[]
let snapshot: database.DataSnapshot
uid().switchMap(u => u === null ? Observable.empty<database.DataSnapshot>() : personal("logs"))
  .subscribe(snap => {
    snapshot = snap
    queue.splice(0, queue.length).forEach(m => snap.ref.push().set(m))
  })

let AnalyticsObserver: Subscriber<any> = Subscriber.create(
  (m) => {
    let message = { event: JSON.stringify(m), t: Date.now() }
    if (snapshot) { snapshot.ref.push().set(message) } else { queue.push(message) }
  }
)

export default AnalyticsObserver
