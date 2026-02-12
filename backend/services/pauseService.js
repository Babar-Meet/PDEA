const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '../public');
const pausedDownloadsPath = path.join(publicDir, 'paused_downloads.json');

class PauseService {
  constructor() {
    this.ensureFileExists();
  }

  ensureFileExists() {
    try {
      if (!fs.existsSync(pausedDownloadsPath)) {
        fs.writeFileSync(pausedDownloadsPath, JSON.stringify([], null, 2));
      }
    } catch (e) {
      console.error('Failed to create paused downloads file:', e);
    }
  }

  getPausedDownloads() {
    try {
      if (fs.existsSync(pausedDownloadsPath)) {
        const data = fs.readFileSync(pausedDownloadsPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to read paused downloads:', e);
    }
    return [];
  }

  savePausedDownload(downloadInfo) {
    try {
      const paused = this.getPausedDownloads();
      
      // Check if already exists
      const existingIndex = paused.findIndex(p => p.url === downloadInfo.url && p.saveDir === downloadInfo.saveDir);
      
      if (existingIndex !== -1) {
        // Update existing
        paused[existingIndex] = { ...paused[existingIndex], ...downloadInfo, updatedAt: new Date().toISOString() };
      } else {
        // Add new
        paused.push({
          ...downloadInfo,
          pausedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      fs.writeFileSync(pausedDownloadsPath, JSON.stringify(paused, null, 2));
      return true;
    } catch (e) {
      console.error('Failed to save paused download:', e);
      return false;
    }
  }

  removePausedDownload(url, saveDir) {
    try {
      let paused = this.getPausedDownloads();
      paused = paused.filter(p => !(p.url === url && p.saveDir === saveDir));
      fs.writeFileSync(pausedDownloadsPath, JSON.stringify(paused, null, 2));
      return true;
    } catch (e) {
      console.error('Failed to remove paused download:', e);
      return false;
    }
  }

  getPausedDownload(url, saveDir) {
    try {
      const paused = this.getPausedDownloads();
      return paused.find(p => p.url === url && p.saveDir === saveDir);
    } catch (e) {
      console.error('Failed to get paused download:', e);
      return null;
    }
  }

  clearAllPaused() {
    try {
      fs.writeFileSync(pausedDownloadsPath, JSON.stringify([], null, 2));
      return true;
    } catch (e) {
      console.error('Failed to clear paused downloads:', e);
      return false;
    }
  }
}

module.exports = new PauseService();
