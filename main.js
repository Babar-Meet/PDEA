const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false, // Critical for background downloads
      webSecurity: false // Allow local resources
    },
    autoHideMenuBar: true,
    title: "YT Local Desktop"
  });

  // Load the app
  // In production, this would be a file URL. In dev, it's localhost.
  // In production, this points to the backend server which serves the frontend
  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5000';
  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.setJumpList(null); // Fix for Windows Jump List error

app.on('ready', () => {
    // Set up session permissions for downloads if needed
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5000 ws://localhost:5173 http://localhost:5173 data: blob: filesystem:"]
            }
        });
    });

    createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
