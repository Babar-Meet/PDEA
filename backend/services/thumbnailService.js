const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

const thumbnailsDir = path.join(__dirname, '../public/thumbnails');

// Global state for tracking thumbnail generation
let thumbnailState = {
  isGenerating: false,
  totalToGenerate: 0,
  generated: 0,
  failed: 0,
  currentFile: '',
  queue: [],
  completed: new Set(),
  failedSet: new Set(),
  allVideoFiles: []
};

// Helper for recursive thumbnail search
const findThumbnailAnywhere = (dir, fileName, extensions) => {
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    // Check files in current directory first
    for (const ext of extensions) {
      if (fs.existsSync(path.join(dir, fileName + ext))) {
        return true;
      }
    }
    
    // Search in subdirectories
    for (const item of items) {
      if (item.isDirectory()) {
        const found = findThumbnailAnywhere(path.join(dir, item.name), fileName, extensions);
        if (found) return true;
      }
    }
  } catch (err) {
    console.error(`Error searching thumbnails in ${dir}:`, err);
  }
  return false;
};

// Check if thumbnail already exists for a video
function doesThumbnailExist(videoFile) {
  const { relativePath } = videoFile;
  const nameWithoutExt = path.basename(relativePath, path.extname(relativePath));
  const relativeDir = path.dirname(relativePath);
  const thumbnailRelativePath = relativeDir === '.' ? 
    nameWithoutExt : 
    path.join(relativeDir, nameWithoutExt);
  
  const thumbnailExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  
  // 1. Try to find thumbnail in the same relative path
  for (const thumbExt of thumbnailExtensions) {
    const thumbPath = path.join(thumbnailsDir, thumbnailRelativePath + thumbExt);
    if (fs.existsSync(thumbPath)) {
      return true;
    }
  }
  
  // 2. Also check root thumbnails folder for backward compatibility
  for (const thumbExt of thumbnailExtensions) {
    const thumbPath = path.join(thumbnailsDir, nameWithoutExt + thumbExt);
    if (fs.existsSync(thumbPath)) {
      return true;
    }
  }

  // 3. Search in entire thumbnails directory
  return findThumbnailAnywhere(thumbnailsDir, nameWithoutExt, thumbnailExtensions);
}

// Get videos that need thumbnails
function getVideosNeedingThumbnails(videoFiles) {
  return videoFiles.filter(videoFile => !doesThumbnailExist(videoFile));
}

// Generate thumbnail for a single video
async function generateThumbnailForVideo(videoFile) {
  const { absolutePath, relativePath } = videoFile;
  
  try {
    // Update current file in state BEFORE starting generation
    thumbnailState.currentFile = relativePath;
    
    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      console.log(`Video file not found: ${absolutePath}`);
      return false;
    }
    
    const nameWithoutExt = path.basename(relativePath, path.extname(relativePath));
    const relativeDir = path.dirname(relativePath);
    const thumbnailRelativePath = relativeDir === '.' ? 
      nameWithoutExt : 
      path.join(relativeDir, nameWithoutExt);
    
    const thumbnailPath = path.join(thumbnailsDir, thumbnailRelativePath + '.jpg');
    const thumbnailDir = path.dirname(thumbnailPath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }
    
    return new Promise((resolve, reject) => {
      ffmpeg(absolutePath)
        .on('end', () => {
          if (fs.existsSync(thumbnailPath)) {
            console.log(`Successfully generated thumbnail for: ${relativePath}`);
            resolve(true);
          } else {
            console.log(`Failed to generate thumbnail for: ${relativePath}`);
            resolve(false);
          }
        })
        .on('error', (err) => {
          console.error(`Error generating thumbnail for ${relativePath}:`, err.message);
          resolve(false);
        })
        .screenshots({
          count: 1,
          filename: path.basename(thumbnailRelativePath) + '.jpg',
          folder: thumbnailDir,
          size: '320x180',
          timemarks: ['10%'] // Take frame at 10% of video duration
        });
    });
  } catch (error) {
    console.error(`Error in thumbnail generation for ${relativePath}:`, error);
    return false;
  }
}

