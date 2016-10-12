import Application from "./application";
import { app } from "electron";

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("ready", () => {
  const application = new Application();
  application.run();
});
