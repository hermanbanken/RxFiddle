import Logger from "../app/src/collector/logger"
import { TreeCollector } from "../app/src/instrumentation/rxjs-5.x.x/collector"
import Instrumentation from "../app/src/instrumentation/rxjs-5.x.x/instrumentation"
import * as WebSocketType from "ws"

// Optional ws import
const WebSocket: typeof WebSocketType = (() => { try { return require("ws") } catch(e) { } })()

// Unused, but will support multi-version instrumention in the future maybe
// interface RxFiddleOptions {
//   version?: 4 | 5 // default "detects"
//   targets?: any[] // default "all available"
//   serve?: { port: number, networkInterface?: string } // default off
// }

export type TeardownLogic = Function
export type OnNext = (m: any) => void
export type PartialObserver = OnNext | { next: OnNext } | { onNext: OnNext }

export default class RxFiddle {

  constructor(private targets: { [name: string]: any } = {}) {
    if("Rx" in targets) {
      Object.assign(targets, {
        Observable: targets.Rx.Observable,
        Subscriber: targets.Rx.Subscriber,
      })
    }
    Object.keys(targets).forEach(name => {
      if(
        (name === "Observable" || name === "Subscriber") &&
        Object.keys(targets).map(name => targets[name]).indexOf(targets[name].prototype) < 0
      ) {
        targets[name + "Proto"] = targets[name].prototype
      }
    })
    this.targets = targets
  }

  /**
   * Setup instrumentation and forward all messages to the provided Observer
   * @param observer 
   */
  public subscribe(observer: PartialObserver): TeardownLogic {
    let next: OnNext = typeof observer === "function" ? observer : () => { /* */ }
    if (typeof observer === "object") {
      next = ((observer as any).next || (observer as any).onNext).bind(observer)
    }
    let logger = new Logger(m => next(m))
    return this.instrumentRx5(logger)
  }

  /**
   * Auto detect the environment
   * @param param Optional, options to pass to openWindow or serve.
   */
  public auto(options?: any): TeardownLogic {
    if(typeof process === "object") {
      console.log("RxFiddle detected Node.")
      return this.serve(options)
    } else if(typeof window !== "object") {
      console.log("RxFiddle detected a web browser.")
      return this.openWindow(options)
    } else {
      console.log("RxFiddle could not detect the JavaScript environment. Please use either RxFiddle.serve or RxFiddle.openWindow.")
    }
  }

  /**
   * Setup instrumentation and open a window, publish all messages there
   * @param param Optional, specify which RxFiddle instance to use. Defaults to rxfiddle.net,
   *              but you can also run your own RxFiddle on your own localhost.
   */
  public openWindow({ address, origin }: { address?: string, origin?: string }) {
    if(typeof window !== "object") {
      if(typeof process === "object") {
        console.warn("To use RxFiddle.openWindow, you need to run your app in the web browser. Consider using RxFiddle.serve since you're running in NodeJS.")
      } else {
        console.warn("To use RxFiddle.openWindow, you need to run your app in the web browser.")
      }
    }
    if(!address) {
      address = `https://rxfiddle.net/#type=postMessage`
      origin = "https://rxfiddle.net"
    }
    let w = window.open(address, '_blank', 'toolbar=0,location=0,menubar=0')
    window.addEventListener("unload", () => !w.closed && w.close())

    let first = true
    let replayQueue = [] as any[]
    let interval = setInterval(() => w.postMessage({ type: "ping" }, origin), 100)

    function ready() {
      clearInterval(interval)
      window.removeEventListener("message", detectPong)
      replayQueue.forEach(m => w.postMessage(m, origin))
      replayQueue = null
    }
    let detectPong = (m: MessageEvent) => { m.origin === origin && "pong" === m.data.type && ready() }
    window.addEventListener("message", detectPong)

    let teardown = this.subscribe((m: any) => {
      if(first) {
        console.log("RxFiddle detected Observables and now publishes the data.")
        first = false
      }
      if(replayQueue === null) {
        w.postMessage(m, origin)
      } else {
        replayQueue.push(m)
      }
    })
    return () => {
      teardown()
      !w.closed && w.close()
    }
  }

  /**
   * Setup instrumentation and a WebSocketServer and publish all messages there
   * @param param Specify a port
   */
  public serve({ port }: { port?: number, networkInterface?: string }): TeardownLogic {
    if(!WebSocket) {
      console.warn("To use RxFiddle.serve, install the websocket library ws using:\n  npm i ws")
      return () => {}
    }
    if(!port) {
      port = 8080
    }
    let replayQueue = [] as any[]
    let wss = new WebSocket.Server({ perMessageDeflate: false, port })
    console.log(`RxFiddle server is serving at port ${port}. Surf to https://rxfiddle.net/#type=ws&url=ws://127.0.0.1:${port}.`)

    let first = true

    // Subscribe and send to all clients
    let teardown = this.subscribe((m: any) => {
      if(first) {
        console.log("RxFiddle detected Observables and now publishes the data.")
        first = false
      }
      let json = JSON.stringify(m)
      wss.clients.forEach(ws => ws.send(json))
      replayQueue.push(json)
    })

    // Replay for new connections
    wss.on("connection", (ws) => {
      console.log("RxFiddle client connected.")
      ws.send(`{ "version": "1.0.0" }`)
      replayQueue.forEach(m => ws.send(m))
    })

    // Cleanup
    return () => {
      teardown()
      wss.close((err) => console.warn("Error while closing RxFiddle WebSocket server.", err))
    }
  }

  private instrumentRx5(logger: Logger): TeardownLogic {
    // Attach intrumentation
    let instrumentation = new Instrumentation(new TreeCollector(logger))
    instrumentation.setup()
    Object.keys(this.targets).forEach(name =>
      instrumentation.setup(this.targets[name], name)
    )
    return instrumentation.teardown
  }

}
