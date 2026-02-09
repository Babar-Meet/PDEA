const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');
const ambienceDir = path.join(publicDir, 'ambience');
const thumbnailsDir = path.join(publicDir, 'thumbnails', 'ambience');

// Supported audio/video extensions for ambience
const ambienceExtensions = ['.mp3', '.wav', '.ogg', '.mp4', '.webm', '.m4a'];

exports.getAmbienceFiles = async (req, res) => {
  try {
    if (!fs.existsSync(ambienceDir)) {
      return res.json({ success: true, files: [] });
    }

    const files = fs.readdirSync(ambienceDir, { withFileTypes: true });
    const ambienceFiles = [];

    for (const file of files) {
      if (file.isFile()) {
        const ext = path.extname(file.name).toLowerCase();
        if (ambienceExtensions.includes(ext)) {
          const nameWithoutExt = path.basename(file.name, ext);
          
          // Check for thumbnail
          let thumbnail = null;
          const thumbExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
          
          if (fs.existsSync(thumbnailsDir)) {
            for (const tExt of thumbExtensions) {
              const thumbPath = path.join(thumbnailsDir, nameWithoutExt + tExt);
              if (fs.existsSync(thumbPath)) {
                thumbnail = `/public/thumbnails/ambience/${nameWithoutExt}${tExt}`;
                break;
              }
            }
          }

          // Fallback thumbnail - check if a file with same name but image ext exists in ambience folder too
          if (!thumbnail) {
            for (const tExt of thumbExtensions) {
              const thumbPath = path.join(ambienceDir, nameWithoutExt + tExt);
              if (fs.existsSync(thumbPath)) {
                thumbnail = `/public/ambience/${nameWithoutExt}${tExt}`;
                break;
              }
            }
          }

          ambienceFiles.push({
            id: file.name,
            title: nameWithoutExt.replace(/[-_]/g, ' ').split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' '),
            filename: file.name,
            path: `/public/ambience/${file.name}`,
            thumbnail: thumbnail,
            extension: ext,
            type: ext.startsWith('.mp4') || ext.startsWith('.webm') ? 'video' : 'audio'
          });
        }
      }
    }

    res.json({ success: true, files: ambienceFiles });
  } catch (error) {
    console.error('Error reading ambience files:', error);
    res.status(500).json({ success: false, error: 'Failed to load ambience' });
  }
};
