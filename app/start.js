const {app, BrowserWindow} = require('electron')

app.on('ready', () => {
  let win = new BrowserWindow({width: 800, height: 600})
  win.loadURL(`file://${__dirname}/app/index.html`)
})