// Process thumbnail queue in background
async function processThumbnailQueue() {
  const videosNeedingThumbnails = getVideosNeedingThumbnails(thumbnailState.allVideoFiles);
  
  if (videosNeedingThumbnails.length === 0) {
    console.log('No thumbnails needed.');
    thumbnailState.isGenerating = false;
    thumbnailState.currentFile = '';
    return;
  }
  
  // Reset state for new run
  thumbnailState.isGenerating = true;
  thumbnailState.totalToGenerate = videosNeedingThumbnails.length;
  thumbnailState.generated = 0;
  thumbnailState.failed = 0;
  thumbnailState.queue = videosNeedingThumbnails.map(v => v.relativePath);
  thumbnailState.completed.clear();
  thumbnailState.failedSet.clear();
  thumbnailState.currentFile = '';
  
  console.log(`Starting thumbnail generation for ${videosNeedingThumbnails.length} videos`);
  
  // Process videos sequentially to better track progress
  for (let i = 0; i < videosNeedingThumbnails.length; i++) {
    const videoFile = videosNeedingThumbnails[i];
    
    try {
      const success = await generateThumbnailForVideo(videoFile);
      
      if (success) {
        thumbnailState.generated++;
        thumbnailState.completed.add(videoFile.relativePath);
      } else {
        thumbnailState.failed++;
        thumbnailState.failedSet.add(videoFile.relativePath);
      }
      
      // Remove from queue
      thumbnailState.queue = thumbnailState.queue.filter(path => path !== videoFile.relativePath);
      
      // Clear current file
      thumbnailState.currentFile = '';
      
      // Small delay between videos to avoid overloading
      if (i < videosNeedingThumbnails.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.error(`Error processing ${videoFile.relativePath}:`, error);
      thumbnailState.failed++;
      thumbnailState.failedSet.add(videoFile.relativePath);
      thumbnailState.queue = thumbnailState.queue.filter(path => path !== videoFile.relativePath);
      thumbnailState.currentFile = '';
    }
  }
  
  thumbnailState.isGenerating = false;
  console.log(`Thumbnail generation completed. Generated: ${thumbnailState.generated}, Failed: ${thumbnailState.failed}`);
}

// Start thumbnail generation in background
exports.startBackgroundThumbnailGeneration = async (videoFiles) => {
  // Don't start if already generating
  if (thumbnailState.isGenerating) {
    console.log('Thumbnail generation already in progress');
    return { success: true, alreadyRunning: true };
  }
  
  // Store video files for processing
  thumbnailState.allVideoFiles = videoFiles;
  
  // Start processing in background without awaiting
  processThumbnailQueue().catch(error => {
    console.error('Thumbnail generation failed:', error);
    thumbnailState.isGenerating = false;
    thumbnailState.currentFile = '';
  });
  
  const videosNeedingThumbnails = getVideosNeedingThumbnails(videoFiles);
  
  return { 
    success: true, 
    started: true, 
    total: videosNeedingThumbnails.length
  };
};

// Get current thumbnail generation state
exports.getThumbnailState = () => {
  const totalProcessed = thumbnailState.generated + thumbnailState.failed;
  const isComplete = !thumbnailState.isGenerating && totalProcessed >= thumbnailState.totalToGenerate;
  
  return {
    isGenerating: thumbnailState.isGenerating,
    totalToGenerate: thumbnailState.totalToGenerate,
    generated: thumbnailState.generated,
    failed: thumbnailState.failed,
    currentFile: thumbnailState.currentFile,
    queueLength: thumbnailState.queue.length,
    isComplete: isComplete,
    totalProcessed: totalProcessed,
    remaining: Math.max(0, thumbnailState.totalToGenerate - totalProcessed)
  };
};

// Check how many thumbnails are needed
exports.getThumbnailsNeededCount = (videoFiles) => {
  return getVideosNeedingThumbnails(videoFiles).length;
};