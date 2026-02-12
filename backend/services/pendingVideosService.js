const fs = require('fs');
const path = require('path');

const SUBSCRIPTIONS_DIR = path.join(__dirname, '../public/Subscriptions');

// Get pending videos file path for a channel
const getPendingVideosPath = (channelName) => {
  return path.join(SUBSCRIPTIONS_DIR, channelName, '.pending-videos.json');
};

// Load pending videos for a specific channel
const loadPendingVideos = (channelName) => {
  const pendingPath = getPendingVideosPath(channelName);
  
  if (fs.existsSync(pendingPath)) {
    try {
      const content = fs.readFileSync(pendingPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error reading pending videos for ${channelName}:`, error);
      return [];
    }
  }
  
  return [];
};

// Load all pending videos across all channels
const loadAllPendingVideos = () => {
  const allPendingVideos = [];
  
  try {
    const folders = fs.readdirSync(SUBSCRIPTIONS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory());
    
    for (const folder of folders) {
      const channelName = folder.name;
      const pendingVideos = loadPendingVideos(channelName);
      
      pendingVideos.forEach(video => {
        allPendingVideos.push({
          ...video,
          channel_name: channelName
        });
      });
    }
  } catch (error) {
    console.error('Error loading all pending videos:', error);
  }
  
  return allPendingVideos;
};

// Add a video to pending videos for a channel
const addPendingVideo = (channelName, video) => {
  try {
    const pendingPath = getPendingVideosPath(channelName);
    const existing = loadPendingVideos(channelName);
    
    // Check if video already exists
    const videoExists = existing.some(v => v.id === video.id);
    if (!videoExists) {
      existing.push(video);
      fs.writeFileSync(pendingPath, JSON.stringify(existing, null, 2));
    }
    
    return existing;
  } catch (error) {
    console.error(`Error adding pending video for ${channelName}:`, error);
    return [];
  }
};

// Remove a video from pending videos for a channel
const removePendingVideo = (channelName, videoId) => {
  try {
    const pendingPath = getPendingVideosPath(channelName);
    const existing = loadPendingVideos(channelName);
    
    const updated = existing.filter(v => v.id !== videoId);
    fs.writeFileSync(pendingPath, JSON.stringify(updated, null, 2));
    
    return updated;
  } catch (error) {
    console.error(`Error removing pending video for ${channelName}:`, error);
    return [];
  }
};

// Clear all pending videos for a channel
const clearPendingVideos = (channelName) => {
  try {
    const pendingPath = getPendingVideosPath(channelName);
    
    if (fs.existsSync(pendingPath)) {
      fs.writeFileSync(pendingPath, JSON.stringify([], null, 2));
    }
    
    return [];
  } catch (error) {
    console.error(`Error clearing pending videos for ${channelName}:`, error);
    return [];
  }
};

// Save videos to pending list when checking from custom date
const saveCustomDateVideos = (channelName, videos, customDate) => {
  try {
    const pendingPath = getPendingVideosPath(channelName);
    const existing = loadPendingVideos(channelName);
    
    // Add videos with custom date metadata
    const videosToAdd = videos.map(video => ({
      ...video,
      customCheckDate: customDate
    }));
    
    // Filter out duplicates
    const merged = existing.filter(existingVideo => 
      !videosToAdd.some(newVideo => newVideo.id === existingVideo.id)
    );
    
    merged.push(...videosToAdd);
    fs.writeFileSync(pendingPath, JSON.stringify(merged, null, 2));
    
    return merged;
  } catch (error) {
    console.error(`Error saving custom date videos for ${channelName}:`, error);
    return [];
  }
};

// Update pending video status (downloading, downloaded, canceled)
const updatePendingVideoStatus = (channelName, videoId, status) => {
  try {
    const pendingPath = getPendingVideosPath(channelName);
    const existing = loadPendingVideos(channelName);
    
    const updated = existing.map(video => 
      video.id === videoId 
        ? { ...video, status, updatedAt: new Date().toISOString() } 
        : video
    );
    
    fs.writeFileSync(pendingPath, JSON.stringify(updated, null, 2));
    
    return updated;
  } catch (error) {
    console.error(`Error updating pending video status for ${channelName}:`, error);
    return [];
  }
};

module.exports = {
  loadPendingVideos,
  loadAllPendingVideos,
  addPendingVideo,
  removePendingVideo,
  clearPendingVideos,
  saveCustomDateVideos,
  updatePendingVideoStatus
};
