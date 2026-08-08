/**
 * Fintr Desktop — Electron Main Process
 * 
 * Flow:
 * 1. App starts → show "Starting up..." loading screen
 * 2. Start Python/FastAPI backend on port 8765
 * 3. Wait for backend to be ready (ping /api/)
 * 4. Close loading screen → open full app window
 * 5. On close → kill backend process
 */

const { app, BrowserWindow, shell, Menu, dialog } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");
const fs = require("fs");

const PORT = 8765;
const APP_URL = `http://127.0.0.1:${PORT}`;

let mainWindow = null;
let loadingWindow = null;
let backendProcess = null;

// ── Loading screen ────────────────────────────────────────────────────────────

function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 400,
    height: 280,
    frame: false,
    resizable: false,
    center: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  loadingWindow.loadURL(
    `data:text/html,
    <html>
    <body style="
      background: #002FA7;
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      font-family: system-ui, -apple-system, sans-serif;
      user-select: none;
    ">
      <div style="font-size: 36px; font-weight: 900; letter-spacing: -1px; margin-bottom: 8px;">
        Fintr
      </div>
      <div style="font-size: 13px; opacity: 0.7; margin-bottom: 40px;">
        Business Management Software
      </div>
      <div style="
        width: 200px;
        height: 3px;
        background: rgba(255,255,255,0.2);
        border-radius: 2px;
        overflow: hidden;
      ">
        <div id="bar" style="
          height: 100%;
          width: 0%;
          background: white;
          border-radius: 2px;
          animation: load 2s ease-in-out infinite;
        "></div>
      </div>
      <div style="font-size: 12px; opacity: 0.5; margin-top: 20px;">
        Starting up...
      </div>
      <style>
        @keyframes load {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
      </style>
    </body>
    </html>`
  );
}

// ── Main app window ───────────────────────────────────────────────────────────

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Fintr",
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Set app menu
  const menuTemplate = [
    {
      label: "Fintr",
      submenu: [
        { label: "About Fintr", click: () => {
          dialog.showMessageBox(mainWindow, {
            title: "Fintr",
            message: "Fintr v1.0.0",
            detail: "Business Management Software\nWorks completely offline.\nYour data stays on your computer.",
            type: "info",
          });
        }},
        { type: "separator" },
        { label: "Quit", accelerator: "CmdOrCtrl+Q", click: () => app.quit() },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Reload", accelerator: "CmdOrCtrl+R", click: () => mainWindow.reload() },
        { type: "separator" },
        { label: "Zoom In", accelerator: "CmdOrCtrl+=", click: () => mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 0.5) },
        { label: "Zoom Out", accelerator: "CmdOrCtrl+-", click: () => mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 0.5) },
        { label: "Reset Zoom", accelerator: "CmdOrCtrl+0", click: () => mainWindow.webContents.setZoomLevel(0) },
        { type: "separator" },
        { label: "Toggle Fullscreen", accelerator: "F11", click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
      ],
    },
    {
      label: "Data",
      submenu: [
        { label: "Open Data Folder", click: () => {
          const dataDir = path.dirname(
            process.env.DB_PATH || path.join(__dirname, "..", "backend", "fintr.db")
          );
          shell.openPath(dataDir);
        }},
        { label: "Backup Data", click: async () => {
          const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "backend", "fintr.db");
          const { filePath } = await dialog.showSaveDialog(mainWindow, {
            title: "Backup Fintr Data",
            defaultPath: `Fintr_Backup_${new Date().toISOString().slice(0,10)}.db`,
            filters: [{ name: "Database", extensions: ["db"] }],
          });
          if (filePath && fs.existsSync(dbPath)) {
            fs.copyFileSync(dbPath, filePath);
            dialog.showMessageBox(mainWindow, { message: "Backup saved successfully!", type: "info" });
          }
        }},
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  mainWindow.loadURL(APP_URL);

  mainWindow.once("ready-to-show", () => {
    if (loadingWindow) {
      loadingWindow.close();
      loadingWindow = null;
    }
    mainWindow.show();
  });

  // Open external links in browser, not Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
}

// ── Backend (FastAPI) ─────────────────────────────────────────────────────────

function findPython() {
  const candidates = process.platform === "win32"
    ? ["python", "python3", "py"]
    : ["python3", "python"];
  
  for (const cmd of candidates) {
    try {
      const { execSync } = require("child_process");
      execSync(`${cmd} --version`, { stdio: "ignore" });
      return cmd;
    } catch {}
  }
  return null;
}

function startBackend() {
  const isDev = !app.isPackaged;

  if (isDev) {
    // Development: run Python directly
    const python = findPython();
    if (!python) {
      dialog.showErrorBox(
        "Python Not Found",
        "Please install Python 3.8+ to run Fintr."
      );
      app.quit();
      return;
    }

    const backendDir = path.join(__dirname, "..", "backend");
    backendProcess = spawn(
      python,
      ["-m", "uvicorn", "server_offline:app", "--host", "127.0.0.1", "--port", String(PORT)],
      {
        cwd: backendDir,
        env: {
          ...process.env,
          DB_PATH: path.join(backendDir, "fintr.db"),
          JWT_SECRET: "fintr-offline-secret-key-change-in-production",
          ADMIN_EMAIL: "admin@fintr.local",
        },
      }
    );
  } else {
    // Production: run bundled executable
    const resourcesPath = process.resourcesPath;
    const exeName = process.platform === "win32" ? "fintr-server.exe" : "fintr-server";
    const serverPath = path.join(resourcesPath, "backend", exeName);
    const dbPath = path.join(app.getPath("userData"), "fintr.db");

    backendProcess = spawn(serverPath, [], {
      cwd: path.dirname(serverPath),
      env: {
        ...process.env,
        DB_PATH: dbPath,
        PORT: String(PORT),
        JWT_SECRET: "fintr-offline-secret-key",
        ADMIN_EMAIL: "admin@fintr.local",
      },
    });
  }

  backendProcess.stdout?.on("data", (d) => process.stdout.write(`[Backend] ${d}`));
  backendProcess.stderr?.on("data", (d) => process.stderr.write(`[Backend] ${d}`));
  backendProcess.on("error", (err) => {
    dialog.showErrorBox("Backend Error", `Failed to start Fintr server: ${err.message}`);
  });
}

function waitForBackend(onReady, retries = 60) {
  http.get(`${APP_URL}/api/`, (res) => {
    if (res.statusCode < 500) {
      onReady();
    } else {
      retry();
    }
  }).on("error", retry);

  function retry() {
    if (retries <= 0) {
      dialog.showErrorBox("Startup Failed", "Fintr could not start. Please restart the app.");
      app.quit();
      return;
    }
    setTimeout(() => waitForBackend(onReady, retries - 1), 500);
  }
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createLoadingWindow();
  startBackend();
  waitForBackend(() => {
    createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

app.on("before-quit", () => {
  if (backendProcess) {
    backendProcess.kill("SIGTERM");
  }
});
