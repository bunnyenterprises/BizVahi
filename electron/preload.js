/**
 * Fintr Electron Preload Script
 * Runs in the renderer process before page loads.
 * Exposes safe APIs to the web app via contextBridge.
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("fintr", {
  // App info
  version: process.env.npm_package_version || "1.0.0",
  platform: process.platform,
  isDesktop: true,

  // Tell the web app it's running offline/desktop
  isOffline: true,
});
