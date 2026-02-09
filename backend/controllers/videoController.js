const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const videoService = require('../services/videoService');
const thumbnailService = require('../services/thumbnailService'); 

// const publicDir = path.join('C:', 'folder', 'subfoler', 'subsub folder');

const publicDir = path.join(__dirname, '../public');
const thumbnailsDir = path.join(publicDir, 'thumbnails');
const trashDir = path.join(publicDir, 'trash');
const ambienceDir = path.join(publicDir, 'ambience');

// Supported video extensions
const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv', '.wmv', '.m4v'];

// Recursive function to find all video files in a directory
function findVideoFiles(dir, basePath = '', results = []) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    const relativePath = path.join(basePath, file.name);
    
    if (file.isDirectory()) {
      const lowerName = file.name.toLowerCase();
      // ABSOLUTE SKIP for protected internal directories
      if (lowerName === 'ambience' || lowerName === 'trash' || lowerName === 'thumbnails' || lowerName === '.gemini' || lowerName === '.git') {
        continue;
      }
      // Recursively search in subdirectories
      findVideoFiles(fullPath, relativePath, results);
    } else {
      const ext = path.extname(file.name).toLowerCase();
      if (videoExtensions.includes(ext)) {
        results.push({
          absolutePath: fullPath,
          relativePath: relativePath,
          filename: file.name,
          extension: ext
        });
      }
    }
  }
  
  return results;
}

// Get all videos from entire public directory (excluding trash)
exports.getAllVideos = async (req, res) => {
  try {
    if (!fs.existsSync(publicDir)) {
      return res.json({ 
        success: true, 
        videos: [],
        categories: [],
        total: 0,
        thumbnailsNeeded: 0,
        thumbnailGenerationInProgress: false
      });
    }

    // Find all video files in the public directory (excluding trash and ambience)
    const videoFiles = findVideoFiles(publicDir).filter(video => {
      return !video.absolutePath.includes(trashDir) && !video.absolutePath.includes(ambienceDir);
    });
    
    // Get video info for each file (async)
    const videos = [];
    for (const videoFile of videoFiles) {
      const videoInfo = await videoService.getVideoInfo(videoFile.absolutePath, videoFile.relativePath);
      videos.push(videoInfo);
    }

    // Create categories based on folder structure
    const categories = createCategories(videos);
    
    // Check how many thumbnails are needed
    const thumbnailsNeeded = thumbnailService.getThumbnailsNeededCount(videoFiles);
    
    // Start background thumbnail generation if needed
    let thumbnailGenerationInProgress = false;
    if (thumbnailsNeeded > 0 && !req.query.skipThumbnailGeneration) {
      thumbnailGenerationInProgress = thumbnailService.startBackgroundThumbnailGeneration(videoFiles);
    }

    res.json({ 
      success: true, 
      videos,
      categories,
      total: videos.length,
      thumbnailsNeeded,
      thumbnailGenerationInProgress
    });
    
  } catch (error) {
    console.error('Error reading videos:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load videos' 
    });
  }
};

// Add new endpoint for thumbnail progress
exports.getThumbnailProgress = async (req, res) => {
  try {
    const progress = thumbnailService.getThumbnailState();
    res.json({
      success: true,
      ...progress
    });
  } catch (error) {
    console.error('Error getting thumbnail progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get thumbnail progress'
    });
  }
};

