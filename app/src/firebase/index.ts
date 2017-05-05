import * as firebase from "firebase/app"
import "firebase/auth"
import "firebase/database"
import * as Rx from "rxjs"

const config = {
  apiKey: "AIzaSyBLIwYr5nDxSHhdmz-rvSln88RQHMRWHds",
  authDomain: "rxfiddle.firebaseapp.com",
  databaseURL: "https://rxfiddle.firebaseio.com",
  messagingSenderId: "412806914076",
  projectId: "rxfiddle",
  storageBucket: "rxfiddle.appspot.com",
}

export function init() {
  firebase.initializeApp(config)
}

/**
 * Sign in.
 * Any Error's contain .code and .message fields
 */
export function signin(): Rx.Observable<any> {
  return new Rx.Observable<any>((o: Rx.Observer<any>) => firebase.auth().onAuthStateChanged(
      o.next.bind(o),
      o.error.bind(o),
      o.complete.bind(o)
    ))
    .take(1)
    .flatMap(state => state === null ? Rx.Observable.from<void>(firebase.auth().signInAnonymously()) : Rx.Observable.empty<any>())
    .do<void>((s: any) => console.log("auth", s), (e: Error) => console.log("auth error", e))
}

/**
 * Sign in.
 * Any Error's contain .code and .message fields
 */
export function data(ref: string): Rx.Observable<firebase.database.DataSnapshot> {
  let location = firebase.database().ref(ref)
  return Rx.Observable.fromEventPattern<firebase.database.DataSnapshot>(
    h => location.on("value", h as any),
    h => location.off("value", h as any)
  )
}

export function user(): Rx.Observable<any> {
  return new Rx.Observable(o => firebase.auth().onAuthStateChanged(
      o.next.bind(o),
      o.error.bind(o),
      o.complete.bind(o)
    ))
    .startWith(firebase.auth().currentUser)
}
export function uid(): Rx.Observable<string> {
  return user().map((_: any) => _ && _.uid)
}

function userSnippetsById(uid: string): Rx.Observable<SnippetDict> {
  if (!uid) { return Rx.Observable.of({} as SnippetDict) }
  return data(`users/${uid}/snippets`).map(_ => _.val() as SnippetDict)
}

export let snippets: { latest: () => Rx.Observable<SnippetDict>,  user: () => Rx.Observable<SnippetDict>} = {
  latest: () => data("snippets").map(_ => _.val() as SnippetDict),
  user: () => uid().switchMap(userSnippetsById),
}

export function personal(ref: string): Rx.Observable<firebase.database.DataSnapshot> {
  return uid().switchMap(uid => data(`users/${uid}/${ref}`))
}

init()

export type SnippetDict = { [key: string]: Snippet }
export interface Snippet {
  name: string
  code: string
  description: string
  uid: string
}
