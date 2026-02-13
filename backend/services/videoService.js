const fs = require('fs');
const path = require('path');
const { formatFileSize } = require('../utils/format');
const ffmpeg = require('fluent-ffmpeg');

const thumbnailsDir = path.join(__dirname, '../public/thumbnails');
const progressFile = path.join(__dirname, '../public/video-progress.json');

// Helper to get all progress data
exports.getAllProgress = () => {
  try {
    if (fs.existsSync(progressFile)) {
      const data = fs.readFileSync(progressFile, 'utf8');
      if (data.trim()) {
        return JSON.parse(data);
      }
    }
  } catch (error) {
    console.error('Error reading progress file:', error);
  }
  return {};
};

// Helper to save progress
exports.saveProgress = (videoId, timestamp) => {
  try {
    const progress = this.getAllProgress();
    progress[videoId] = timestamp;
    fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving progress:', error);
    return false;
  }
};

// Get video information
exports.getVideoInfo = (filePath, relativePath) => {
  const stats = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const name = path.basename(filePath);
  const nameWithoutExt = path.basename(filePath, ext);
  
  // Get relative path for thumbnail lookup
  const relativeDir = path.dirname(relativePath);
  const thumbnailRelativePath = relativeDir === '.' ? 
    nameWithoutExt : 
    path.join(relativeDir, nameWithoutExt);
  
  // Get thumbnail - this now just returns existing thumbnail or placeholder
  const thumbnail = this.getThumbnail(thumbnailRelativePath, filePath);
  
  // Generate YouTube-like metadata
  const views = Math.floor(Math.random() * 1000000) + 1000;
  const likes = Math.floor(Math.random() * 10000) + 100;
  const uploadDate = new Date(Date.now() - Math.random() * 31536000000);
  
  // Clean title
  const cleanTitle = this.cleanTitle(nameWithoutExt);
  
  // Get channel info based on folder
  const channel = this.getChannelInfo(relativePath);
  
  // Generate duration
  const duration = this.generateRandomDuration();
  
  const tags = this.generateTags(relativePath);
  
  // Get saved progress
  const allProgress = this.getAllProgress();
  const progress = allProgress[relativePath.replace(/\\/g, '/')] || 0;

  return {
    progress: progress,
    id: relativePath.replace(/\\/g, '/'), // Use forward slashes for URLs
    filename: name,
    title: cleanTitle,
    channel: channel.name,
    channelAvatar: channel.avatar,
    channelId: channel.id,
    url: `/videos/${encodeURIComponent(relativePath.replace(/\\/g, '/'))}`,
    thumbnail: thumbnail,
    duration: duration,
    views: views.toLocaleString(),
    likes: likes.toLocaleString(),
    uploadDate: this.formatUploadDate(uploadDate),
    size: formatFileSize(stats.size),
    type: ext.replace('.', '').toUpperCase(),
    createdAt: stats.birthtime,
    relativePath: relativePath.replace(/\\/g, '/'),
    folder: path.dirname(relativePath).replace(/\\/g, '/'),
    tags: tags,
    category: this.getCategoryFromPath(relativePath)
  };
};

// Helper for recursive thumbnail search
const findThumbnailAnywhere = (dir, fileName, extensions, baseDir) => {
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    // Check files in current directory first
    for (const ext of extensions) {
      if (fs.existsSync(path.join(dir, fileName + ext))) {
        return path.relative(baseDir, path.join(dir, fileName + ext));
      }
    }
    
    // Search in subdirectories
    for (const item of items) {
      if (item.isDirectory()) {
        const result = findThumbnailAnywhere(path.join(dir, item.name), fileName, extensions, baseDir);
        if (result) return result;
      }
    }
  } catch (err) {
    console.error(`Error searching thumbnails in ${dir}:`, err);
  }
  return null;
};

