const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class DownloadManager {
  constructor() {
    this.downloads = new Map();
    this.processes = new Map();
    this.wsClients = new Set();
  }

  registerWSClient(ws) {
    this.wsClients.add(ws);
    ws.on('close', () => {
      this.wsClients.delete(ws);
    });
  }

  broadcastProgress(downloadId, progressData) {
    const message = JSON.stringify({
      type: 'progress',
      downloadId,
      ...progressData
    });

    this.wsClients.forEach(client => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  }

  registerDownload(downloadId, metadata) {
    this.downloads.set(downloadId, {
      id: downloadId,
      status: 'starting',
      progress: 0,
      speed: '0',
      eta: '0',
      ...metadata,
      timestamp: new Date().toISOString()
    });
    this.broadcastProgress(downloadId, this.downloads.get(downloadId));
  }

  registerProcess(downloadId, childProcess, filePath) {
    this.processes.set(downloadId, {
      process: childProcess,
      filePath,
      cancelled: false
    });
  }

  updateProgress(downloadId, updates) {
    const download = this.downloads.get(downloadId);
    if (!download) return;

    Object.assign(download, updates);
    this.downloads.set(downloadId, download);
    this.broadcastProgress(downloadId, download);
  }

  getDownload(downloadId) {
    return this.downloads.get(downloadId);
  }

  getAllDownloads() {
    return Array.from(this.downloads.values()).sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }

  cancelDownload(downloadId) {
    const processData = this.processes.get(downloadId);
    if (!processData) return false;

    processData.cancelled = true;
    
    if (processData.process && !processData.process.killed) {
      try {
        processData.process.kill('SIGTERM');
        setTimeout(() => {
          if (!processData.process.killed) {
            processData.process.kill('SIGKILL');
          }
        }, 3000);
      } catch (err) {
        console.error('Error killing process:', err);
      }
    }

    this.updateProgress(downloadId, {
      status: 'cancelled',
      error: 'Download cancelled by user'
    });

    this.cleanupFiles(processData.filePath);
    this.processes.delete(downloadId);

    return true;
  }

  cleanupFiles(basePath) {
    if (!basePath) return;

    const extensions = ['.part', '.temp', '.tmp', '.ytdl', '.f*'];
    const dir = path.dirname(basePath);
    const basename = path.basename(basePath, path.extname(basePath));

    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          if (file.includes(basename) && (
            file.endsWith('.part') ||
            file.endsWith('.temp') ||
            file.endsWith('.tmp') ||
            file.endsWith('.ytdl') ||
            /\.f\d+/.test(file)
          )) {
            const fullPath = path.join(dir, file);
            try {
              fs.unlinkSync(fullPath);
              console.log('Cleaned up:', fullPath);
            } catch (e) {
              console.error('Failed to delete:', fullPath, e);
            }
          }
        });
      }
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  }

  completeDownload(downloadId, success, error = null) {
    const processData = this.processes.get(downloadId);
    
    if (processData && processData.cancelled) {
      return;
    }

    if (success) {
      this.updateProgress(downloadId, {
        status: 'finished',
        progress: 100
      });
    } else if (!processData?.cancelled) {
      this.updateProgress(downloadId, {
        status: 'error',
        error: error || 'Unknown error'
      });
    }

    this.processes.delete(downloadId);
  }
}

module.exports = new DownloadManager();
