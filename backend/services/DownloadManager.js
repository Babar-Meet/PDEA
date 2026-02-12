const { spawn, exec, execSync } = require('child_process');
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
      cancelled: false,
      killed: false
    });
  }

  updateProgress(downloadId, updates) {
    const download = this.downloads.get(downloadId);
    if (!download) return;

    // Don't update progress if download was cancelled
    const processData = this.processes.get(downloadId);
    if (processData && processData.cancelled) {
      return;
    }

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

  /**
   * Forcefully kill a process by PID and also kill any yt-dlp processes
   */
  forceKillProcess(pid) {
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      try {
        execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
      } catch (e) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        } catch (e2) {
          // Ignore
        }
      }
      try {
        execSync(`taskkill /F /IM yt-dlp.exe`, { stdio: 'ignore' });
      } catch (e) {
        // No yt-dlp processes
      }
    } else {
      try {
        process.kill(-pid, 'SIGKILL');
      } catch (e) {
        // Ignore
      }
      try {
        process.kill(pid, 'SIGKILL');
      } catch (e) {
        // Ignore
      }
      try {
        execSync(`pkill -9 yt-dlp`, { stdio: 'ignore' });
      } catch (e) {
        // No yt-dlp processes
      }
    }
  }

  async cancelDownload(downloadId) {
    const processData = this.processes.get(downloadId);
    if (!processData) {
      // Check if download exists but no process running
      const download = this.downloads.get(downloadId);
      if (download) {
        this.updateProgress(downloadId, {
          status: 'cancelled',
          error: 'Download cancelled by user'
        });
      }
      return false;
    }

    // Immediately mark as cancelled to prevent any further progress updates
    processData.cancelled = true;
    
    const { process, filePath } = processData;
    const pid = process.pid;
    
    // Immediately remove from processes map so close handler knows it's cancelled
    this.processes.delete(downloadId);

    // Forcefully kill ONLY this specific process
    if (pid) {
      this.forceKillProcess(pid);
    } else {
      try {
        process.kill('SIGKILL');
      } catch (e) {
        // Ignore
      }
    }

    // Update status immediately to 'cancelled'
    this.updateProgress(downloadId, {
      status: 'cancelled',
      error: 'Download cancelled by user',
      progress: 0,
      speed: '0',
      eta: '0'
    });

    // Clean up all temporary files including thumbnails
    this.cleanupAllTempFiles(filePath, true);

    console.log(`Download cancelled: ${downloadId}`);
    return true;
  }

  /**
   * Pause a download by saving its info for later resume
   * Does NOT clean up temp files - they will be used for resume
   */
  async pauseDownload(downloadId) {
    const processData = this.processes.get(downloadId);
    if (!processData) {
      // Check if download exists but no process running
      const download = this.downloads.get(downloadId);
      if (download) {
        this.updateProgress(downloadId, {
          status: 'paused',
          error: 'Download paused by user'
        });
      }
      return false;
    }

    // Mark as paused to prevent any further progress updates
    processData.paused = true;
    
    const { process, filePath } = processData;
    const pid = process.pid;
    
    // Do NOT remove from processes map yet - the close handler needs to check paused flag
    // We will remove it after setting the paused flag

    // Forcefully kill the process (same as cancel)
    if (pid) {
      this.forceKillProcess(pid);
    } else {
      try {
        process.kill('SIGKILL');
      } catch (e) {
        // Ignore
      }
    }

    // Now remove from processes map after killing
    this.processes.delete(downloadId);

    // Get download info to save
    const download = this.downloads.get(downloadId);
    if (!download) {
      return false;
    }

    // Save paused download info to JSON file
    const publicDir = path.join(__dirname, '../public');
    const pausedDownloadsPath = path.join(publicDir, 'paused_downloads.json');
    
    let pausedDownloads = [];
    try {
      if (fs.existsSync(pausedDownloadsPath)) {
        const content = fs.readFileSync(pausedDownloadsPath, 'utf8');
        if (content.trim()) {
          pausedDownloads = JSON.parse(content);
        }
      }
    } catch (e) {
      console.error('Failed to read paused downloads:', e.message);
      pausedDownloads = [];
    }

    // Add this download to paused list
    const pausedInfo = {
      downloadId: downloadId,
      url: download.url,
      format_id: download.format_id,
      save_dir: download.saveDir,
      title: download.title,
      thumbnail: download.thumbnail,
      filename: download.filename,
      progress: download.progress,
      filePath: filePath,
      timestamp: new Date().toISOString()
    };

    // Remove any existing entry for this downloadId
    pausedDownloads = pausedDownloads.filter(d => d.downloadId !== downloadId);
    pausedDownloads.push(pausedInfo);
    
    try {
      fs.writeFileSync(pausedDownloadsPath, JSON.stringify(pausedDownloads, null, 2));
    } catch (e) {
      console.error('Failed to save paused download info:', e);
    }

    // Update status to 'paused' - do NOT clean up temp files!
    this.updateProgress(downloadId, {
      status: 'paused',
      error: 'Download paused by user',
      speed: '0',
      eta: '0'
    });

    console.log(`Download paused: ${downloadId}`);
    return true;
  }

  /**
   * Resume a paused download
   */
  async resumeDownload(downloadId) {
    const publicDir = path.join(__dirname, '../public');
    const pausedDownloadsPath = path.join(publicDir, 'paused_downloads.json');
    
    let pausedDownloads = [];
    try {
      if (fs.existsSync(pausedDownloadsPath)) {
        const content = fs.readFileSync(pausedDownloadsPath, 'utf8');
        if (content.trim()) {
          pausedDownloads = JSON.parse(content);
        }
      }
    } catch (e) {
      console.error('Failed to read paused downloads:', e.message);
      pausedDownloads = [];
    }

    const pausedInfo = pausedDownloads.find(d => d.downloadId === downloadId);
    if (!pausedInfo) {
      console.log('No paused info found for:', downloadId);
      return false;
    }

    // Remove from paused list
    pausedDownloads = pausedDownloads.filter(d => d.downloadId !== downloadId);
    try {
      fs.writeFileSync(pausedDownloadsPath, JSON.stringify(pausedDownloads, null, 2));
    } catch (e) {
      console.error('Failed to update paused downloads:', e);
    }

    // Remove the old paused entry from downloads map
    this.downloads.delete(downloadId);

    // Start the download again - yt-dlp will resume from .part file automatically
    const downloadService = require('./downloadService');
    
    // Make sure format_id is valid
    const formatId = pausedInfo.format_id || 'best';
    
    try {
      const newDownloadId = downloadService.startDownload(
        pausedInfo.url,
        formatId,
        pausedInfo.save_dir,
        {
          title: pausedInfo.title,
          thumbnail: pausedInfo.thumbnail,
          filename: pausedInfo.filename
        }
      );
      
      console.log(`Download resuming: ${downloadId} -> ${newDownloadId}`);
      return true;
    } catch (e) {
      console.error('Failed to resume download:', e);
      // Restore the download entry as error
      this.updateProgress(downloadId, {
        status: 'error',
        error: 'Failed to resume download: ' + e.message
      });
      return false;
    }
  }

  /**
   * Pause all active downloads
   */
  pauseAllDownloads() {
    const activeDownloads = Array.from(this.downloads.values())
      .filter(d => ['downloading', 'starting', 'queued'].includes(d.status));
    
    const results = [];
    for (const download of activeDownloads) {
      results.push(this.pauseDownload(download.id));
    }
    
    return { success: true, pausedCount: activeDownloads.length };
  }

  /**
   * Resume all paused downloads
   */
  resumeAllDownloads() {
    const publicDir = path.join(__dirname, '../public');
    const pausedDownloadsPath = path.join(publicDir, 'paused_downloads.json');
    
    let pausedDownloads = [];
    try {
      if (fs.existsSync(pausedDownloadsPath)) {
        const content = fs.readFileSync(pausedDownloadsPath, 'utf8');
        if (content.trim()) {
          pausedDownloads = JSON.parse(content);
        }
      }
    } catch (e) {
      console.error('Failed to read paused downloads:', e.message);
      return { success: false, error: 'No paused downloads found' };
    }

    const downloadService = require('./downloadService');
    let resumedCount = 0;

    for (const pausedInfo of pausedDownloads) {
      // Remove from downloads map
      this.downloads.delete(pausedInfo.downloadId);
      
      // Make sure format_id is valid
      const formatId = pausedInfo.format_id || 'best';
      
      try {
        downloadService.startDownload(
          pausedInfo.url,
          formatId,
          pausedInfo.save_dir,
          {
            title: pausedInfo.title,
            thumbnail: pausedInfo.thumbnail,
            filename: pausedInfo.filename
          }
        );
        
        resumedCount++;
      } catch (e) {
        console.error('Failed to resume download:', pausedInfo.downloadId, e);
      }
    }

    // Clear the paused downloads file
    try {
      fs.writeFileSync(pausedDownloadsPath, JSON.stringify([], null, 2));
    } catch (e) {
      console.error('Failed to clear paused downloads:', e);
    }

    return { success: true, resumedCount };
  }

  /**
   * Get paused downloads count
   */
  getPausedDownloadsCount() {
    const publicDir = path.join(__dirname, '../public');
    const pausedDownloadsPath = path.join(publicDir, 'paused_downloads.json');
    
    try {
      if (fs.existsSync(pausedDownloadsPath)) {
        const content = fs.readFileSync(pausedDownloadsPath, 'utf8');
        if (content.trim()) {
          const pausedDownloads = JSON.parse(content);
          return pausedDownloads.length;
        }
      }
    } catch (e) {
      console.error('Failed to read paused downloads:', e.message);
      return 0;
    }
    return 0;
  }

  removeDownload(downloadId) {
    // Remove from downloads map
    this.downloads.delete(downloadId);
    
    // Remove from processes map if exists
    this.processes.delete(downloadId);
    
    // Broadcast removal to all clients
    this.broadcastProgress(downloadId, { type: 'removed' });
    
    console.log(`Download removed: ${downloadId}`);
    return true;
  }

  /**
   * Pause a download by saving its info for later resume
   * Does NOT clean up temp files - they will be used for resume
   */


  /**
   * Clean up all temporary files generated by yt-dlp
   * including .part, .temp, .tmp, .ytdl, fragment files, thumbnails, etc.
   */
  cleanupAllTempFiles(basePath, includeThumbnail = false) {
    if (!basePath) return;

    const dir = path.dirname(basePath);
    const basename = path.basename(basePath, path.extname(basePath));
    
    // Get the video title from download record if available
    const downloadId = Array.from(this.downloads.entries())
      .find(([id, d]) => d.status === 'cancelled' && d.saveDir && basePath.includes(d.saveDir))?.[0];
    const download = downloadId ? this.downloads.get(downloadId) : null;
    const videoTitle = download?.title || basename;

    // Patterns of files to delete
    const patterns = [
      /\.part$/,           // Partial download files
      /\.temp$/,           // Temporary files
      /\.tmp$/,            // TMP files
      /\.ytdl$/,           // yt-dlp temp files
      /\.ffmpeg$/,         // FFmpeg temp files
      /\.part\.frag-\d+$/, // Fragmented download parts
      /\.webm\.frag-\d+$/, // WebM fragments
      /\.mp4\.frag-\d+$/,  // MP4 fragments
      /\.mkv\.frag-\d+$/,  // MKV fragments
      /\.m4a\.frag-\d+$/,  // M4A audio fragments
      /\.mp3\.frag-\d+$/,  // MP3 fragments
      /\.download$/,        // Download in progress
      /\.crdownload$/,     // Chrome temp download
    ];

    let cleanedCount = 0;

    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        
        files.forEach(file => {
          const shouldDelete = patterns.some(pattern => pattern.test(file)) ||
                               // Also delete files with the same basename and temp extensions
                               (file.includes(basename) && (
                                 file.endsWith('.part') ||
                                 file.endsWith('.temp') ||
                                 file.endsWith('.tmp') ||
                                 file.endsWith('.ytdl') ||
                                 file.endsWith('.ffmpeg') ||
                                 /\.f\d+$/.test(file) ||
                                 /\.frag-\d+$/.test(file)
                               ));
          
          if (shouldDelete) {
            const fullPath = path.join(dir, file);
            try {
              fs.unlinkSync(fullPath);
              cleanedCount++;
            } catch (e) {
              // File might be locked or already deleted
            }
          }
        });
      }
    } catch (err) {
      // Directory might not exist
    }

    // Also clean up thumbnail if requested (yt-dlp saves thumbnails in same dir)
    if (includeThumbnail && videoTitle) {
      const thumbnailExtensions = ['.jpg', '.webp', '.png', '.gif', '.jpeg', '.thumb'];
      
      try {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          files.forEach(file => {
            const ext = path.extname(file).toLowerCase();
            if (thumbnailExtensions.includes(ext)) {
              // Check if this thumbnail matches our video title
              // Try multiple matching strategies
              const fileWithoutExt = file.replace(/\.[^/.]+$/, '');
              
              // Strategy 1: Exact match with video title
              // Strategy 2: Video title is contained in filename
              // Strategy 3: Filename contains significant parts of video title
              
              const videoTitleLower = videoTitle.toLowerCase();
              const fileLower = fileWithoutExt.toLowerCase();
              
              // Check if video title is in the filename (flexible matching)
              const isMatch = 
                fileLower === videoTitleLower ||
                fileLower.includes(videoTitleLower) ||
                videoTitleLower.includes(fileLower) ||
                // Check for partial matches with key words
                (videoTitleLower.split(' ').filter(w => w.length > 3).some(word => 
                  fileLower.includes(word)
                ));
              
              if (isMatch) {
                const fullPath = path.join(dir, file);
                try {
                  fs.unlinkSync(fullPath);
                  cleanedCount++;
                  console.log(`Deleted thumbnail: ${file}`);
                } catch (e) {
                  // Ignore
                }
              }
            }
          });
        }
      } catch (err) {
        // Ignore
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} files in ${dir}`);
    }
  }

  /**
   * Clean up all temporary files in the public directory
   */
  cleanupAllTempFilesInPublicDir() {
    const publicDir = path.join(__dirname, '../public');
    
    const tempExtensions = ['.part', '.temp', '.tmp', '.ytdl', '.ffmpeg', '.download'];
    
    const scanDirectory = (dir) => {
      try {
        if (!fs.existsSync(dir)) return;
        
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        items.forEach(item => {
          const fullPath = path.join(dir, item.name);
          
          if (item.isDirectory()) {
            // Skip certain directories
            if (item.name === 'thumbnails' || item.name === 'trash' || item.name === 'ambience') {
              return;
            }
            scanDirectory(fullPath);
          } else if (item.isFile()) {
            const ext = path.extname(item.name).toLowerCase();
            if (tempExtensions.includes(ext)) {
              try {
                fs.unlinkSync(fullPath);
              } catch (e) {
                // Ignore
              }
            }
            // Delete fragment files
            if (/\.f\d+$/.test(item.name) || /\.frag-\d+$/.test(item.name)) {
              try {
                fs.unlinkSync(fullPath);
              } catch (e) {
                // Ignore
              }
            }
          }
        });
      } catch (err) {
        // Ignore errors
      }
    };

    scanDirectory(publicDir);
    console.log('Cleaned up all temporary files in public directory');
  }

  /**
   * Clean up orphaned thumbnails that don't have corresponding video files
   */
  cleanupOrphanedThumbnails() {
    const thumbnailsDir = path.join(__dirname, '../public/thumbnails');
    const publicDir = path.join(__dirname, '../public');
    
    if (!fs.existsSync(thumbnailsDir)) return;
    
    // Get all video files in public directory to match against
    const videoExtensions = ['.mp4', '.webm', '.mkv', '.m4a', '.mp3', '.mov', '.avi', '.flv', '.wmv'];
    const videoFiles = new Set();
    
    const scanForVideos = (dir) => {
      try {
        if (!fs.existsSync(dir)) return;
        
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        items.forEach(item => {
          const fullPath = path.join(dir, item.name);
          
          if (item.isDirectory()) {
            if (item.name === 'thumbnails' || item.name === 'trash' || item.name === 'ambience') {
              return;
            }
            scanForVideos(fullPath);
          } else if (item.isFile()) {
            const ext = path.extname(item.name).toLowerCase();
            if (videoExtensions.includes(ext)) {
              const baseName = item.name.replace(/\.[^/.]+$/, '');
              videoFiles.add(baseName);
            }
          }
        });
      } catch (err) {
        // Ignore
      }
    };
    
    scanForVideos(publicDir);
    
    // Now scan thumbnails directory and delete thumbnails without matching videos
    const thumbnailExtensions = ['.jpg', '.webp', '.png', '.gif', '.jpeg'];
    let deletedCount = 0;
    
    const scanThumbnails = (dir) => {
      try {
        if (!fs.existsSync(dir)) return;
        
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        items.forEach(item => {
          const fullPath = path.join(dir, item.name);
          
          if (item.isDirectory()) {
            scanThumbnails(fullPath);
          } else if (item.isFile()) {
            const ext = path.extname(item.name).toLowerCase();
            if (thumbnailExtensions.includes(ext)) {
              const baseName = item.name.replace(/\.[^/.]+$/, '');
              const hasVideo = videoFiles.has(baseName) || 
                               videoFiles.has(baseName.replace(/\s+\d+$/, ''));
              
              if (!hasVideo) {
                try {
                  fs.unlinkSync(fullPath);
                  deletedCount++;
                } catch (e) {
                  // Ignore
                }
              }
            }
          }
        });
      } catch (err) {
        // Ignore
      }
    };
    
    scanThumbnails(thumbnailsDir);
    
    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} orphaned thumbnails`);
    }
  }

  /**
   * Manual cleanup endpoint
   */
  cleanupOrphanedFiles() {
    this.cleanupAllTempFilesInPublicDir();
    this.cleanupOrphanedThumbnails();
    
    return { success: true, message: 'Cleanup completed successfully' };
  }

  completeDownload(downloadId, success, error = null) {
    const processData = this.processes.get(downloadId);
    
    if (processData && processData.cancelled) {
      return;
    }

    if (!processData) {
      const download = this.downloads.get(downloadId);
      if (download && download.status === 'cancelled') {
        return;
      }
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
