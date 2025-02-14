import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  session,
  net,
  protocol,
} from "electron";
import { join } from "path";
import { electronApp, is } from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";
import url from "url";
import os from "os";
import path from "node:path";

export const OPERATING_SYSTEM = os.platform();
export const isWindows = OPERATING_SYSTEM === "win32";
electronApp.setAppUserModelId("local.electron.clerk");

let _token = null;

const windows: typeof global.windows = {
  auth: null,
  main: null,
};

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("clerk", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else if (!app.isDefaultProtocolClient("clerk")) {
  // Define custom protocol handler. Deep linking works on packaged versions of the application!
  app.setAsDefaultProtocolClient("clerk");
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: "clerk",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
    },
  },
]);

const createWindow = async () => {
  if (windows.main) return windows.main;

  const partition = "persist:clerk";
  const ses = session.fromPartition(partition);

  ses.protocol.handle("clerk", (request: Request) => {
    const sym = Object.getOwnPropertySymbols(request).find(
      (s) => s.description === "state",
    );
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (decodeURI(request[sym].url.pathname).match("favicon.ico")) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return net.fetch(
        url
          .pathToFileURL(path.join(__dirname, "resources", "favicon.ico"))
          .toString(),
      );
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return net.fetch(
      url.pathToFileURL(decodeURI(request[sym].url.pathname)).toString(),
    );
  });

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: true,
    autoHideMenuBar: true,
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      devTools: true,
      session,
      partition,
    },
  });

  windows.main = mainWindow;

  mainWindow.on("close", () => {
    app.quit();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  let urlPath = __dirname;
  if (isWindows) {
    if (urlPath.indexOf(":/")) {
      urlPath = urlPath.slice(3);
    }
  }
  const hostPath = "../renderer";

  // and load the index.html of the app.
  const uiSource = new URL(
    path.join(urlPath, hostPath, "index.html"),
    `${import.meta.env.VITE_DOMAIN}`,
  );
  void mainWindow.loadURL(
    is.dev ? `${process.env.ELECTRON_RENDERER_URL}` : uiSource.toString(),
  );
  mainWindow.webContents.openDevTools();
  const filter = {
    urls: [
      `https://${import.meta.env.VITE_CLERK_DOMAIN}/*`,
      `https://${import.meta.env.VITE_CLERK_DEV_DOMAIN}/*`,
    ],
  };

  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    filter,
    (details, callback) => {
      if (details.requestHeaders.Origin === import.meta.env.VITE_DOMAIN) {
        details.requestHeaders.Origin = import.meta.env.VITE_APP_DOMAIN;
      }
      if (details.requestHeaders.authorization) {
        delete details.requestHeaders.Origin;
      }
      callback({ requestHeaders: details.requestHeaders });
    },
  );

  mainWindow.webContents.session.webRequest.onHeadersReceived(
    filter,
    (details, callback) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      details.responseHeaders["access-control-allow-origin"] = import.meta.env.VITE_DOMAIN;

      if (details.responseHeaders?.location) {
        details.responseHeaders.location = [`${uiSource}#/sso-callback`];
      }

      callback({ responseHeaders: details.responseHeaders });
    },
  );

  const clerkTokenFilter = {
    urls: [
      `https://${import.meta.env.VITE_CLERK_DOMAIN}/v1/client/session/*`,
      "https://*.clerk.accounts.dev/v1/client/sessions/*",
    ],
  };

  // quick and easy way to know when clerk has made a call to get a fresh token
  mainWindow.webContents.session.webRequest.onCompleted(
    clerkTokenFilter,
    () => {
      mainWindow.webContents.send("auth:token");
    },
  );

  mainWindow.webContents.on("will-navigate", (e, reqUrl) => {
    // make sure local urls stay in electron perimeter
    const getHost = (u: string) => new URL(u).host;
    const reqHost = getHost(reqUrl);
    const isExternal =
      reqHost && reqHost !== getHost(mainWindow.webContents.getURL());
    if (isExternal) {
      e.preventDefault();
      shell.openExternal(reqUrl);
    }
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows

  await createWindow();
});

app.on("second-instance", (_event, argv) => {
  // Print out data received from the second instance.
  const link = argv[argv.length - 1];

  if (link?.indexOf("sso-callback") !== -1) {
    windows.auth?.close();
    windows.auth = null;
    // --allow-file-access-from-files,
    windows.main?.webContents.send("auth:callback", link);
  } else if (link) {
    windows.main?.webContents.send("deeplink:url", link);
  }

  // Someone tried to run a second instance, we should focus our window.
  if (windows?.main) {
    if (windows.main.isMinimized()) windows.main.restore();
    if (!windows.main.isVisible()) {
      windows.main.show();
    }
    windows.main.focus();
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

const createAuthWindow = (authenticationUrl: string) => {
  destroyAuthWin();

  windows.auth = new BrowserWindow({
    width: 1000,
    height: 600,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
    },
  });

  const {
    session: { webRequest },
  } = windows.auth.webContents;

  const filter = {
    urls: [`${import.meta.env.VITE_HTTPS_DOMAIN}/*`],
  };

  webRequest.onBeforeRequest(filter, async (details, callback) => {
    try {
      callback({
        redirectURL: details.url.replace("http", "clerk"),
      });
      // destroyAuthWin();
    } catch (error) {
      console.error("Error handling redirect:", error);
      // Always provide a fallback
      callback({});
    }
  });

  windows.auth.loadURL(authenticationUrl);
  // Open the DevTools.
  windows.auth.webContents.openDevTools();

  windows.auth.on("closed", () => {
    windows.auth = null;
  });
};

function destroyAuthWin() {
  if (!windows.auth) return;
  windows.auth.close();
  windows.auth = null;
}

// IPCmain stuff

ipcMain.on("auth:open", (_event, authenticationUrl) => {
  createAuthWindow(authenticationUrl);
});

ipcMain.on("auth:token", (_event, token, key) => {
  _token = token;
});

ipcMain.handle("auth:token:get", async (_event, key) => {
  return _token;
});

ipcMain.on("auth:logout", () => {
  _token = null;
});
