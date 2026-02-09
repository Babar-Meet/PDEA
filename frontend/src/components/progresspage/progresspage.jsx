import React from 'react';
import { useDownload } from '../../hooks/useDownload';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Download, 
  ExternalLink,
  Trash2,
  RefreshCw,
  Video,
  RotateCcw
} from 'lucide-react';
import './progresspage.css';

const ProgressPage = () => {
  const { downloads, cancelDownload, fetchDownloads, retryDownload } = useDownload();

  const getStatusIcon = (status) => {
    switch (status) {
      case 'finished': return <CheckCircle2 size={18} color="#2ecc71" />;
      case 'error': return <AlertCircle size={18} color="#e74c3c" />;
      case 'downloading': return <RefreshCw size={18} color="#3ea6ff" className="spin" />;
      case 'queued': return <Clock size={18} color="#f1c40f" />;
      case 'starting': return <RefreshCw size={18} color="#3ea6ff" className="spin" />;
      case 'cancelled': return <X size={18} color="#aaa" />;
      default: return <Clock size={18} color="#aaa" />;
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="progress-page-container">
      <div className="progress-page-header">
        <h1>Download Queue & History</h1>
        <div className="header-actions">
           {downloads.some(d => ['downloading', 'starting', 'queued'].includes(d.status)) && (
              <div className="overall-stat">
                 <RefreshCw size={16} className="spin" />
                 {downloads.filter(d => ['downloading', 'starting', 'queued'].includes(d.status)).length} Active
              </div>
           )}
          <button className="refresh-btn" onClick={fetchDownloads}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {downloads.length === 0 ? (
        <div className="no-downloads">
          <Download size={48} />
          <p>No downloads yet. Go to Simple Download to start one!</p>
        </div>
      ) : (
        <div className="downloads-grid">
          {downloads.map((dl) => (
            <div key={dl.id} className={`download-progress-card ${dl.status}`}>
              <div className="dl-card-thumb-container">
                {dl.thumbnail ? (
                  <img src={dl.thumbnail} alt="" className="dl-card-thumb" />
                ) : (
                  <div className="dl-card-thumb-placeholder">
                    <Video size={24} />
                  </div>
                )}
                <div className="dl-status-overlay">
                   {getStatusIcon(dl.status)}
                </div>
              </div>

              <div className="dl-card-content">
                <div className="dl-card-header">
                  <div className="dl-header-main">
                    <span className="dl-time">{getTimeAgo(dl.timestamp)}</span>
                    {dl.batchId && (
                      <span className="batch-badge">
                        BATCH
                      </span>
                    )}
                  </div>
                  <div className="dl-header-actions">
                    {dl.status === 'error' && (
                      <button 
                        className="retry-dl-btn" 
                        onClick={() => retryDownload(dl.id)}
                        title="Retry Download"
                      >
                        <RotateCcw size={16} />
                      </button>
                    )}
                    {(['downloading', 'starting', 'queued'].includes(dl.status)) && (
                      <button 
                        className="cancel-dl-btn" 
                        onClick={() => cancelDownload(dl.id)}
                        title="Cancel Download"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="dl-filename" title={dl.title || dl.filename || dl.url}>
                  {dl.title || dl.filename || dl.url}
                </div>

                <div className="dl-progress-section">
                  <div className="dl-progress-meta">
                    <span>{dl.progress}% Complete</span>
                    {dl.status === 'downloading' && (
                      <span>{dl.speed} • {dl.eta}</span>
                    )}
                  </div>
                  <div className="dl-progress-bar-bg">
                    <div 
                      className={`dl-progress-bar-fill ${dl.status}`}
                      style={{ width: `${dl.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="dl-footer">
                  <div className="dl-footer-item">
                    <span className="label">Folder:</span>
                    <span className="value">{dl.saveDir}</span>
                  </div>
                  {dl.status === 'error' && dl.error && (
                    <div className="dl-error-msg">
                      {dl.error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProgressPage;