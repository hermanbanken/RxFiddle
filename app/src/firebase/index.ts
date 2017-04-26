import * as firebase from "firebase/app"
import "firebase/auth"
import "firebase/database"
import { Observable } from "rxjs"

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
export function signin(): Observable<void> {
  return Observable.from(firebase.auth().signInAnonymously())
}

/**
 * Sign in.
 * Any Error's contain .code and .message fields
 */
export function data(ref: string): Observable<firebase.database.DataSnapshot> {
  let location = firebase.database().ref(ref)
  return Observable.fromEventPattern<firebase.database.DataSnapshot>(
    h => location.on("value", h as any),
    h => location.off("value", h as any)
  )
}

export function user() {
  return new Observable(o => firebase.auth().onAuthStateChanged(o.next.bind(o), o.error.bind(o), o.complete.bind(o)))
    // .do(console.log.bind(console, "user"), console.warn.bind(console, "user"), console.info.bind(console, "user"))
    .startWith(firebase.auth().currentUser)
  // .do(console.log.bind(console, "user"), console.warn.bind(console, "user"), console.info.bind(console, "user"))
}
export function uid() {
  return user().map((_: any) => _ && _.uid)
}

function userSnippetsById(uid: string) {
  if (!uid) { return Observable.of({} as SnippetDict) }
  return data(`users/${uid}/snippets`).map(_ => _.val() as SnippetDict)
}

export let snippets = {
  latest: () => data("snippets").map(_ => _.val() as SnippetDict),
  user: () => uid().switchMap(userSnippetsById),
}

init()

export type SnippetDict = { [key: string]: Snippet }
export interface Snippet {
  name: string
  code: string
  description: string
  uid: string
}
