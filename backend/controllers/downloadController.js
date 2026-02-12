const downloadService = require('../services/downloadService');
const downloadManager = require('../services/DownloadManager');

exports.getDirectories = (req, res) => {
  try {
    const directories = downloadService.getDirectories();
    res.json({ success: true, directories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getFormats = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    const data = await downloadService.getFormats(url);
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch formats: ' + error.message });
  }
};

exports.getDirectMetadata = async (req, res) => {
  try {
    const { url, clientInfo } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    const info = await downloadService.getDirectInfo(url, clientInfo || {});
    const data = downloadService.buildDirectMetadata(info);
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch video details: ' + error.message });
  }
};

exports.getPlaylistInfo = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    const data = await downloadService.getPlaylistInfo(url);
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch playlist info: ' + error.message });
  }
};

exports.startDownload = (req, res) => {
  try {
    const { url, format_id, save_dir, metadata } = req.body;
    
    if (!url || !format_id) {
      return res.status(400).json({ success: false, error: 'URL and format_id are required' });
    }

    const downloadId = downloadService.startDownload(url, format_id, save_dir, metadata);
    res.json({ success: true, download_id: downloadId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.startDirectDownload = async (req, res) => {
  try {
    const { url, save_dir, mode, qualityKey, audioLanguage, metadata, clientInfo } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    const downloadId = await downloadService.startDirectDownload({
      url,
      saveDir: save_dir,
      mode: mode || 'original',
      qualityKey,
      audioLanguage,
      metadata,
      clientInfo: clientInfo || {}
    });

    res.json({ success: true, download_id: downloadId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getDownloadStatus = (req, res) => {
  try {
    const { id } = req.params;
    const status = downloadService.getDownloadStatus(id);
    
    if (!status) {
      return res.status(404).json({ success: false, error: 'Download not found' });
    }
    
    res.json({ success: true, ...status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAllDownloads = (req, res) => {
  try {
    const downloads = downloadService.getAllDownloads();
    res.json({ success: true, downloads });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.retryDownload = (req, res) => {
  try {
    const { id } = req.params;
    const success = downloadService.retryDownload(id);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.cancelDownload = (req, res) => {
  try {
    const { id } = req.params;
    const success = downloadService.cancelDownload(id);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.cleanupOrphanedFiles = (req, res) => {
  try {
    const result = downloadManager.cleanupOrphanedFiles();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getSettings = (req, res) => {
  res.json({ success: true, settings: downloadService.settings });
};

exports.updateSettings = (req, res) => {
  try {
    const settings = downloadService.saveSettings(req.body);
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
