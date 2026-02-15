const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);
const pendingVideosService = require('./pendingVideosService');
const downloadService = require('./downloadService');
const downloadManager = require('./DownloadManager');

const SUBSCRIPTIONS_DIR = path.join(__dirname, '../public/Subscriptions');
const TRASH_DIR = path.join(__dirname, '../public/trash');
const CORRUPT_BACKUP_DIR = path.join(TRASH_DIR, 'subscription_corrupt_backup');
const YT_DLP_PATH = path.join(__dirname, '../public/yt-dlp.exe');

// Track active downloads to avoid interference
let activeDownloadCount = 0;
let lastCheckTime = 0;
const MIN_CHECK_INTERVAL = 60000; // Minimum 60 seconds between checks
const MAX_CONCURRENT_CHECKS = 2; // Max concurrent video checks
let concurrentCheckCount = 0;

// Ensure directories exist
if (!fs.existsSync(SUBSCRIPTIONS_DIR)) {
  fs.mkdirSync(SUBSCRIPTIONS_DIR, { recursive: true });
}

if (!fs.existsSync(CORRUPT_BACKUP_DIR)) {
  fs.mkdirSync(CORRUPT_BACKUP_DIR, { recursive: true });
}

// Load all active subscriptions
async function loadSubscriptions() {
  const subscriptions = [];
  
  try {
    const folders = fs.readdirSync(SUBSCRIPTIONS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory());
    
    for (const folder of folders) {
      const channelName = folder.name;
      const subscriptionPath = path.join(SUBSCRIPTIONS_DIR, channelName, '.subscription.json');
      
      if (fs.existsSync(subscriptionPath)) {
        try {
          const content = fs.readFileSync(subscriptionPath, 'utf8');
          const metadata = JSON.parse(content);
          
          subscriptions.push({
            channelName,
            ...metadata
          });
        } catch (error) {
          console.error(`Corrupted subscription file for channel ${channelName}:`, error);
          // Move corrupted file to backup
          const backupPath = path.join(CORRUPT_BACKUP_DIR, `${channelName}_${Date.now()}.json`);
          fs.renameSync(subscriptionPath, backupPath);
        }
      }
    }
  } catch (error) {
    console.error('Error loading subscriptions:', error);
  }
  
  return subscriptions;
}

// Create a new subscription
async function createSubscription(channelName, channelUrl, selected_quality = '720p') {
  const channelDir = path.join(SUBSCRIPTIONS_DIR, channelName);
  const subscriptionPath = path.join(channelDir, '.subscription.json');
  
  if (!fs.existsSync(channelDir)) {
    fs.mkdirSync(channelDir, { recursive: true });
  }
  
  const metadata = {
    channel_url: channelUrl,
    selected_quality: selected_quality,
    auto_download: true,
    last_checked: new Date().toISOString(),
    retry_count: 0,
    last_error: null,
    last_success: new Date().toISOString()
  };
  
  fs.writeFileSync(subscriptionPath, JSON.stringify(metadata, null, 2));
  
  return {
    channelName,
    ...metadata
  };
}

// Delete a subscription (remove folder)
async function deleteSubscription(channelName) {
  const channelDir = path.join(SUBSCRIPTIONS_DIR, channelName);
  
  if (fs.existsSync(channelDir)) {
    fs.rmSync(channelDir, { recursive: true, force: true });
    return true;
  }
  
  return false;
}

// Update subscription metadata
async function updateSubscription(channelName, updates) {
  const subscriptionPath = path.join(SUBSCRIPTIONS_DIR, channelName, '.subscription.json');
  
  if (fs.existsSync(subscriptionPath)) {
    try {
      const content = fs.readFileSync(subscriptionPath, 'utf8');
      const metadata = JSON.parse(content);
      
      const updatedMetadata = {
        ...metadata,
        ...updates
      };
      
      fs.writeFileSync(subscriptionPath, JSON.stringify(updatedMetadata, null, 2));
      
      return {
        channelName,
        ...updatedMetadata
      };
    } catch (error) {
      console.error(`Error updating subscription ${channelName}:`, error);
      return null;
    }
  }
  
  return null;
}