// Save video progress
exports.saveVideoProgress = async (req, res) => {
  try {
    const { videoId, timestamp } = req.body;
    
    if (!videoId || timestamp === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing videoId or timestamp' 
      });
    }

    const success = videoService.saveProgress(videoId, timestamp);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save progress' });
    }
  } catch (error) {
    console.error('Error saving progress:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// The rest of your controller functions remain exactly the same...
// Create categories from folder structure
function createCategories(videos) {
  const categories = new Map();
  
  videos.forEach(video => {
    const pathParts = video.relativePath.split('/'); // Use forward slashes as set in videoService
    const directoryPath = pathParts.slice(0, -1).join('/'); 
    
    // Safety check again: if the folder path starts with ambience or trash, ignore it
    const lowerDir = directoryPath.toLowerCase();
    if (directoryPath && !lowerDir.startsWith('ambience') && !lowerDir.startsWith('trash')) {
      // Split by directory to create subcategories
      let currentPath = '';
      pathParts.slice(0, -1).forEach(part => {
        currentPath = currentPath ? path.join(currentPath, part) : part;
        
        if (!categories.has(currentPath)) {
          categories.set(currentPath, {
            name: part,
            path: currentPath,
            displayName: part.replace(/[-_]/g, ' ').split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' '),
            count: 0,
            thumbnail: null,
            videos: []
          });
        }
        
        const category = categories.get(currentPath);
        category.count++;
        if (!category.thumbnail && video.thumbnail) {
          category.thumbnail = video.thumbnail;
        }
        category.videos.push(video.id);
      });
    }
  });

  // Convert to array and sort by count
  return Array.from(categories.values())
    .map(category => ({
      ...category,
      videos: category.videos.slice(0, 4) // Only keep first 4 videos for preview
    }))
    .sort((a, b) => b.count - a.count);
}

// Get video by relative path
exports.getVideo = async (req, res) => {
  try {
    const relativePath = decodeURIComponent(req.params.path);
    const filePath = path.join(publicDir, relativePath);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Video not found' 
      });
    }
    
    const videoInfo = await videoService.getVideoInfo(filePath, relativePath);
    res.json({ success: true, video: videoInfo });
    
  } catch (error) {
    console.error('Error getting video:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get video' 
    });
  }
};

// Stream video with seeking support
exports.streamVideo = async (req, res) => {
  try {
    const relativePath = decodeURIComponent(req.params.path);
    const filePath = path.join(publicDir, relativePath);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': exports.getContentType(path.extname(filePath)),
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': exports.getContentType(path.extname(filePath)),
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error('Error streaming video:', error);
    res.status(500).json({ error: 'Failed to stream video' });
  }
};

// Helper function to get content type
exports.getContentType = (ext) => {
  const contentTypes = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.flv': 'video/x-flv',
    '.wmv': 'video/x-ms-wmv',
    '.m4v': 'video/x-m4v'
  };
  
  return contentTypes[ext.toLowerCase()] || 'video/mp4';
};

// Get videos by category/folder
exports.getVideosByCategory = async (req, res) => {
  try {
    const categoryPath = decodeURIComponent(req.params.categoryPath || '');
    
    // Find all video files in the public directory (excluding trash and ambience)
    const videoFiles = findVideoFiles(publicDir).filter(video => {
      return !video.absolutePath.includes(trashDir) && !video.absolutePath.includes(ambienceDir);
    });
    
    // Filter videos by category/folder
    const categoryVideos = [];
    for (const videoFile of videoFiles) {
      const videoRelativePath = videoFile.relativePath;
      const videoDir = path.dirname(videoRelativePath);
      if (videoDir === categoryPath || 
          (categoryPath === '' && videoDir === '') ||
          videoDir.startsWith(categoryPath + path.sep)) {
        const videoInfo = await videoService.getVideoInfo(videoFile.absolutePath, videoFile.relativePath);
        categoryVideos.push(videoInfo);
      }
    }

    // Get category info
    const categoryName = categoryPath.split(path.sep).pop() || 'All Videos';
    const displayName = categoryName.replace(/[-_]/g, ' ').split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    res.json({ 
      success: true, 
      category: {
        name: categoryName,
        displayName: displayName,
        path: categoryPath,
        count: categoryVideos.length,
        videos: categoryVideos
      }
    });
    
  } catch (error) {
    console.error('Error getting category videos:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load category videos' 
    });
  }
};

