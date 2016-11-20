import { BrowserWindow, screen } from "electron";
import * as url from "url";

export default class Application {
  private mainWindow: Electron.BrowserWindow;

  public run() {
    let { height, width } = screen.getPrimaryDisplay().workAreaSize;
    this.mainWindow = new BrowserWindow({
      height,
      width: width / 3,
      x: width / 3 * 2,
      y: 0,
    });

    this.loadFileUrl(
      this.mainWindow,
      { route: "/main" }
    );
  }

  private loadFileUrl(wnd: Electron.BrowserWindow, params?: { route: string }, pathname?: string) {
    if (!pathname) {
      let htmlFile = process.env.HOT ? `index-hot.html` : `index.html`;
      pathname = `${process.cwd()}/static/${htmlFile}`;
    }

    let targetUrl = url.format({
      protocol: "file",
      pathname,
      query: { windowParams: JSON.stringify(params) },
      slashes: true,
    });

    wnd.loadURL(targetUrl);
  }

}
