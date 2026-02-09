import React, { useState, useEffect } from 'react';
import { useDownload } from '../../hooks/useDownload';
import { 
  Settings, 
  Save, 
  RefreshCcw, 
  Info,
  CheckCircle2,
  AlertCircle,
  LayoutGrid
} from 'lucide-react';
import './downloadsettings.css';

const DownloadSettings = () => {
  const { settings, updateSettings, fetchSettings } = useDownload();
  const [playlistLimit, setPlaylistLimit] = useState(settings.maxConcurrentPlaylistDownloads);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    setPlaylistLimit(settings.maxConcurrentPlaylistDownloads);
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    const success = await updateSettings({
      maxConcurrentPlaylistDownloads: parseInt(playlistLimit)
    });
    
    setIsSaving(false);
    if (success) {
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    }
  };

  return (
    <div className="settings-page-container">
      <div className="settings-header">
        <h1><Settings className="header-icon" /> Download Settings</h1>
        <p>Configure how the app handles your downloads</p>
      </div>

      <div className="settings-grid">
        <section className="settings-card">
          <div className="card-header">
            <LayoutGrid size={20} />
            <h2>Playlist Queue Settings</h2>
          </div>
          
          <div className="setting-item">
            <div className="setting-info">
              <label htmlFor="playlist-limit">Max Concurrent Downloads</label>
              <p>How many videos from a playlist can download at the same time.</p>
            </div>
            <div className="setting-control">
              <input 
                id="playlist-limit"
                type="number" 
                min="1" 
                max="10"
                value={playlistLimit}
                onChange={(e) => setPlaylistLimit(e.target.value)}
                className="setting-input"
              />
            </div>
          </div>

          <div className="setting-note">
            <Info size={14} />
            <span>This setting only affects playlist batches. Single video downloads always start immediately.</span>
          </div>
        </section>

        {/* You can add more settings categories here later */}
      </div>

      <div className="settings-footer">
        {message && (
          <div className={`status-message ${message.type}`}>
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {message.text}
          </div>
        )}
        <div className="footer-actions">
          <button className="reset-btn" onClick={fetchSettings}>
            <RefreshCcw size={18} /> Reset
          </button>
          <button 
            className="save-btn" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <span className="spinner"></span>
            ) : (
              <Save size={18} />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadSettings;