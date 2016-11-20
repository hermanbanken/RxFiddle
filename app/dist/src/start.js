"use strict";
const application_1 = require("./application");
const electron_1 = require("electron");
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
electron_1.app.on("ready", () => {
    const application = new application_1.default();
    application.run();
});
//# sourceMappingURL=start.js.map