// Get thumbnail path, return existing thumbnail or placeholder ONLY
exports.getThumbnail = (thumbnailRelativePath, videoFilePath) => {
  const thumbnailExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const thumbnailsBaseDir = path.join(__dirname, '../public/thumbnails');
  
  // First, try to find thumbnail in the same relative path
  for (const thumbExt of thumbnailExtensions) {
    const thumbPath = path.join(thumbnailsBaseDir, thumbnailRelativePath + thumbExt);
    if (fs.existsSync(thumbPath)) {
      return `/thumbnails/${encodeURIComponent(thumbnailRelativePath.replace(/\\/g, '/') + thumbExt)}`;
    }
  }
  
  // If not found, try just the filename in root thumbnails folder (backward compatibility)
  const fileName = path.basename(thumbnailRelativePath);
  for (const thumbExt of thumbnailExtensions) {
    const thumbPath = path.join(thumbnailsBaseDir, fileName + thumbExt);
    if (fs.existsSync(thumbPath)) {
      return `/thumbnails/${encodeURIComponent(fileName + thumbExt)}`;
    }
  }

  // NEW: Search in entire thumbnails directory
  const foundRelativePath = findThumbnailAnywhere(thumbnailsBaseDir, fileName, thumbnailExtensions, thumbnailsBaseDir);
  if (foundRelativePath) {
    return `/thumbnails/${encodeURIComponent(foundRelativePath.replace(/\\/g, '/'))}`;
  }
  
  // If thumbnail not found, return placeholder immediately
  // DO NOT try to extract frame - that will be done in background
  return this.generatePlaceholderThumbnail(fileName);
};

// Generate placeholder thumbnail (same as before)
exports.generatePlaceholderThumbnail = (nameWithoutExt) => {
  const colors = [
    'ff6b6b', '48dbfb', '1dd1a1', 'feca57', 'ff9ff3', '54a0ff', '5f27cd', '00d2d3'
  ];
  
  const hash = nameWithoutExt.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const color = colors[Math.abs(hash) % colors.length];
  return `https://via.placeholder.com/320x180/${color}/ffffff?text=${encodeURIComponent(nameWithoutExt.substring(0, 20))}`;
};

// The rest of the functions remain the same...
exports.cleanTitle = (nameWithoutExt) => {
  return nameWithoutExt
    .replace(/[-_]/g, ' ')
    .replace(/\.[^/.]+$/, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Get channel info based on folder path
exports.getChannelInfo = (relativePath) => {
  const folderPath = path.dirname(relativePath);
  
  // Map common folder names to channels
  const folderToChannel = {
    '': { name: 'Your Videos', id: 'your-videos', color: '065fd4' },
    'gaming': { name: 'Gaming Channel', id: 'gaming', color: 'ff0000' },
    'music': { name: 'Music Videos', id: 'music', color: '1dd1a1' },
    'movies': { name: 'Movie Trailers', id: 'movies', color: 'ff6b6b' },
    'tutorials': { name: 'Learning Channel', id: 'tutorials', color: '00a2ff' },
    'funny': { name: 'Funny Clips', id: 'funny', color: 'f00' },
    'tech': { name: 'Tech Videos', id: 'tech', color: '48dbfb' }
  };
  
  // Split folder path and look for matches
  const folderParts = folderPath.split(path.sep);
  let channel = folderToChannel[''];
  
  // Check if any folder part matches a channel
  for (const part of folderParts) {
    const lowerPart = part.toLowerCase();
    if (folderToChannel[lowerPart]) {
      channel = folderToChannel[lowerPart];
      break;
    }
  }
  
  // Generate avatar URL
  const avatar = `https://ui-avatars.com/api/?name=${channel.name.replace(/ /g, '+')}&background=${channel.color}&color=fff&bold=true`;
  
  return {
    name: channel.name,
    id: channel.id,
    avatar: avatar,
    color: channel.color
  };
};

// Generate tags based on folder structure and filename
exports.generateTags = (relativePath) => {
  const tags = new Set();
  const fileName = path.basename(relativePath, path.extname(relativePath));
  
  // Add folder names as tags
  const folderParts = path.dirname(relativePath).split(path.sep);
  folderParts.forEach(part => {
    if (part) {
      tags.add(part.toLowerCase().replace(/[^a-z0-9]/g, ''));
    }
  });
  
  // Add words from filename as tags
  fileName.split(/[-_\.\s]+/).forEach(word => {
    const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanWord.length > 2) {
      tags.add(cleanWord);
    }
  });
  
  // Add some random generic tags
  const genericTags = ['video', 'upload', 'content', 'media', 'clip', 'file'];
  genericTags.forEach(tag => tags.add(tag));
  
  return Array.from(tags).slice(0, 10); // Limit to 10 tags
};

// Get category from path
exports.getCategoryFromPath = (relativePath) => {
  const folderPath = path.dirname(relativePath);
  if (!folderPath || folderPath === '.') return 'All Videos';
  
  const folderName = folderPath.split(path.sep)[0];
  return folderName.charAt(0).toUpperCase() + folderName.slice(1).replace(/[-_]/g, ' ');
};

// Generate random duration
exports.generateRandomDuration = () => {
  const totalSeconds = Math.floor(Math.random() * 1800) + 60;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Format upload date
exports.formatUploadDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};