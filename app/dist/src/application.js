"use strict";
const electron_1 = require("electron");
const url = require("url");
class Application {
    run() {
        let { height, width } = electron_1.screen.getPrimaryDisplay().workAreaSize;
        this.mainWindow = new electron_1.BrowserWindow({
            height,
            width: width / 3,
            x: width / 3 * 2,
            y: 0,
        });
        this.loadFileUrl(this.mainWindow, { route: "/main" });
    }
    loadFileUrl(wnd, params, pathname) {
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Application;
//# sourceMappingURL=application.js.map