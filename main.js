const { app, BrowserWindow, Menu, ipcMain, Tray } = require("electron");
const path = require("path");
const express = require("express");
const cors = require("cors");
const proxy = require("http-proxy-middleware").createProxyMiddleware;

Menu.setApplicationMenu(null);
let serverInstance;

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 300,
    height: 200,
    show: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    frame: false,
  });

  win.loadFile("index.html");

  win.once("ready-to-show", () => {
    win.show();

    const server = express();
    server.use(cors());
    server.use(
      "/",
      proxy(`/productScan`, { target: `http://localhost:55555/productScan` })
    );
    serverInstance = server.listen(3000, () => {
      win.webContents.send("ready", 0);
    });
  });

  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
  } else {
    app.on("second-instance", (event, commandLine, workingDirectory) => {
      // 当运行第二个实例时,将会聚焦到mainWindow这个窗口
      if (win) {
        win.focus();
        win.show();
      }
    });
  }

  ipcMain.on("hide", () => {
    win.hide();
  });

  const tray = new Tray(path.resolve(__dirname, "./favicon.ico"));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "打开",
      click: () => {
        win.show();
      },
    },
    {
      label: "关闭",
      click: () => {
        serverInstance.close();
        app.quit();
      },
    },
  ]);
  tray.setToolTip("proxy server");
  tray.setContextMenu(contextMenu);
  tray.addListener("double-click", () => {
    win.show();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
