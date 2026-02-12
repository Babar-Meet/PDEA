import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import { formatDate } from '../../utils/format';
import './newvideos.css';

const NewVideos = () => {
  const [newVideos, setNewVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingVideos, setDownloadingVideos] = useState(new Set());

  useEffect(() => {
    loadNewVideos();
  }, []);

  const loadNewVideos = async () => {
    try {
      // Get pending videos from the API
      const pendingResponse = await fetch(`${API_BASE_URL}/api/subscriptions/pending-videos`);
      const pendingVideos = await pendingResponse.json();
      
      setNewVideos(pendingVideos);
    } catch (error) {
      console.error('Error loading new videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (video) => {
    try {
      // Add to downloading set to disable button and show animation
      setDownloadingVideos(prev => new Set(prev).add(video.id));

      // Determine channel name from video or search subscriptions
      let channelName = video.channel_name;
      if (!channelName) {
        const subscriptionsResponse = await fetch(`${API_BASE_URL}/api/subscriptions`);
        const subscriptions = await subscriptionsResponse.json();
        // This is a fallback - ideally we should store channel name with video
        const subscription = subscriptions[0];
        channelName = subscription?.channelName || 'Unknown';
      }

      const response = await fetch(`${API_BASE_URL}/api/subscriptions/${encodeURIComponent(channelName)}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(video),
      });

      if (response.ok) {
        // Remove from new videos list
        setNewVideos(newVideos.filter(v => v.id !== video.id));
      } else {
        const errorData = await response.json();
        alert(`Error downloading video: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error downloading video:', error);
      alert('Failed to download video');
    } finally {
      // Remove from downloading set
      setDownloadingVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(video.id);
        return newSet;
      });
    }
  };

  const handleCancel = async (video) => {
    try {
      // Add to downloading set to disable button and show animation
      setDownloadingVideos(prev => new Set(prev).add(video.id));

      // Determine channel name from video or search subscriptions
      let channelName = video.channel_name;
      if (!channelName) {
        const subscriptionsResponse = await fetch(`${API_BASE_URL}/api/subscriptions`);
        const subscriptions = await subscriptionsResponse.json();
        // This is a fallback - ideally we should store channel name with video
        const subscription = subscriptions[0];
        channelName = subscription?.channelName || 'Unknown';
      }

      const response = await fetch(`${API_BASE_URL}/api/subscriptions/${encodeURIComponent(channelName)}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(video),
      });

      if (response.ok) {
        // Remove from new videos list
        setNewVideos(newVideos.filter(v => v.id !== video.id));
      } else {
        const errorData = await response.json();
        alert(`Error canceling video: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error canceling video:', error);
      alert('Failed to cancel video');
    } finally {
      // Remove from downloading set
      setDownloadingVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(video.id);
        return newSet;
      });
    }
  };

  const handleCancelAll = async () => {
    if (newVideos.length === 0) return;
    if (!window.confirm(`Are you sure you want to cancel all ${newVideos.length} pending videos?`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/subscriptions/cancel-all-pending`, {
        method: 'POST',
      });

      if (response.ok) {
        setNewVideos([]);
      } else {
        const errorData = await response.json();
        alert(`Error canceling all videos: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error canceling all videos:', error);
      alert('Failed to cancel all videos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="new-videos">
        <div className="loading">Loading new videos...</div>
      </div>
    );
  }

  return (
    <div className="new-videos">
      <div className="new-videos-header">
        <h1>New Videos</h1>
        <div className="new-videos-actions">
          <button 
            className="cancel-all-button"
            onClick={handleCancelAll}
            disabled={newVideos.length === 0}
          >
            Cancel All
          </button>
          <button 
            className="refresh-button"
            onClick={loadNewVideos}
          >
            Refresh
          </button>
        </div>
      </div>
      
      {newVideos.length === 0 ? (
        <div className="no-videos">
          No new videos to show
        </div>
      ) : (
        <div className="new-videos-grid">
          {newVideos.map((video) => (
            <div key={video.id} className="new-video-card">
              {video.thumbnail && (
                <div className="video-thumbnail">
                  <img src={video.thumbnail} alt={video.title} />
                </div>
              )}
              
              <div className="video-info">
                <h3 className="video-title">{video.title}</h3>
                <p className="channel-name">{video.channel_name}</p>
                <p className="upload-date">
                  {formatDate(video.upload_date)}
                </p>
              </div>
              
              <div className="video-actions">
                <button 
                  className="download-button"
                  onClick={() => handleDownload(video)}
                  disabled={downloadingVideos.has(video.id)}
                >
                  {downloadingVideos.has(video.id) ? (
                    <span className="downloading">
                      <span className="spinner"></span>
                      Downloading...
                    </span>
                  ) : (
                    'Download'
                  )}
                </button>
                <button 
                  className="cancel-button"
                  onClick={() => handleCancel(video)}
                  disabled={downloadingVideos.has(video.id)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NewVideos;
