require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

// Import routes
const videoRoutes = require('./routes/videoRoutes');
const healthRoutes = require('./routes/healthRoutes');
const downloadRoutes = require('./routes/downloadRoutes');
const ambienceRoutes = require('./routes/ambienceRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Ensure public directory exists
const publicDir = path.join(__dirname, 'public');
const thumbnailsDir = path.join(publicDir, 'thumbnails');
const trashDir = path.join(publicDir, 'trash');
const ambienceDir = path.join(publicDir, 'ambience');
const ambienceThumbnailsDir = path.join(thumbnailsDir, 'ambience');

[publicDir, thumbnailsDir, trashDir, ambienceDir, ambienceThumbnailsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Serve static files
app.use('/public', express.static(publicDir));
app.use('/thumbnails', express.static(thumbnailsDir));
app.use('/trash', express.static(trashDir)); // <- Moved here, after trashDir is defined

// Use routes
app.use('/api/videos', videoRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/ambience', ambienceRoutes);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  const networkInterfaces = require('os').networkInterfaces();
  const getLocalIp = () => {
    for (const name of Object.keys(networkInterfaces)) {
      for (const net of networkInterfaces[name]) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
    return 'localhost';
  };
  const localIp = getLocalIp();

  console.log(`🚀 Server running locally: http://localhost:${PORT}`);
  console.log(`🌐 Server running on network: http://${localIp}:${PORT}`);
  console.log(`📁 Public directory: ${publicDir}`);
  console.log(`🖼️  Thumbnails: ${thumbnailsDir}`);
  console.log(`🗑️  Trash folder: ${trashDir}`);
  console.log(`📥 Download API: http://localhost:${PORT}/api/download`);
});