const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);
const pendingVideosService = require('./pendingVideosService');
const downloadService = require('./downloadService');

const SUBSCRIPTIONS_DIR = path.join(__dirname, '../public/Subscriptions');
const TRASH_DIR = path.join(__dirname, '../public/trash');
const CORRUPT_BACKUP_DIR = path.join(TRASH_DIR, 'subscription_corrupt_backup');
const YT_DLP_PATH = path.join(__dirname, '../public/yt-dlp.exe');

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
async function createSubscription(channelName, channelUrl, selected_quality = '1080p') {
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
  
  try {
    // Use custom date if provided, otherwise use last_checked
    const checkDate = customDate || last_checked;
    const dateAfter = new Date(checkDate).toISOString().split('T')[0].replace(/-/g, '');
    
    // Use local yt-dlp.exe if available, otherwise fall back to system yt-dlp
    const ytDlp = fs.existsSync(YT_DLP_PATH) ? `"${YT_DLP_PATH}"` : 'yt-dlp';
    const command = `${ytDlp} "${channel_url}" --dateafter "${dateAfter}" --flat-playlist --print "%(id)s|%(title)s|%(upload_date)s|%(thumbnail)s" --js-runtimes node`;
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      console.error(`Error checking videos for ${channelName}:`, stderr);
      return [];
    }
    
    // Parse output
    const videos = [];
    const lines = stdout.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const [id, title, uploadDate, thumbnail] = line.split('|');
      
      if (id && title) {
        // Process thumbnail URL - YouTube thumbnails can be in various formats
        let processedThumbnail = thumbnail;
        if (processedThumbnail && !processedThumbnail.startsWith('http')) {
          processedThumbnail = null; // Invalid thumbnail URL
        }
        
        // Validate and process upload date
        let processedUploadDate = null;
        if (uploadDate) {
          const trimmedDate = uploadDate.trim();
          if (/^\d{8}$/.test(trimmedDate)) { // Check for YYYYMMDD format
            processedUploadDate = trimmedDate;
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) { // Check for YYYY-MM-DD format
            processedUploadDate = trimmedDate.replace(/-/g, '');
          }
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
      }
    }
    
    return videos;
  } catch (error) {
    console.error(`Error checking videos for ${channelName}:`, error);
    return [];
  }
}

// Download a video
async function downloadVideo(video, subscription) {
  const { channelName, selected_quality, auto_download } = subscription;
  const { id, title } = video;
  
  // Mark as downloading
  pendingVideosService.updatePendingVideoStatus(channelName, id, 'downloading');
  
  const outputDir = path.join(SUBSCRIPTIONS_DIR, channelName);
  const outputPath = path.join(outputDir, '%(title)s.%(ext)s');
  
  // Determine quality filter based on selected quality
  let qualityFilter = 'bestvideo+bestaudio/best';
  if (selected_quality === '8K') {
    qualityFilter = 'bestvideo[height<=4320]+bestaudio/best[height<=4320]';
  } else if (selected_quality === '4K') {
    qualityFilter = 'bestvideo[height<=2160]+bestaudio/best[height<=2160]';
  } else if (selected_quality === '1440p') {
    qualityFilter = 'bestvideo[height<=1440]+bestaudio/best[height<=1440]';
  } else if (selected_quality === '1080p') {
    qualityFilter = 'bestvideo[height<=1080]+bestaudio/best[height<=1080]';
  } else if (selected_quality === '720p') {
    qualityFilter = 'bestvideo[height<=720]+bestaudio/best[height<=720]';
  } else if (selected_quality === '480p') {
    qualityFilter = 'bestvideo[height<=480]+bestaudio/best[height<=480]';
  } else if (selected_quality === '360p') {
    qualityFilter = 'bestvideo[height<=360]+bestaudio/best[height<=360]';
  } else if (selected_quality === '240p') {
    qualityFilter = 'bestvideo[height<=240]+bestaudio/best[height<=240]';
  } else if (selected_quality === '144p') {
    qualityFilter = 'bestvideo[height<=144]+bestaudio/best[height<=144]';
  }
  
  // Use local yt-dlp.exe if available, otherwise fall back to system yt-dlp
  const ytDlp = fs.existsSync(YT_DLP_PATH) ? `"${YT_DLP_PATH}"` : 'yt-dlp';
  
  // Set up thumbnail directory
  const thumbnailsDir = path.join(__dirname, '../public/thumbnails/Subscriptions', channelName);
  if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
  }

  const command = `${ytDlp} "https://www.youtube.com/watch?v=${id}" -f "${qualityFilter}" --merge-output-format mp4 --no-part --no-mtime --write-thumbnail --convert-thumbnails jpg -o "${outputPath}" --output "thumbnail:${path.join(thumbnailsDir, '%(title)s.%(ext)s')}" --js-runtimes node`;
  
  try {
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr && !stderr.includes('WARNING')) {
      console.error(`Error downloading video ${title}:`, stderr);
      pendingVideosService.updatePendingVideoStatus(channelName, id, 'error');
      throw new Error(stderr);
    }
    
    // Mark as downloaded
    pendingVideosService.updatePendingVideoStatus(channelName, id, 'downloaded');
    
    // Remove from pending videos
    pendingVideosService.removePendingVideo(channelName, id);
    
    return true;
  } catch (error) {
    console.error(`Error downloading video ${title}:`, error);
    pendingVideosService.updatePendingVideoStatus(channelName, id, 'error');
    throw error;
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
let checkInterval;

function startPeriodicCheck(intervalMinutes = 30) {
  const intervalMs = intervalMinutes * 60 * 1000;
  
  checkInterval = setInterval(async () => {
    const subscriptions = await loadSubscriptions();
    
    for (const subscription of subscriptions) {
      if (subscription.auto_download) {
        try {
          const newVideos = await checkForNewVideos(subscription);
          if (newVideos.length > 0) {
            for (const video of newVideos) {
              await downloadVideo(video, subscription);
            }
            
            // Update last_checked only if download successful
            await updateSubscription(subscription.channelName, {
              last_checked: new Date().toISOString(),
              retry_count: 0,
              last_error: null,
              last_success: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error(`Error in periodic check for ${subscription.channelName}:`, error);
          
          // Update error metadata
          await updateSubscription(subscription.channelName, {
            retry_count: subscription.retry_count + 1,
            last_error: error.message
          });
          
          // Disable auto_download if max retries reached
          if (subscription.retry_count + 1 >= 3) {
            await updateSubscription(subscription.channelName, {
              auto_download: false
            });
          }
        }
      }
    }
  }, intervalMs);
}

function stopPeriodicCheck() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
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
  initialize
};