// Check for new videos in a channel
async function checkForNewVideos(subscription, customDate = null) {
  const { channelName, channel_url, last_checked } = subscription;
  
  // Skip if too many concurrent checks
  if (concurrentCheckCount >= MAX_CONCURRENT_CHECKS) {
    console.log(`[Subscription Service] Skipping check for ${channelName} - too many concurrent checks`);
    return [];
  }
  
  concurrentCheckCount++;
  
  try {
    const checkDate = customDate || last_checked;
    // Use a small buffer (2 hours) for yt-dlp filtering to avoid missing 
    // videos near time boundaries, then use precise timestamps for exact filtering.
    let checkDateObj = new Date(checkDate);
    if (isNaN(checkDateObj.getTime())) {
      checkDateObj = new Date(); // Fallback to now if stored date is corrupt
    }
    const twoHoursAgo = new Date(checkDateObj.getTime() - (2 * 60 * 60 * 1000));
    const dateAfter = twoHoursAgo.toISOString().split('T')[0].replace(/-/g, '');
    
    // Use local yt-dlp.exe if available, otherwise fall back to system yt-dlp
    const ytDlp = fs.existsSync(YT_DLP_PATH) ? YT_DLP_PATH : 'yt-dlp';
    // Use a more unique delimiter to avoid issues with titles/URLs containing |
    const delimiter = '###SEP###';
    
    console.log(`[Subscription Service] Checking ${channelName} for videos since ${dateAfter}...`);
    
    // Use spawn with lower priority on Windows
    const command = ytDlp;
    const args = [
      channel_url,
      '--dateafter', dateAfter,
      '--flat-playlist',
      '--extractor-args', 'youtubetab:approximate_date',  // CRITICAL: Forces upload_date in flat mode
      '--print', `%(id)s${delimiter}%(title)s${delimiter}%(upload_date)s${delimiter}%(thumbnail)s${delimiter}%(timestamp)s`,
      '--js-runtimes', 'node'
    ];
    
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      
      const childProcess = spawn(command, args, {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      // Set low priority on Windows (only works on Windows)
      if (process.platform === 'win32') {
        try {
          childProcess.priority = 0x00004000; // IDLE_PRIORITY_CLASS
        } catch (e) {
          // Priority not supported, continue anyway
        }
      }
      
      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      childProcess.on('close', (code) => {
        if (code !== 0 && !stderr.includes('WARNING')) {
          console.error(`Error checking videos for ${channelName}:`, stderr);
          resolve([]);
          return;
        }
        
        const lastCheckedTime = new Date(checkDate).getTime();
        const lastCheckedDate = new Date(lastCheckedTime);
        const lastCheckedUTCMidnight = Date.UTC(
          lastCheckedDate.getUTCFullYear(),
          lastCheckedDate.getUTCMonth(),
          lastCheckedDate.getUTCDate()
        );
        
        // Parse output
        const videos = [];
        const lines = stdout.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          const parts = line.split(delimiter);
          if (parts.length < 2) continue;
          
          const [id, title, uploadDate, thumbnail, timestamp] = parts;
          
          // Determine if this video is new
          let isNew = true;
          
          // 1. Try using timestamp (most precise) - now may actually have data with the extractor arg
          if (timestamp && timestamp !== 'NA' && timestamp !== 'null' && !isNaN(timestamp)) {
            const videoTime = parseInt(timestamp) * 1000;
            if (videoTime <= lastCheckedTime) {
              isNew = false;
            }
          }
          // 2. Fallback to upload_date (now populated by approximate_date extractor arg)
          else if (uploadDate && uploadDate !== 'NA' && /^\d{8}$/.test(uploadDate)) {
            // Convert YYYYMMDD to UTC midnight
            const year = parseInt(uploadDate.substring(0, 4));
            const month = parseInt(uploadDate.substring(4, 6)) - 1;
            const day = parseInt(uploadDate.substring(6, 8));
            const videoDate = Date.UTC(year, month, day);
            
            if (videoDate <= lastCheckedUTCMidnight) {
              isNew = false;
            }
          }
          // 3. If still no usable date info (rare with extractor arg), include but warn
          else {
            console.warn(`Video ${id} has no valid date information – including by default`);
            // Still include it to be safe
          }
          
          if (isNew) {
            // Process thumbnail URL
            let processedThumbnail = thumbnail && thumbnail !== 'NA' ? thumbnail : null;
            
            // If thumbnail is missing, construct a fallback YouTube thumbnail URL
            if (!processedThumbnail) {
              processedThumbnail = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
            }
            
            // Process upload date to YYYY-MM-DD
            let processedUploadDate = null;
            if (uploadDate && uploadDate !== 'NA') {
              const trimmedDate = uploadDate.trim();
              if (/^\d{8}$/.test(trimmedDate)) {
                processedUploadDate = `${trimmedDate.substring(0, 4)}-${trimmedDate.substring(4, 6)}-${trimmedDate.substring(6, 8)}`;
              } else if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
                processedUploadDate = trimmedDate;
              }
            }
            
            // Fallback to current date if missing
            if (!processedUploadDate) {
              processedUploadDate = new Date().toISOString().split('T')[0];
            }
            
            videos.push({
              id,
              title,
              upload_date: processedUploadDate,
              thumbnail: processedThumbnail,
              channel_name: channelName
            });
          }
        }
        
        // Save videos to pending list
        if (videos.length > 0) {
          if (customDate) {
            pendingVideosService.saveCustomDateVideos(channelName, videos, customDate);
          } else {
            videos.forEach(video => {
              pendingVideosService.addPendingVideo(channelName, video);
            });
            
            // Move last_checked forward to now to "acknowledge" these videos
            // and prevent redundant checks for the same window.
            updateSubscription(channelName, {
              last_checked: new Date().toISOString(),
              last_success: new Date().toISOString()
            }).catch(err => console.error('Error updating subscription:', err));
          }
        } else if (!customDate) {
          // Even if no new videos, update last_checked to show the check happened
          updateSubscription(channelName, {
            last_checked: new Date().toISOString(),
            last_success: new Date().toISOString()
          }).catch(err => console.error('Error updating subscription:', err));
        }
        
        resolve(videos);
      });
      
      childProcess.on('error', (error) => {
        console.error(`Process error checking videos for ${channelName}:`, error);
        resolve([]);
      });
    });
  } finally {
    concurrentCheckCount--;
  }
}

