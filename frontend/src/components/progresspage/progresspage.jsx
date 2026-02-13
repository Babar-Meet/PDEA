import React, { useState, useCallback, useEffect } from 'react';
import { useDownload } from '../../hooks/useDownload';
import { formatDate } from '../../utils/format';
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
  RotateCcw,
  AxeIcon,
  Pause,
  Play
} from 'lucide-react';
import './progresspage.css';

const ProgressPage = () => {
  const { downloads, cancelDownload, fetchDownloads, retryDownload, cleanupOrphanedFiles, cleanupMessage, clearCleanupMessage, removeDownload, pauseDownload, resumeDownload, pauseAllDownloads, resumeAllDownloads, fetchPausedCount, fetchPausedDownloads, pausedDownloads } = useDownload();
  const [cleaning, setCleaning] = useState(new Set());

  // Load paused downloads on mount
  useEffect(() => {
    fetchPausedDownloads();
  }, [fetchPausedDownloads]);

  // Clear cleanup message after 3 seconds
  useEffect(() => {
    if (cleanupMessage) {
      const timer = setTimeout(() => {
        clearCleanupMessage();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [cleanupMessage, clearCleanupMessage]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'finished': return <CheckCircle2 size={18} color="#2ecc71" />;
      case 'error': return <AlertCircle size={18} color="#e74c3c" />;
      case 'downloading': return <RefreshCw size={18} color="#3ea6ff" className="spin" />;
      case 'queued': return <Clock size={18} color="#f1c40f" />;
      case 'starting': return <RefreshCw size={18} color="#3ea6ff" className="spin" />;
      case 'paused': return <Pause size={18} color="#f39c12" />;
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
    return formatDate(date);
  };

  const handleCancel = useCallback(async (id) => {
    // Allow cancel even if already in progress - just do it
    // Don't block based on current state - just execute
    
    try {
      const result = await cancelDownload(id);
      // Always fetch fresh data after cancel attempt
      // No matter if it succeeded or failed, get latest state
      fetchDownloads();
    } catch (error) {
      console.error('Cancel failed:', error);
      fetchDownloads();
    }
  }, [cancelDownload, fetchDownloads]);

  const handlePause = useCallback(async (id) => {
    // Allow pause even if already in progress - just do it
    
    try {
      const result = await pauseDownload(id);
      // Always fetch fresh data after pause attempt
      fetchDownloads();
    } catch (error) {
      console.error('Pause failed:', error);
      fetchDownloads();
    }
  }, [pauseDownload, fetchDownloads]);

  const handleResume = useCallback(async (id) => {
    // Allow resume even if already in progress - just do it
    
    try {
      const result = await resumeDownload(id);
      // Always fetch fresh data after resume attempt
      fetchDownloads();
    } catch (error) {
      console.error('Resume failed:', error);
      fetchDownloads();
    }
  }, [resumeDownload, fetchDownloads]);

  const handleRetry = useCallback(async (id) => {
    try {
      await retryDownload(id);
      // Refresh downloads immediately
      fetchDownloads();
    } catch (error) {
      console.error('Retry failed:', error);
      fetchDownloads();
    }
  }, [retryDownload, fetchDownloads]);

  const handleRefresh = useCallback(() => {
    fetchDownloads();
  }, [fetchDownloads]);

  const handleCleanup = useCallback(async () => {
    if (cleaning.has('cleanup')) return;
    
    setCleaning(prev => new Set(prev).add('cleanup'));
    try {
      const success = await cleanupOrphanedFiles();
      if (success) {
        // Fetch fresh data instead of reloading
        setTimeout(() => {
          fetchDownloads();
          setCleaning(prev => {
            const next = new Set(prev);
            next.delete('cleanup');
            return next;
          });
        }, 500);
      } else {
        setCleaning(prev => {
          const next = new Set(prev);
          next.delete('cleanup');
          return next;
        });
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
      setCleaning(prev => {
        const next = new Set(prev);
        next.delete('cleanup');
        return next;
      });
    }
  }, [cleanupOrphanedFiles, fetchDownloads, cleaning]);

  const handlePauseAll = useCallback(async () => {
    if (cleaning.has('pauseAll')) return;
    
    setCleaning(prev => new Set(prev).add('pauseAll'));
    try {
      await pauseAllDownloads();
      setCleaning(prev => {
        const next = new Set(prev);
        next.delete('pauseAll');
        return next;
      });
      setTimeout(() => {
        fetchDownloads();
      }, 300);
    } catch (error) {
      console.error('Pause all failed:', error);
      setCleaning(prev => {
        const next = new Set(prev);
        next.delete('pauseAll');
        return next;
      });
    }
  }, [pauseAllDownloads, fetchDownloads, cleaning]);

  const handleResumeAll = useCallback(async () => {
    if (cleaning.has('resumeAll')) return;
    
    setCleaning(prev => new Set(prev).add('resumeAll'));
    try {
      await resumeAllDownloads();
      setCleaning(prev => {
        const next = new Set(prev);
        next.delete('resumeAll');
        return next;
      });
      setTimeout(() => {
        fetchDownloads();
      }, 300);
    } catch (error) {
      console.error('Resume all failed:', error);
      setCleaning(prev => {
        const next = new Set(prev);
        next.delete('resumeAll');
        return next;
      });
    }
  }, [resumeAllDownloads, fetchDownloads, cleaning]);

  const handleRemove = useCallback(async (id) => {
    // Allow remove - just do it
    
    try {
      await removeDownload(id);
      // Fetch fresh data after remove
      fetchDownloads();
    } catch (error) {
      console.error('Remove failed:', error);
      fetchDownloads();
    }
  }, [removeDownload, fetchDownloads]);

  // Calculate counts
  const activeCount = downloads.filter(d => ['downloading', 'starting', 'queued'].includes(d.status)).length;
  const pausedCount = downloads.filter(d => d.status === 'paused').length;

  return (
    <div className="progress-page-container">
      <div className="progress-page-header">
        <h1>Download Queue & History</h1>
        <div className="header-actions">
           {activeCount > 0 && (
              <div className="overall-stat">
                 <RefreshCw size={16} className="spin" />
                 {activeCount} Active
              </div>
           )}
           {pausedCount > 0 && (
              <button 
                className="resume-all-btn" 
                onClick={handleResumeAll}
                disabled={cleaning.has('resumeAll')}
                title="Resume all paused downloads"
              >
                <Play size={16} /> {cleaning.has('resumeAll') ? 'Resuming...' : `Resume All (${pausedCount})`}
              </button>
           )}
           {activeCount > 0 && (
              <button 
                className="pause-all-btn" 
                onClick={handlePauseAll}
                disabled={cleaning.has('pauseAll')}
                title="Pause all active downloads"
              >
                <Pause size={16} /> {cleaning.has('pauseAll') ? 'Pausing...' : 'Pause All'}
              </button>
           )}
           <button 
             className="cleanup-btn" 
             onClick={handleCleanup}
             disabled={cleaning.has('cleanup')}
             title="Clean up temporary files"
           >
             <AxeIcon size={16} /> {cleaning.has('cleanup') ? 'Cleaning...' : 'Cleanup'}
           </button>
          <button className="refresh-btn" onClick={handleRefresh}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {cleanupMessage && (
        <div className="cleanup-message">
          {cleanupMessage}
        </div>
      )}

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
                    {(dl.status === 'error' || dl.status === 'cancelled') && (
                      <button 
                        className="retry-dl-btn" 
                        onClick={() => handleRetry(dl.id)}
                        title="Retry Download"
                      >
                        <RotateCcw size={16} />
                      </button>
                    )}
                    {(['downloading', 'starting', 'queued'].includes(dl.status)) && (
                      <>
                        <button 
                          className="pause-dl-btn" 
                          onClick={() => handlePause(dl.id)}
                          title="Pause Download"
                        >
                          <Pause size={16} />
                        </button>
                        <button 
                          className="cancel-dl-btn" 
                          onClick={() => handleCancel(dl.id)}
                          title="Cancel Download"
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                    {dl.status === 'paused' && (
                      <button 
                        className="resume-dl-btn" 
                        onClick={() => handleResume(dl.id)}
                        title="Resume Download"
                      >
                        <Play size={16} />
                      </button>
                    )}
                    {['finished', 'error', 'cancelled'].includes(dl.status) && (
                      <button 
                        className="remove-dl-btn" 
                        onClick={() => handleRemove(dl.id)}
                        title="Remove from history"
                      >
                        <Trash2 size={14} />
                        <span className="remove-btn-text">Remove</span>
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
                  {dl.status === 'cancelled' && (
                    <div className="dl-error-msg">
                      Cancelled by user
                    </div>
                  )}
                  {dl.status === 'paused' && (
                    <div className="dl-paused-msg">
                      Paused by user
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