// Move video to trash
exports.moveToTrash = async (req, res) => {
  try {
    const relativePath = decodeURIComponent(req.params.path);
    const videoPath = path.join(publicDir, relativePath);
    
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Video not found' 
      });
    }
    
    // Get video filename and create trash path
    const videoFilename = path.basename(videoPath);
    const trashVideoPath = path.join(trashDir, videoFilename);
    
    // Ensure trash directory exists
    if (!fs.existsSync(trashDir)) {
      fs.mkdirSync(trashDir, { recursive: true });
    }
    
    // Move video file to trash
    fs.renameSync(videoPath, trashVideoPath);
    
    // We're NOT moving thumbnails anymore - just delete them
    const thumbnailExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const nameWithoutExt = path.basename(relativePath, path.extname(relativePath));
    const relativeDir = path.dirname(relativePath);
    const thumbnailRelativePath = relativeDir === '.' ? 
      nameWithoutExt : 
      path.join(relativeDir, nameWithoutExt);
    
    let thumbnailDeleted = false;
    
    // Try to delete thumbnail if it exists
    for (const thumbExt of thumbnailExtensions) {
      const thumbPath = path.join(thumbnailsDir, thumbnailRelativePath + thumbExt);
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
        thumbnailDeleted = true;
        break;
      }
    }
    
    // If not found, try just the filename in root thumbnails folder
    if (!thumbnailDeleted) {
      const fileName = path.basename(thumbnailRelativePath);
      for (const thumbExt of thumbnailExtensions) {
        const thumbPath = path.join(thumbnailsDir, fileName + thumbExt);
        if (fs.existsSync(thumbPath)) {
          fs.unlinkSync(thumbPath);
          thumbnailDeleted = true;
          break;
        }
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Video moved to trash successfully',
      thumbnailDeleted: thumbnailDeleted
    });
    
  } catch (error) {
    console.error('Error moving video to trash:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to move video to trash' 
    });
  }
};

// Permanently delete video
exports.deletePermanently = async (req, res) => {
  try {
    const relativePath = decodeURIComponent(req.params.path);
    const videoPath = path.join(publicDir, relativePath);
    
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Video not found' 
      });
    }
    
    // Delete video file
    fs.unlinkSync(videoPath);
    
    // Try to find and delete thumbnail if it exists
    const thumbnailExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const nameWithoutExt = path.basename(relativePath, path.extname(relativePath));
    const relativeDir = path.dirname(relativePath);
    const thumbnailRelativePath = relativeDir === '.' ? 
      nameWithoutExt : 
      path.join(relativeDir, nameWithoutExt);
    
    let thumbnailDeleted = false;
    
    // First, try to find thumbnail in the same relative path
    for (const thumbExt of thumbnailExtensions) {
      const thumbPath = path.join(thumbnailsDir, thumbnailRelativePath + thumbExt);
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
        thumbnailDeleted = true;
        break;
      }
    }
    
    // If not found, try just the filename in root thumbnails folder
    if (!thumbnailDeleted) {
      const fileName = path.basename(thumbnailRelativePath);
      for (const thumbExt of thumbnailExtensions) {
        const thumbPath = path.join(thumbnailsDir, fileName + thumbExt);
        if (fs.existsSync(thumbPath)) {
          fs.unlinkSync(thumbPath);
          thumbnailDeleted = true;
          break;
        }
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Video deleted permanently',
      thumbnailDeleted: thumbnailDeleted
    });
    
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete video' 
    });
  }
};

// Get all videos in trash (SIMPLIFIED - just list files)
exports.getTrashVideos = async (req, res) => {
  try {
    if (!fs.existsSync(trashDir)) {
      return res.json({ 
        success: true, 
        videos: [],
        total: 0
      });
    }

    // Get all files in trash directory
    const files = fs.readdirSync(trashDir);
    
    // Filter for video files only
    const videoFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return videoExtensions.includes(ext);
    });
    
    // Create simple video info (no thumbnails)
    const videos = videoFiles.map(filename => {
      const filePath = path.join(trashDir, filename);
      const stats = fs.statSync(filePath);
      const ext = path.extname(filename).toLowerCase();
      const nameWithoutExt = path.basename(filename, ext);
      
      return {
        id: `trash:${filename}`,
        filename: filename,
        title: nameWithoutExt.replace(/[-_]/g, ' ').split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        size: formatFileSize(stats.size),
        type: ext.replace('.', '').toUpperCase(),
        deletedDate: stats.mtime,
        inTrash: true
      };
    });

    res.json({ 
      success: true, 
      videos,
      total: videos.length
    });
    
  } catch (error) {
    console.error('Error reading trash videos:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load trash videos' 
    });
  }
};