// New robust download function to avoid circular dependency issues
async function subscriptionDirectDownload(params) {
  // Require here to avoid top-level circular dependency
  const ds = require('./downloadService');
  
  if (typeof ds.startDirectDownload !== 'function') {
    console.error('[Subscription Service] downloadService.startDirectDownload is still not a function!');
    // Fallback logic if needed, but the cycle should be broken now
    throw new Error('Download service is not properly initialized');
  }
  
  return await ds.startDirectDownload(params);
}

// Download a video
async function downloadVideo(video, subscription) {
  const { channelName, selected_quality } = subscription;
  const { id, title, thumbnail } = video;
  
  // Mark as downloading
  pendingVideosService.updatePendingVideoStatus(channelName, id, 'downloading');
  
  // Track active download
  activeDownloadCount++;
  
  const url = `https://www.youtube.com/watch?v=${id}`;
  const saveDir = `Subscriptions/${channelName}`;
  
  // Map subscription quality to download manager quality keys
  const qualityMap = {
    '8K': '4320p',
    '4K': '2160p',
  };
  const qualityKey = qualityMap[selected_quality] || selected_quality;

  try {
    console.log(`[Auto-Download] Queuing video: ${title} from ${channelName} (Quality: ${selected_quality})`);
    
    await subscriptionDirectDownload({
      url,
      saveDir,
      mode: 'planned',
      qualityKey: qualityKey,
      metadata: {
        title: title,
        thumbnail: thumbnail,
        channel: channelName
      }
    });
    
    // Mark as queued/downloading in pending service
    // We no longer remove it immediately so it stays visible in "New Videos" 
    // but the UI can show its downloading status
    pendingVideosService.updatePendingVideoStatus(channelName, id, 'downloading');
    
    // Update last_checked to current time as a marker of activity
    await updateSubscription(channelName, {
      last_checked: new Date().toISOString(),
      last_success: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error(`[Auto-Download] Error queuing video ${title}:`, error);
    console.error(`[Auto-Download] Error stack:`, error.stack);
    pendingVideosService.updatePendingVideoStatus(channelName, id, 'error');
    throw error;
  } finally {
    activeDownloadCount--;
  }
}

// Cancel all pending videos across all channels
async function cancelAllPendingVideos() {
  const subscriptions = await loadSubscriptions();
  for (const subscription of subscriptions) {
    const channelName = subscription.channelName;
    const pendingVideos = pendingVideosService.loadPendingVideos(channelName);
    
    if (pendingVideos.length > 0) {
      // Find the latest upload date to update last_checked
      let latestDate = new Date(0);
      pendingVideos.forEach(v => {
        if (v.upload_date) {
          const d = new Date(v.upload_date);
          if (d > latestDate) latestDate = d;
        }
      });
      
      const newLastChecked = latestDate.getTime() > 0 ? latestDate.toISOString() : new Date().toISOString();
      
      // Clear pending videos
      pendingVideosService.clearPendingVideos(channelName);
      
      // Update subscription last_checked
      await updateSubscription(channelName, {
        last_checked: newLastChecked
      });
    }
  }
  return true;
}

// Handle video cancellation
async function cancelVideo(video, subscription) {
  // Remove from pending videos
  pendingVideosService.removePendingVideo(subscription.channelName, video.id);
  
  // Update last_checked to video's upload date to prevent re-detection
  let lastChecked = new Date().toISOString();
  
  try {
    if (video.upload_date) {
      const uploadDate = new Date(video.upload_date);
      if (!isNaN(uploadDate.getTime())) {
        lastChecked = uploadDate.toISOString();
      }
    }
  } catch (error) {
    console.warn(`Invalid upload date for video ${video.id}: ${error.message}`);
  }
  
  return await updateSubscription(subscription.channelName, {
    last_checked: lastChecked
  });
}

// Retry failed downloads
async function retryFailedDownloads(subscriptions) {
  const now = new Date();
  
  for (const subscription of subscriptions) {
    const { channelName, retry_count, last_error, last_checked } = subscription;
    
    if (retry_count > 0 && retry_count < 3 && last_error) {
      // Calculate retry delay
      let delay = 0;
      if (retry_count === 1) {
        delay = 60 * 1000; // 1 minute
      } else if (retry_count === 2) {
        delay = 5 * 60 * 1000; // 5 minutes
      } else if (retry_count === 3) {
        delay = 15 * 60 * 1000; // 15 minutes
      }
      
      // Check if enough time has passed
      const lastAttemptTime = new Date(last_checked);
      if (now - lastAttemptTime >= delay) {
        // Attempt to check and download new videos
        try {
          const newVideos = await checkForNewVideos(subscription);
          if (newVideos.length > 0) {
            for (const video of newVideos) {
              await downloadVideo(video, subscription);
            }
            
            // Update success metadata
            await updateSubscription(channelName, {
              last_checked: new Date().toISOString(),
              retry_count: 0,
              last_error: null,
              last_success: new Date().toISOString()
            });
          }
        } catch (error) {
          // Update error metadata
          await updateSubscription(channelName, {
            retry_count: retry_count + 1,
            last_error: error.message
          });
          
          // Disable auto_download if max retries reached
          if (retry_count + 1 >= 3) {
            await updateSubscription(channelName, {
              auto_download: false
            });
          }
        }
      }
    }
  }
}

// Start periodic check for new videos
let checkTimeout;

function startPeriodicCheck(intervalMinutes = 10) {
  const intervalMs = intervalMinutes * 60 * 1000;
  
  console.log(`[Subscription Service] Periodic check enabled. Interval: ${intervalMinutes} minutes`);
  
  // Initial check after delay
  checkTimeout = setTimeout(() => runCheck(), 5000);
  
  async function runCheck() {
    try {
      const now = Date.now();
      
      // Skip if explicitly too soon since last check logic
      if (now - lastCheckTime < MIN_CHECK_INTERVAL) {
        return;
      }
      
      lastCheckTime = now;
      console.log(`[Subscription Service] Running periodic background check at ${new Date().toLocaleTimeString()}...`);
      
      const subscriptions = await loadSubscriptions();
      
      for (const subscription of subscriptions) {
        try {
          // 1. Check for NEW videos (for ALL creators)
          const newVideos = await checkForNewVideos(subscription);
          
          // Wait a bit between checks to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          if (newVideos.length > 0) {
            console.log(`[Subscription Service] Found ${newVideos.length} new videos for ${subscription.channelName}`);
            
            // 2. Automate download ONLY if auto_download is enabled
            if (subscription.auto_download) {
              for (const video of newVideos) {
                if (activeDownloadCount >= 3) {
                  console.log(`[Subscription Service] Too many active downloads, skipping auto-download for: ${video.title}`);
                  continue; 
                }
                
                console.log(`[Subscription Service] Auto-downloading: ${video.title}`);
                await downloadVideo(video, subscription);
                
                // Wait between starting downloads
                await new Promise(resolve => setTimeout(resolve, 3000));
              }
            }
          }

          // 3. RETRY logic for auto_download subscriptions
          if (subscription.auto_download) {
            const pendingVideos = pendingVideosService.loadPendingVideos(subscription.channelName);
            const videosToRetry = pendingVideos.filter(v => v.status === 'error' || !v.status);
            
            if (videosToRetry.length > 0 && activeDownloadCount < 2) {
              for (const video of videosToRetry) {
                if (activeDownloadCount >= 3) break;
                
                try {
                  const fullVideo = { ...video, channel_name: subscription.channelName };
                  await downloadVideo(fullVideo, subscription);
                } catch (e) {}
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }
          }
          
        } catch (error) {
          console.error(`Error in periodic check for ${subscription.channelName}:`, error);
          await updateSubscription(subscription.channelName, {
            retry_count: (subscription.retry_count || 0) + 1,
            last_error: error.message
          });
        }
      }
      console.log(`[Subscription Service] Background check cycle completed.`);
    } catch (e) {
      console.error(`[Subscription Service] Fatal error in runCheck:`, e);
    } finally {
      // Schedule NEXT check always after finishing current one
      checkTimeout = setTimeout(() => runCheck(), intervalMs);
    }
  }
}

function stopPeriodicCheck() {
  if (checkTimeout) {
    clearTimeout(checkTimeout);
    checkTimeout = null;
    console.log('[Subscription Service] Periodic check disabled');
  }
}

// Initialize subscription system
async function initialize() {
  const subscriptions = await loadSubscriptions();
  
  // Retry failed downloads on startup
  await retryFailedDownloads(subscriptions);
  
  // Start periodic check
  startPeriodicCheck();
  
  console.log(`Loaded ${subscriptions.length} active subscriptions`);
}

module.exports = {
  loadSubscriptions,
  createSubscription,
  deleteSubscription,
  updateSubscription,
  checkForNewVideos,
  downloadVideo,
  cancelVideo,
  cancelAllPendingVideos,
  retryFailedDownloads,
  startPeriodicCheck,
  stopPeriodicCheck,
  initialize,
  // Functions to track active downloads from external sources
  incrementActiveDownloads: () => { activeDownloadCount++; },
  decrementActiveDownloads: () => { activeDownloadCount = Math.max(0, activeDownloadCount - 1); },
  getActiveDownloadCount: () => activeDownloadCount
};
