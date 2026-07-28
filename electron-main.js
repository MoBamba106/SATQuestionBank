/**
 * SAT Nexus – Electron shell.
 *
 * Dev:  spawns `next dev` and opens the window.
 * Prod: runs the Next.js standalone server from .next/standalone, then opens
 *       a frameless-menu window pointed at localhost.
 */
const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn } = require("child_process");

const isDev = !app.isPackaged;
const PORT = Number(process.env.SAT_NEXUS_PORT || 4310);
let nextProcess = null;
let mainWindow = null;

function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http
        .get(url, (res) => {
          res.resume();
          resolve(true);
        })
        .on("error", () => {
          if (Date.now() - start > timeoutMs) {
            reject(new Error(`Server did not start within ${timeoutMs}ms: ${url}`));
            return;
          }
          setTimeout(check, 400);
        });
    };
    check();
  });
}

function resolveIcon() {
  const candidates = [
    path.join(__dirname, "src-tauri", "icons", "icon.ico"),
    path.join(__dirname, "src-tauri", "icons", "icon.png"),
    path.join(process.resourcesPath || "", "icon.ico"),
    path.join(process.resourcesPath || "", "icon.png"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#eadcc7",
    icon: resolveIcon(),
    title: "SAT Nexus",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  mainWindow.setMenuBarVisibility(false);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function spawnDevServer() {
  const npmCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  return spawn(npmCmd, ["next", "dev", "-p", String(PORT), "-H", "127.0.0.1"], {
    cwd: __dirname,
    shell: true,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "development",
      PORT: String(PORT),
      DATABASE_MODE: process.env.DATABASE_MODE || "embedded",
    },
  });
}

function spawnProdServer() {
  // electron-builder copies .next/standalone next to resources/app.asar.unpacked
  // or resources/standalone depending on config. Prefer unpacked app root.
  const resources = process.resourcesPath || __dirname;
  const candidates = [
    path.join(resources, "standalone", "server.js"),
    path.join(resources, "app.asar.unpacked", "standalone", "server.js"),
    path.join(resources, "app", "standalone", "server.js"),
    path.join(__dirname, ".next", "standalone", "server.js"),
    path.join(__dirname, "standalone", "server.js"),
  ];
  const serverJs = candidates.find((candidate) => fs.existsSync(candidate));
  if (!serverJs) {
    throw new Error(
      "Could not find Next standalone server.js. Rebuild with `npm run app:build`.",
    );
  }

  const serverDir = path.dirname(serverJs);

  // Data dir for PGlite — writable userData folder, not Program Files.
  const dataDir = path.join(app.getPath("userData"), "sat-nexus-db");
  fs.mkdirSync(dataDir, { recursive: true });

  // Use Electron's own binary as Node so users don't need Node on PATH.
  return spawn(process.execPath, [serverJs], {
    cwd: serverDir,
    shell: false,
    stdio: "ignore",
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
      DATABASE_MODE: "embedded",
      SAT_NEXUS_DATA_DIR: dataDir,
    },
    windowsHide: true,
  });
}

function stopServer() {
  if (!nextProcess) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(nextProcess.pid), "/f", "/t"], {
        shell: true,
        stdio: "ignore",
        windowsHide: true,
      });
    } else {
      nextProcess.kill("SIGTERM");
    }
  } catch {
    /* ignore */
  }
  nextProcess = null;
}

app.whenReady().then(async () => {
  try {
    nextProcess = isDev ? spawnDevServer() : spawnProdServer();
    nextProcess.on("exit", (code) => {
      if (code && code !== 0) {
        console.error("Next server exited with code", code);
      }
    });
    await waitForServer(`http://127.0.0.1:${PORT}`, isDev ? 90000 : 60000);
    createWindow();
  } catch (error) {
    console.error("Failed to start SAT Nexus:", error);
    stopServer();
    app.quit();
  }
});

app.on("window-all-closed", () => {
  stopServer();
  app.quit();
});

app.on("before-quit", () => {
  stopServer();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
