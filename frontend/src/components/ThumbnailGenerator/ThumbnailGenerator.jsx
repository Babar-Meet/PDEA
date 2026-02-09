import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import { Loader2, AlertTriangle, CheckCircle, XCircle, Image, SkipForward } from 'lucide-react';
import './ThumbnailGenerator.css';

const ThumbnailGenerator = ({ onSkip, thumbnailsNeeded }) => {
  const [progress, setProgress] = useState({
    isGenerating: false,
    total: thumbnailsNeeded,
    generated: 0,
    failed: 0,
    currentFile: '',
    queueLength: 0,
    remaining: thumbnailsNeeded
  });
  
  const [isSkipped, setIsSkipped] = useState(false);
  const [showSkipWarning, setShowSkipWarning] = useState(false);

  // Poll for progress updates
  useEffect(() => {
    if (isSkipped) return;

    const fetchProgress = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/videos/thumbnail-progress`);
        const data = await response.json();
        
        if (data.success) {
          setProgress({
            isGenerating: data.isGenerating,
            total: data.totalToGenerate || thumbnailsNeeded,
            generated: data.generated || 0,
            failed: data.failed || 0,
            currentFile: data.currentFile || '',
            queueLength: data.queueLength || 0,
            remaining: data.remaining || (thumbnailsNeeded - (data.generated || 0) - (data.failed || 0))
          });

          // If generation is complete, auto-hide after 3 seconds
          if (!data.isGenerating && data.isComplete) {
            setTimeout(() => {
              if (onSkip) onSkip();
            }, 3000);
          }
        }
      } catch (error) {
        console.error('Error fetching thumbnail progress:', error);
      }
    };

    const interval = setInterval(fetchProgress, 2000);
    fetchProgress(); // Initial fetch

    return () => clearInterval(interval);
  }, [isSkipped, thumbnailsNeeded, onSkip]);

  const handleSkip = () => {
    if (!showSkipWarning) {
      setShowSkipWarning(true);
      return;
    }
    
    setIsSkipped(true);
    if (onSkip) onSkip();
  };

  const handleClose = () => {
    setIsSkipped(true);
    if (onSkip) onSkip();
  };

  const totalProcessed = progress.generated + progress.failed;
  const progressPercentage = progress.total > 0 ? (totalProcessed / progress.total) * 100 : 0;
  const remaining = progress.remaining > 0 ? progress.remaining : progress.total - totalProcessed;

  // Don't show if no thumbnails needed or already completed
  if (thumbnailsNeeded === 0 || (totalProcessed >= progress.total && !progress.isGenerating)) {
    return null;
  }

  return (
    <div className="thumbnail-generator-overlay">
      <div className="thumbnail-generator-modal">
        <div className="thumbnail-generator-header">
          <div className="thumbnail-generator-title">
            <Image size={20} />
            <h3>Thumbnail Generation</h3>
          </div>
          {!isSkipped && (
            <button className="skip-button" onClick={handleSkip}>
              <SkipForward size={16} />
              <span className="skip-button-text">skip</span>
            </button>
          )}
        </div>

        <div className="thumbnail-generator-content">
          {!showSkipWarning ? (
            <>
              <div className="progress-section">
                <div className="progress-header">
                  {progress.isGenerating ? (
                    <>
                      <Loader2 className="spinner" size={18} />
                      <span>Generating thumbnails in background...</span>
                    </>
                  ) : (
                    <span>Preparing thumbnail generation...</span>
                  )}
                </div>
                
                <div className="progress-stats">
                  <div className="stat-item">
                    <span className="stat-label">Total:</span>
                    <span className="stat-value">{progress.total}</span>
                  </div>
                  <div className="stat-item success">
                    <CheckCircle size={14} />
                    <span className="stat-label">Generated:</span>
                    <span className="stat-value">{progress.generated}</span>
                  </div>
                  <div className="stat-item failed">
                    <XCircle size={14} />
                    <span className="stat-label">Failed:</span>
                    <span className="stat-value">{progress.failed}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Remaining:</span>
                    <span className="stat-value">{remaining}</span>
                  </div>
                </div>

                {progress.total > 0 && (
                  <div className="progress-bar-container">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    <span className="progress-text">
                      {Math.round(progressPercentage)}% Complete ({totalProcessed}/{progress.total})
                    </span>
                  </div>
                )}

                {progress.currentFile && (
                  <div className="current-file">
                    <span className="current-file-label">Processing:</span>
                    <span className="current-file-name" title={progress.currentFile}>
                      {progress.currentFile.split('/').pop() || progress.currentFile}
                    </span>
                  </div>
                )}

                <div className="info-note">
                  <AlertTriangle size={14} />
                  <span>Thumbnail generation runs in the background. You can continue browsing.</span>
                </div>
              </div>

              <div className="action-buttons">
                <button className="btn btn-success" onClick={handleClose}>
                  Continue Browsing
                </button>
              </div>
            </>
          ) : (
            <div className="skip-warning">
              <AlertTriangle size={24} color="#FFA726" />
              <h4>Skip Thumbnail Generation?</h4>
              <p>If you skip now:</p>
              <ul>
                <li>Videos will use placeholder thumbnails</li>
                <li>Generation will continue in the background</li>
                <li>Refresh the page to see new thumbnails</li>
              </ul>
              <div className="skip-warning-actions">
                <button className="btn btn-success" onClick={() => setShowSkipWarning(false)}>
                  Continue Generation
                </button>
                <button className="btn btn-secondary" onClick={handleSkip}>
                  Skip Anyway
                </button>
              </div>
            </div>
          )}
        </div>

        {totalProcessed >= progress.total && !progress.isGenerating && (
          <div className="completion-message">
            <CheckCircle size={20} color="#4CAF50" />
            <span>Thumbnail generation complete! Generated: {progress.generated}, Failed: {progress.failed}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThumbnailGenerator;