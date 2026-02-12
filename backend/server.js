require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const downloadManager = require('./services/DownloadManager');

const videoRoutes = require('./routes/videoRoutes');
const healthRoutes = require('./routes/healthRoutes');
const downloadRoutes = require('./routes/downloadRoutes');
const ambienceRoutes = require('./routes/ambienceRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const subscriptionService = require('./services/subscriptionService');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const publicDir = path.join(__dirname, 'public');
const thumbnailsDir = path.join(publicDir, 'thumbnails');
const trashDir = path.join(publicDir, 'trash');
const ambienceDir = path.join(publicDir, 'ambience');
const ambienceThumbnailsDir = path.join(thumbnailsDir, 'ambience');

[publicDir, thumbnailsDir, trashDir, ambienceDir, ambienceThumbnailsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use('/public', express.static(publicDir));
app.use('/thumbnails', express.static(thumbnailsDir));
app.use('/trash', express.static(trashDir));

app.use('/api/videos', videoRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/ambience', ambienceRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

const frontendBuildPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendBuildPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

const server = http.createServer(app);

const wss = new WebSocket.Server({ server, path: '/ws/downloads' });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  downloadManager.registerWSClient(ws);

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

server.listen(PORT, '0.0.0.0', async () => {
  const networkInterfaces = require('os').networkInterfaces();
  const getLocalIp = () => {
    for (const name of Object.keys(networkInterfaces)) {
      for (const net of networkInterfaces[name]) {
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
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws/downloads`);
  
  // Initialize subscription service
  await subscriptionService.initialize();
  console.log('📡 Subscription service initialized');
});