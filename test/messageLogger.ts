import Logger from "../src/collector/logger"

export class MessageLogger extends Logger {
  public messages: any = []
  constructor() {
    super((m: any) => this.messages.push(m))
    if (typeof window !== "undefined") {
      this.messages = (window as any).messages = []
    }
  }
}