// Empty trash (delete all files in trash folder)
exports.emptyTrash = async (req, res) => {
  try {
    if (!fs.existsSync(trashDir)) {
      return res.json({ 
        success: true, 
        message: 'Trash is already empty',
        deletedCount: 0
      });
    }

    const files = fs.readdirSync(trashDir);
    let deletedCount = 0;
    let errors = [];

    files.forEach(file => {
      try {
        const filePath = path.join(trashDir, file);
        fs.unlinkSync(filePath);
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting ${file}:`, error);
        errors.push(file);
      }
    });

    res.json({ 
      success: true, 
      message: `Trash emptied successfully. Deleted ${deletedCount} files.`,
      deletedCount,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Error emptying trash:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to empty trash' 
    });
  }
};

// NEW: Open video folder in explorer
exports.openFolder = async (req, res) => {
  try {
    const relativePath = decodeURIComponent(req.params.path);
    const videoPath = path.join(publicDir, relativePath);
    const folderPath = path.dirname(videoPath);

    if (!fs.existsSync(folderPath)) {
      return res.status(404).json({
        success: false,
        error: 'Folder not found'
      });
    }

    // Windows command to open explorer and select the file
    // explorer.exe /select,"path\to\file"
    const command = `explorer.exe /select,"${videoPath}"`;

    exec(command, (error) => {
      // explorer.exe often returns exit code 1 even when successful
      if (error && error.code !== 1) {
        console.error('Error opening folder:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to open folder'
        });
      }
      res.json({ success: true, message: 'Folder opened successfully' });
    });

  } catch (error) {
    console.error('Error in openFolder:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// NEW: Update video thumbnail
exports.updateThumbnail = async (req, res) => {
  try {
    const { relativePath, image } = req.body;
    
    if (!relativePath || !image) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing relativePath or image data' 
      });
    }

    // Determine thumbnail path (same logic as videoService/thumbnailService)
    const nameWithoutExt = path.basename(relativePath, path.extname(relativePath));
    const relativeDir = path.dirname(relativePath);
    const thumbnailRelativeName = relativeDir === '.' ? 
      nameWithoutExt : 
      path.join(relativeDir, nameWithoutExt);
    
    // We'll save as .jpg as it's the standard for this app
    const thumbnailPath = path.join(thumbnailsDir, thumbnailRelativeName + '.jpg');
    const thumbnailDir = path.dirname(thumbnailPath);

    // Ensure directory exists
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }

    // Backup and remove old thumbnails with different extensions if they exist
    const extensions = ['.jpg', '.jpeg', '.png', '.webp'];
    for (const ext of extensions) {
      try {
        const p = path.join(thumbnailsDir, thumbnailRelativeName + ext);
        if (fs.existsSync(p)) {
          // Backup to trash before deleting
          const backupDir = path.join(trashDir, 'thumbnails_backup');
          if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
          }

          // Generate unique backup name with numbering (01, 02, 03...)
          let version = 1;
          let backupPath;
          let backupFileName;
          do {
            const vStr = version.toString().padStart(2, '0');
            backupFileName = `${thumbnailRelativeName.replace(/[\\/]/g, '_')}_${vStr}${ext}`;
            backupPath = path.join(backupDir, backupFileName);
            version++;
          } while (fs.existsSync(backupPath));

          // Copy to backup
          fs.copyFileSync(p, backupPath);
          
          // Delete original
          fs.unlinkSync(p);
        }
      } catch (e) {
        console.warn(`Could not backup/delete old thumbnail: ${e.message}`);
      }
    }

    // Convert base64 to buffer
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length === 0) {
      throw new Error('Converted buffer is empty');
    }

    // Save the file
    fs.writeFileSync(thumbnailPath, buffer);

    res.json({ 
      success: true, 
      message: 'Thumbnail updated successfully',
      path: `/thumbnails/${encodeURIComponent(thumbnailRelativeName.replace(/\\/g, '/') + '.jpg')}`
    });

  } catch (error) {
    console.error('Error updating thumbnail:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to update thumbnail' 
    });
  }
};

// Helper function to format file size (copied from format.js)
function formatFileSize(bytes = 0) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 ** 3) return (bytes / 1024 ** 2).toFixed(1) + ' MB'
  return (bytes / 1024 ** 3).toFixed(1) + ' GB'
}