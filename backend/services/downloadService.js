const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const publicDir = path.join(__dirname, '../public');
const thumbnailsDir = path.join(publicDir, 'thumbnails');

const getYtDlpPath = () => {
  const localExe = path.join(publicDir, 'yt-dlp.exe');
  if (fs.existsSync(localExe)) {
    console.log('Using local yt-dlp:', localExe);
    return localExe;
  }
  return 'yt-dlp';
};

// Store active downloads and their processes
const downloads = new Map();
const processes = new Map();

const queue = [];
let activeDownloadsCount = 0;
const settingsPath = path.join(publicDir, 'download_settings.json');

const defaultSettings = {
  maxConcurrentPlaylistDownloads: 3
};

class DownloadService {
  constructor() {
    this.downloads = downloads;
    this.queue = queue;
    this.settings = this.loadSettings();
    this.activeBatchProcesses = 0;
  }

  loadSettings() {
    try {
      if (fs.existsSync(settingsPath)) {
        return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
    return { ...defaultSettings };
  }

  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    fs.writeFileSync(settingsPath, JSON.stringify(this.settings, null, 2));
    this.processQueue(); // Re-trigger if limit increased
    return this.settings;
  }

  // Get formats for a video URL
  async getFormats(url) {
    return new Promise((resolve, reject) => {
      const args = [
        '--dump-json',
        '--no-warnings',
        '--no-playlist',
'--extractor-args', 'youtube:player_client=web,web_safari,web_embedded,web_music,web_creator,mweb,ios,android,android_vr,tv,tv_simply,tv_embedded',
        url
      ];

      const process = spawn(getYtDlpPath(), args);
      
      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`yt-dlp process exited with code ${code}: ${error}`));
          return;
        }

        try {
          const info = JSON.parse(output);
          resolve(this.processFormats(info));
        } catch (err) {
          reject(new Error(`Failed to parse yt-dlp output: ${err.message}`));
        }
      });
    });
  }

  async runYtDlpJson(args, { retryOn403 = true } = {}) {
    return new Promise((resolve, reject) => {
      const runOnce = (attempt, extraArgs = []) => {
        const finalArgs = [...args, ...extraArgs];
        const child = spawn(getYtDlpPath(), finalArgs);

        let output = '';
        let error = '';

        child.stdout.on('data', (data) => {
          output += data.toString();
        });

        child.stderr.on('data', (data) => {
          error += data.toString();
        });

        child.on('close', (code) => {
          if (code === 0) {
            try {
              const info = JSON.parse(output);
              resolve(info);
            } catch (err) {
              reject(new Error(`Failed to parse yt-dlp output: ${err.message}`));
            }
            return;
          }

          if (
            retryOn403 &&
            attempt === 1 &&
            /403/.test(error || '')
          ) {
            // Retry with more browser-like headers and Android UA
            const retryArgs = [
              '--user-agent',
              'Mozilla/5.0 (Linux; Android 10; Mobile; rv:109.0) Gecko/20100101 Firefox/119.0',
              '--add-header',
              'Referer:https://www.youtube.com/',
              '--add-header',
              'Origin:https://www.youtube.com',
              '--force-ipv4',
            ];
            return runOnce(2, retryArgs);
          }

          reject(new Error(`yt-dlp process exited with code ${code}: ${error}`));
        });
      };

      runOnce(1);
    });
  }

  async getDirectInfo(url, clientInfo = {}) {
    const baseArgs = [
      '--dump-json',
      '--no-warnings',
      '--no-playlist',
'--extractor-args', 'youtube:player_client=web,web_safari,web_embedded,web_music,web_creator,mweb,ios,android,android_vr,tv,tv_simply,tv_embedded',
      url
    ];

    // Prefer a desktop-like UA for the first attempt
    const ua =
      (clientInfo && clientInfo.userAgent) ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36';

    const argsWithHeaders = [
      ...baseArgs,
      '--user-agent',
      ua,
      '--add-header',
      'Referer:https://www.youtube.com/',
      '--add-header',
      'Origin:https://www.youtube.com'
    ];

    return this.runYtDlpJson(argsWithHeaders, { retryOn403: true });
  }

  buildDirectMetadata(info) {
    const formats = info.formats || [];

    const getHeight = (fmt) => {
      if (fmt.height) return fmt.height;
      if (fmt.resolution && typeof fmt.resolution === 'string') {
        const match = fmt.resolution.match(/(\d{3,4})p?/i);
        if (match) return parseInt(match[1], 10);
      }
      return null;
    };

    const videoFormats = formats.filter(
      (f) => f.vcodec && f.vcodec !== 'none'
    );
    const audioFormats = formats.filter(
      (f) => (!f.vcodec || f.vcodec === 'none') && f.acodec && f.acodec !== 'none'
    );

    // Collect quality heights
    const heightSet = new Set();
    videoFormats.forEach((f) => {
      const h = getHeight(f);
      if (h) heightSet.add(h);
    });

    const orderedHeights = Array.from(heightSet).sort((a, b) => b - a);

    const qualityLabel = (h) => {
      if (h >= 2160) return '2160p (4K)';
      if (h >= 1440) return '1440p (2K)';
      if (h >= 1080) return '1080p (Full HD)';
      if (h >= 720) return '720p (HD)';
      if (h >= 480) return '480p';
      if (h >= 360) return '360p';
      return `${h}p`;
    };

    const qualities = orderedHeights.map((h) => ({
      key: `${h}p`,
      height: h,
      label: qualityLabel(h)
    }));

    // Collect audio languages
    const languageCounts = {};
    audioFormats.forEach((f) => {
      const code = f.language || 'und';
      languageCounts[code] = (languageCounts[code] || 0) + 1;
    });

    const languageLabelMap = (code) => {
      if (!code || code === 'und') return 'Unknown / Original';
      const lower = code.toLowerCase();
      if (lower.startsWith('en')) return 'English';
      if (lower.startsWith('hi')) return 'Hindi';
      if (lower.startsWith('ur')) return 'Urdu';
      if (lower.startsWith('ar')) return 'Arabic';
      if (lower.startsWith('es')) return 'Spanish';
      if (lower.startsWith('fr')) return 'French';
      if (lower.startsWith('de')) return 'German';
      if (lower.startsWith('ru')) return 'Russian';
      if (lower.startsWith('pt')) return 'Portuguese';
      if (lower.startsWith('tr')) return 'Turkish';
      if (lower.startsWith('id')) return 'Indonesian';
      if (lower.startsWith('bn')) return 'Bengali';
      if (lower.startsWith('ta')) return 'Tamil';
      if (lower.startsWith('te')) return 'Telugu';
      if (lower.startsWith('fa')) return 'Farsi';
      return code;
    };

    const audioLanguages = Object.keys(languageCounts).map((code) => ({
      code,
      label: languageLabelMap(code)
    }));

    const originalLanguage =
      info.original_language ||
      info.language ||
      Object.keys(languageCounts).sort(
        (a, b) => (languageCounts[b] || 0) - (languageCounts[a] || 0)
      )[0] ||
      'und';

    let thumbnail = info.thumbnail;
    if (!thumbnail && info.thumbnails && Array.isArray(info.thumbnails) && info.thumbnails.length > 0) {
      thumbnail = info.thumbnails[info.thumbnails.length - 1].url;
    }

    const metadata = {
      id: info.id,
      title: info.title,
      thumbnail: thumbnail,
      duration: info.duration,
      durationText: info.duration_string,
      uploader: info.uploader,
      originalLanguage,
      originalLanguageLabel: languageLabelMap(originalLanguage)
    };

    const defaultQualityKey = qualities.length > 0 ? qualities[0].key : null;

    return {
      metadata,
      qualities,
      audioLanguages,
      defaultQualityKey,
      defaultAudioLanguage: originalLanguage
    };
  }

  selectBestFormats(info, { mode, qualityKey, audioLanguage, clientInfo = {} }) {
    const formats = info.formats || [];

    const isAndroid =
      clientInfo &&
      typeof clientInfo.userAgent === 'string' &&
      /android/i.test(clientInfo.userAgent);

    const getHeight = (fmt) => {
      if (fmt.height) return fmt.height;
      if (fmt.resolution && typeof fmt.resolution === 'string') {
        const match = fmt.resolution.match(/(\d{3,4})p?/i);
        if (match) return parseInt(match[1], 10);
      }
      return null;
    };

    const videoOnly = [];
    const audioOnly = [];
    const muxed = [];

    formats.forEach((fmt) => {
      const hasVideo = fmt.vcodec && fmt.vcodec !== 'none';
      const hasAudio = fmt.acodec && fmt.acodec !== 'none';
      if (hasVideo && !hasAudio) videoOnly.push(fmt);
      else if (!hasVideo && hasAudio) audioOnly.push(fmt);
      else if (hasVideo && hasAudio) muxed.push(fmt);
    });

    const targetHeight = (() => {
      if (mode === 'planned' && qualityKey && typeof qualityKey === 'string') {
        const m = qualityKey.match(/(\d{3,4})p/);
        if (m) return parseInt(m[1], 10);
      }
      return null;
    })();

    const uniqueHeights = new Set();
    videoOnly.forEach((f) => {
      const h = getHeight(f);
      if (h) uniqueHeights.add(h);
    });
    muxed.forEach((f) => {
      const h = getHeight(f);
      if (h) uniqueHeights.add(h);
    });

    let heights = Array.from(uniqueHeights).sort((a, b) => b - a);

    // Avoid falling back to 360p unless absolutely nothing else is usable
    const minPreferredHeight = 480;

    if (targetHeight) {
      heights = heights.filter((h) => h <= targetHeight);
      heights.sort((a, b) => b - a);
    }

    if (heights.length === 0) {
      return null;
    }

    const desiredLanguage =
      mode === 'planned'
        ? audioLanguage
        : (info.original_language || info.language || null);

    const scoreVideo = (fmt) => {
      let score = 0;
      const h = getHeight(fmt) || 0;
      score += h;
      if (fmt.vcodec && /avc1|h264/i.test(fmt.vcodec)) score += 50;
      if (fmt.ext === 'mp4' || fmt.video_ext === 'mp4') score += 30;
      if (fmt.dynamic_range === 'HDR') score -= 10;
      if (isAndroid && fmt.vcodec && /av01|vp9/i.test(fmt.vcodec)) score -= 40;
      return score;
    };

    const scoreAudio = (fmt) => {
      let score = 0;
      if (fmt.acodec && /mp4a|aac/i.test(fmt.acodec)) score += 40;
      if (fmt.ext === 'm4a') score += 20;
      const lang = fmt.language || 'und';
      if (desiredLanguage && lang === desiredLanguage) score += 80;
      if (!desiredLanguage && (fmt.language_preference === 10 || fmt.language == null)) {
        score += 60;
      }
      return score;
    };

    const pickPair = (h) => {
      const videoCandidates = videoOnly.filter((f) => {
        const fh = getHeight(f);
        return fh && Math.abs(fh - h) <= 20;
      });
      if (videoCandidates.length === 0) return null;

      videoCandidates.sort((a, b) => scoreVideo(b) - scoreVideo(a));
      const bestVideo = videoCandidates[0];

      if (audioOnly.length === 0) return null;

      const sortedAudio = [...audioOnly].sort((a, b) => scoreAudio(b) - scoreAudio(a));
      const bestAudio = sortedAudio[0];

      return `${bestVideo.format_id}+${bestAudio.format_id}`;
    };

    const pickMuxed = (h) => {
      const candidates = muxed.filter((f) => {
        const fh = getHeight(f);
        return fh && Math.abs(fh - h) <= 20;
      });
      if (candidates.length === 0) return null;

      candidates.sort((a, b) => {
        const av = /avc1|h264/i;
        const da = a.vcodec && av.test(a.vcodec) ? 1 : 0;
        const db = b.vcodec && av.test(b.vcodec) ? 1 : 0;
        if (db !== da) return db - da;
        const ea = a.ext === 'mp4' ? 1 : 0;
        const eb = b.ext === 'mp4' ? 1 : 0;
        if (eb !== ea) return eb - ea;
        return (b.tbr || 0) - (a.tbr || 0);
      });

      return candidates[0].format_id;
    };

    let chosen = null;
    for (const h of heights) {
      if (!chosen) {
        chosen = pickPair(h);
      }
      if (!chosen) {
        chosen = pickMuxed(h);
      }
      if (chosen && h >= minPreferredHeight) {
        break;
      }
    }

    if (!chosen) {
      if (videoOnly.length > 0 && audioOnly.length > 0) {
        const bestVideo = videoOnly.sort((a, b) => scoreVideo(b) - scoreVideo(a))[0];
        const bestAudio = audioOnly.sort((a, b) => scoreAudio(b) - scoreAudio(a))[0];
        chosen = `${bestVideo.format_id}+${bestAudio.format_id}`;
      } else if (muxed.length > 0) {
        chosen = muxed.sort((a, b) => scoreVideo(b) - scoreVideo(a))[0].format_id;
      }
    }

    return chosen;
  }

  // Get info for all videos in a playlist
  async getPlaylistInfo(url) {
    return new Promise((resolve, reject) => {
      const args = [
        '--dump-json',
        '--no-warnings',
'--extractor-args', 'youtube:player_client=web,web_safari,web_embedded,web_music,web_creator,mweb,ios,android,android_vr,tv,tv_simply,tv_embedded',
        '--flat-playlist',
        url
      ];

      const process = spawn(getYtDlpPath(), args);
      
      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`yt-dlp process exited with code ${code}: ${error}`));
          return;
        }

        try {
          // yt-dlp returns one JSON object per line for playlists
          const lines = output.trim().split('\n');
          const videos = lines.map(line => {
            if (!line.trim()) return null;
            try {
                const info = JSON.parse(line);
                let thumbnail = info.thumbnail;
                // If simple thumbnail missing, try to find one in thumbnails array
                if (!thumbnail && info.thumbnails && Array.isArray(info.thumbnails) && info.thumbnails.length > 0) {
                     // Get the last one as it is usually the highest quality
                     thumbnail = info.thumbnails[info.thumbnails.length - 1].url;
                }
                
                return {
                  id: info.id,
                  title: info.title,
                  url: info.url || `https://www.youtube.com/watch?v=${info.id}`,
                  thumbnail: thumbnail,
                  duration: info.duration,
                  uploader: info.uploader
                };
            } catch (e) {
                console.error('Failed to parse playlist line', e);
                return null;
            }
          }).filter(v => v !== null);
          resolve({ videos });
        } catch (err) {
          reject(new Error(`Failed to parse playlist output: ${err.message}`));
        }
      });
    });
  }

  // Process raw formats into structured data
  processFormats(info) {
    const formatsByType = {
      video_only: [],
      audio_only: [],
      video_audio: []
    };

    const formats = info.formats || [];

    formats.forEach(fmt => {
      const formatInfo = {
        format_id: fmt.format_id,
        ext: fmt.ext,
        resolution: fmt.resolution || 'N/A',
        fps: fmt.fps,
        filesize: fmt.filesize || fmt.filesize_approx || 0,
        vcodec: fmt.vcodec !== 'none' ? fmt.vcodec : null,
        acodec: fmt.acodec !== 'none' ? fmt.acodec : null,
        note: fmt.format_note,
        dynamic_range: fmt.dynamic_range,
        video_ext: fmt.video_ext,
        audio_ext: fmt.audio_ext,
        tbr: fmt.tbr,
        language: fmt.language || 'und',
        language_preference: fmt.language_preference,
        is_original: fmt.language_preference === 10 || (info.original_url && !fmt.language) // heuristics
      };

      // Determine type
      const hasVideo = fmt.vcodec && fmt.vcodec !== 'none';
      const hasAudio = fmt.acodec && fmt.acodec !== 'none';

      if (hasVideo && !hasAudio) {
        formatsByType.video_only.push(formatInfo);
      } else if (!hasVideo && hasAudio) {
        formatsByType.audio_only.push(formatInfo);
      } else if (hasVideo && hasAudio) {
        formatsByType.video_audio.push(formatInfo);
      }
    });

    // Sort formats
    formatsByType.video_only.sort((a, b) => {
        const getRes = (res) => {
            if (!res || res === 'N/A') return 0;
            const parts = res.split('x');
            return parseInt(parts[0]) * (parts.length > 1 ? parseInt(parts[1]) : 1);
        };
        const resA = getRes(a.resolution);
        const resB = getRes(b.resolution);
        if (resB !== resA) return resB - resA;
        return (b.tbr || 0) - (a.tbr || 0);
    });

    return {
      metadata: {
        id: info.id,
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.duration,
        uploader: info.uploader,
        view_count: info.view_count,
        upload_date: info.upload_date,
        language: info.language,
        original_language: info.language // YouTube often provides this at top level
      },
      formats: formatsByType
    };
  }

  // Start a download
  startDownload(url, formatId, saveDir = 'Not Watched', metadata = {}) {
    const downloadId = uuidv4();
    
    // Create status object
    this.downloads.set(downloadId, {
      id: downloadId,
      status: 'starting',
      progress: 0,
      speed: '0',
      eta: '0',
      filename: metadata.title || null,
      title: metadata.title || null,
      thumbnail: metadata.thumbnail || null,
      batchId: metadata.batchId || null,
      index: metadata.index,
      formatId,
      error: null,
      saveDir,
      url,
      timestamp: new Date().toISOString()
    });

    const outputDir = path.join(publicDir, saveDir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const targetThumbDir = path.join(thumbnailsDir, saveDir);
    if (!fs.existsSync(targetThumbDir)) {
      fs.mkdirSync(targetThumbDir, { recursive: true });
    }

    const prefix = metadata.index !== undefined ? `${metadata.index.toString().padStart(2, '0')} ` : '';
    const outputTemplate = path.join(outputDir, `${prefix}%(title)s.%(ext)s`);

    const args = [
      '-f', formatId,
      '-o', outputTemplate,
      '--no-playlist',
'--extractor-args', 'youtube:player_client=web,web_safari,web_embedded,web_music,web_creator,mweb,ios,android,android_vr,tv,tv_simply,tv_embedded',
      '--newline',
      '--write-thumbnail',
      '--convert-thumbnails', 'jpg',
      '--output', `thumbnail:${path.join(targetThumbDir, `${prefix}%(title)s`)}`,
      '--retries', '10',
      '--fragment-retries', '10',
      '--socket-timeout', '30',
      '--no-mtime',
      url
    ];

    
    // Add ffmpeg post-processing if merging
    if (formatId.includes('+')) {
       args.push('--merge-output-format', 'mp4');
    }

    // If it's a single download (no batchId), start immediately bypassing queue logic
    // OR if we want order even for singles, we add them with a special priority.
    // User said: "playlist downlad count in setting not effact the simple vidoe downlad".
    
    if (!metadata.batchId) {
      this.downloads.get(downloadId).status = 'starting';
      this.startProcess(downloadId, args);
    } else {
      this.queue.push({ downloadId, args, isBatch: true });
      this.downloads.get(downloadId).status = 'queued';
      this.processQueue();
    }

    return downloadId;
  }

  async startDirectDownload({ url, saveDir = 'Not Watched', mode = 'original', qualityKey, audioLanguage, metadata = {}, clientInfo = {} }) {
    const info = await this.getDirectInfo(url, clientInfo);
    
    // Parse metadata using our helper to get robust thumbnail and fields
    const parsedData = this.buildDirectMetadata(info);
    
    const finalMetadata = {
        ...parsedData.metadata,
        ...metadata
    };

    const formatId = this.selectBestFormats(info, {
      mode,
      qualityKey,
      audioLanguage,
      clientInfo
    });

    if (!formatId) {
      throw new Error('Unable to determine a suitable format for this video');
    }

    return this.startDownload(url, formatId, saveDir, finalMetadata);
  }

  processQueue() {
    // Basic logic: if active batch processes < limit, start next batch item
    while (this.activeBatchProcesses < this.settings.maxConcurrentPlaylistDownloads && this.queue.length > 0) {
      const idx = this.queue.findIndex(item => item.isBatch);
      if (idx === -1) break;

      const { downloadId, args } = this.queue.splice(idx, 1)[0];
      const status = this.downloads.get(downloadId);
      
      if (status.status === 'cancelled') continue;

      this.activeBatchProcesses++;
      status.status = 'starting';
      this.downloads.set(downloadId, status);
      this.startProcess(downloadId, args, true);
    }
  }

  startProcess(downloadId, args, isBatch = false) {
    const status = this.downloads.get(downloadId);
    const process = spawn(getYtDlpPath(), args);
    processes.set(downloadId, process);

    process.stdout.on('data', (data) => {
      const line = data.toString();
      
      if (line.includes('[download]')) {
        const percentMatch = line.match(/(\d+\.\d+)%/);
        const speedMatch = line.match(/at\s+([^\s]+)/);
        const etaMatch = line.match(/ETA\s+([^\s]+)/);

        if (percentMatch) status.progress = parseFloat(percentMatch[1]);
        if (speedMatch) status.speed = speedMatch[1];
        if (etaMatch) status.eta = etaMatch[1];
        
        status.status = 'downloading';
      }
      
      if (line.includes('[Merger] Merging formats into')) {
          const match = line.match(/"([^"]+)"/);
          if (match) status.filename = path.basename(match[1]);
      } else if (line.includes('[download] Destination:')) {
          status.filename = path.basename(line.split('Destination: ')[1].trim());
      } else if (line.includes('[download]') && line.includes('has already been downloaded')) {
          status.progress = 100;
          status.status = 'finished';
          status.filename = path.basename(line.split('download] ')[1].split(' has')[0].trim());
      }
      
      this.downloads.set(downloadId, status);
    });

    process.stderr.on('data', (data) => {
       const error = data.toString();
       if (!error.includes('WARNING')) {
         console.error(`Download Error (${downloadId}):`, error);
       }
    });

    process.on('close', (code) => {
      processes.delete(downloadId);
      if (code === 0) {
        status.status = 'finished';
        status.progress = 100;
      } else if (status.status !== 'cancelled') {
        status.status = 'error';
        status.error = `Process exited with code ${code}`;
      }
      this.downloads.set(downloadId, status);
      
      if (isBatch) {
        this.activeBatchProcesses--;
        // Small delay to prevent CPU spikes or rate limiting
        setTimeout(() => this.processQueue(), 500);
      }
    });
  }

  retryDownload(id) {
    const status = this.downloads.get(id);
    if (!status) return false;

    // Remove old process if exists (shouldn't if it's finished/failed)
    const oldProcess = processes.get(id);
    if (oldProcess) oldProcess.kill();

    // Reset status but keep metadata
    status.status = 'starting';
    status.progress = 0;
    status.speed = '0';
    status.eta = '0';
    status.error = null;
    status.timestamp = new Date().toISOString();

    const outputDir = path.join(publicDir, status.saveDir);
    const targetThumbDir = path.join(thumbnailsDir, status.saveDir);
    
    const prefix = status.index !== undefined ? `${status.index.toString().padStart(2, '0')} ` : '';
    const outputTemplate = path.join(outputDir, `${prefix}%(title)s.%(ext)s`);

    const args = [
      '-f', status.formatId,
      '-o', outputTemplate,
      '--no-playlist',
'--extractor-args', 'youtube:player_client=web,web_safari,web_embedded,web_music,web_creator,mweb,ios,android,android_vr,tv,tv_simply,tv_embedded',
      '--newline',
      '--write-thumbnail',
      '--convert-thumbnails', 'jpg',
      '--output', `thumbnail:${path.join(targetThumbDir, `${prefix}%(title)s`)}`,
      '--retries', '10',
      '--fragment-retries', '10',
      '--socket-timeout', '30',
      '--no-mtime',
      status.url
    ];

    if (status.formatId.includes('+')) {
       args.push('--merge-output-format', 'mp4');
    }

    if (!status.batchId) {
      this.startProcess(id, args);
    } else {
      this.queue.push({ downloadId: id, args, isBatch: true });
      status.status = 'queued';
      this.processQueue();
    }
    
    return true;
  }

  cancelDownload(id) {
    const process = processes.get(id);
    if (process) {
      process.kill();
      const status = this.downloads.get(id);
      if (status) {
        status.status = 'cancelled';
        this.downloads.set(id, status);
      }
      processes.delete(id);
      return true;
    }
    return false;
  }

  getDownloadStatus(id) {
    return this.downloads.get(id);
  }

  getAllDownloads() {
    return Array.from(this.downloads.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  getDirectories() {
    try {
      if (!fs.existsSync(publicDir)) return ['Not Watched'];
      
      const items = fs.readdirSync(publicDir, { withFileTypes: true });
      const dirs = items
        .filter(dirent => dirent.isDirectory() && dirent.name !== 'thumbnails' && dirent.name !== 'trash')
        .map(dirent => dirent.name);
      
      if (!dirs.includes('Not Watched')) dirs.push('Not Watched');
      
      return dirs.sort();
    } catch (error) {
      console.error('Error getting directories:', error);
      return ['Not Watched'];
    }
  }
}

module.exports = new DownloadService();

