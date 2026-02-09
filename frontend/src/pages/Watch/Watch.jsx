import React, { useState, useEffect, useRef } from 'react'
import { API_BASE_URL } from '../../config'
import { useParams, useNavigate } from 'react-router-dom'
import VideoPlayer from '../../components/VideoPlayer/VideoPlayer'
import VideoSidebar from '../../components/VideoSidebar/VideoSidebar'
import { ThumbsUp, ThumbsDown, Share2, Download, MoreVertical, Trash2, Trash, AlertTriangle, Monitor, Folder, Camera } from 'lucide-react'
import './Watch.css'

const Watch = ({ videos, fetchVideos }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const playerRef = useRef(null)
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showTrashConfirm, setShowTrashConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [cinemaMode, setCinemaMode] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 't' || e.key === 'T') {
        // Prevent if typing in an input/textarea
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          setCinemaMode(prev => !prev)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    // Find video by id (which is now the relative path)
    const foundVideo = videos.find(v => v.id === id)
    if (foundVideo) {
      setVideo(foundVideo)
    }
    setLoading(false)
  }, [id, videos])

  // Get current video index and next/previous videos
  const currentIndex = videos.findIndex(v => v.id === id)
  const nextVideo = currentIndex < videos.length - 1 ? videos[currentIndex + 1] : null
  const previousVideo = currentIndex > 0 ? videos[currentIndex - 1] : null

  const handleNextVideo = () => {
    if (nextVideo) {
      navigate(`/watch/${encodeURIComponent(nextVideo.id)}`)
    }
  }

  const handlePreviousVideo = () => {
    if (previousVideo) {
      navigate(`/watch/${encodeURIComponent(previousVideo.id)}`)
    }
  }

  const handleMoveToTrash = async () => {
    if (!video) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/videos/trash/${encodeURIComponent(video.relativePath || video.id)}`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('Video moved to trash successfully!')
        // Refresh video list
        if (fetchVideos) fetchVideos()
        // Navigate to next video if available, otherwise home
        if (nextVideo) {
          navigate(`/watch/${encodeURIComponent(nextVideo.id)}`)
        } else {
          navigate('/')
        }
      } else {
        alert('Failed to move video to trash: ' + data.error)
      }
    } catch (error) {
      console.error('Error moving to trash:', error)
      alert('Error moving video to trash')
    } finally {
      setIsDeleting(false)
      setShowTrashConfirm(false)
    }
  }

  const handlePermanentDelete = async () => {
    if (!video) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/videos/delete/${encodeURIComponent(video.relativePath || video.id)}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('Video permanently deleted!')
        // Refresh video list
        if (fetchVideos) fetchVideos()
        // Navigate to next video if available, otherwise home
        if (nextVideo) {
          navigate(`/watch/${encodeURIComponent(nextVideo.id)}`)
        } else {
          navigate('/')
        }
      } else {
        alert('Failed to delete video: ' + data.error)
      }
    } catch (error) {
      console.error('Error deleting video:', error)
      alert('Error deleting video')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="watch__loading">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="watch__not-found">
        <h2>Video not found</h2>
        <p>The video might have been moved or deleted.</p>
        <button onClick={() => navigate('/')}>Go to Home</button>
      </div>
    )
  }

  // Format category display
  const categoryDisplay = video.category || 'Uncategorized'
  const folderPath = video.folder ? video.folder.split('/').filter(Boolean).join(' / ') : ''

  const handleOpenFolder = async () => {
    if (!video) return
    try {
      const response = await fetch(`${API_BASE_URL}/api/videos/open-folder/${encodeURIComponent(video.relativePath || video.id)}`, {
        method: 'POST'
      })
      const data = await response.json()
      if (!data.success) {
        alert('Failed to open folder: ' + data.error)
      }
    } catch (error) {
      console.error('Error opening folder:', error)
      alert('Error opening folder')
    }
  }

  const handleUpdateThumbnail = async () => {
    if (!video || !playerRef.current) return
    
    try {
      const frameData = playerRef.current.captureFrame();
      if (!frameData) {
        alert('Failed to capture video frame');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/videos/update-thumbnail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          relativePath: video.relativePath || video.id,
          image: frameData
        })
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Thumbnail updated successfully!');
        if (fetchVideos) await fetchVideos();
        navigate('/')
      } else {
        alert('Failed to update thumbnail: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating thumbnail:', error);
      alert('Error updating thumbnail');
    }
  }

  return (
    <div className={`watch ${cinemaMode ? 'cinema-mode' : ''}`}>
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <AlertTriangle size={24} color="#ff0000" />
              <h3>Permanent Delete</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to permanently delete <strong>"{video.title}"</strong>?</p>
              <p className="warning-text">⚠️ This action cannot be undone! The video and its thumbnail will be permanently removed from your computer.</p>
            </div>
            <div className="modal-actions">
              <button 
                className="modal-btn cancel-btn"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="modal-btn delete-btn"
                onClick={handlePermanentDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trash Confirmation Modal */}
      {showTrashConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <Trash2 size={24} color="#ff9900" />
              <h3>Move to Trash</h3>
            </div>
            <div className="modal-body">
              <p>Move <strong>"{video.title}"</strong> to trash folder?</p>
              <p className="info-text">📁 The video will be moved to <code>/public/trash/</code> folder. You can restore it manually from there.</p>
              {nextVideo && (
                <p className="info-text">▶️ Next video "{nextVideo.title}" will play automatically.</p>
              )}
            </div>
            <div className="modal-actions">
              <button 
                className="modal-btn cancel-btn"
                onClick={() => setShowTrashConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="modal-btn trash-btn"
                onClick={handleMoveToTrash}
                disabled={isDeleting}
              >
                {isDeleting ? 'Moving...' : 'Move to Trash'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="watch__main">
        <div className="watch__player">
          <VideoPlayer 
            ref={playerRef}
            video={video} 
            videos={videos}
            onNextVideo={handleNextVideo}
            onPreviousVideo={handlePreviousVideo}
            cinemaMode={cinemaMode}
            onToggleCinemaMode={() => setCinemaMode(!cinemaMode)}
          />
        </div>
        
        <div className="watch__details">
          <h1 className="watch__title">{video.title}</h1>
          
          <div className="watch__meta">
            <div className="watch__stats">
              <span className="watch__views">{video.views} views</span>
              <span className="watch__date">{video.uploadDate}</span>
              {video.category && (
                <span className="watch__category">{categoryDisplay}</span>
              )}
            </div>
            
            {/* Video Navigation Info */}
            <div className="watch__navigation-info">
              <span className="nav-info-text">
                {previousVideo && `Previous : ${previousVideo.title.substring(0, 90)}... `}
                <br />
                {nextVideo && `Next  : ${nextVideo.title.substring(0, 90)}...`}
              </span>
            </div>
            
            {folderPath && (
              <div className="watch__folder">
                <span className="folder-label">Folder:</span>
                <span className="folder-path">{folderPath}</span>
              </div>
            )}
          </div>
          
          <div className="watch__actions">
            <div className="watch__left-actions">
              {/* <button className="action-btn like-btn">
                <ThumbsUp size={20} />
                <span>{video.likes}</span>
              </button> */}
              
              {/* <button className="action-btn">
                <ThumbsDown size={20} />
                <span>Dislike</span>
              </button> */}
              
              {/* <button className="action-btn">
                <Share2 size={20} />
                <span>Share</span>
              </button> */}
              
              <button className="action-btn" onClick={handleOpenFolder} title="Open folder containing this video">
                <Folder size={20} />
                <span>Open Folder</span>
              </button>

              <button className="action-btn" onClick={handleUpdateThumbnail} title="Update video thumbnail with current frame">
                <Camera size={20} />
                <span>Update Thumbnail</span>
              </button>

              {/* Quick Navigation Buttons */}
              {previousVideo && (
                <button 
                  className="action-btn nav-btn"
                  onClick={handlePreviousVideo}
                  title="Previous Video"
                >
                  Prev
                </button>
              )}
              
              {nextVideo && (
                <button 
                  className="action-btn nav-btn"
                  onClick={handleNextVideo}
                  title="Next Video"
                >
                  Next →
                </button>
              )}

              {/* New Delete Buttons */}
              <button 
                className="action-btn trash-btn"
                onClick={() => setShowTrashConfirm(true)}
                title="Move to trash folder"
              >
                <Trash2 size={20} />
                <span>Move to Trash</span>
              </button>
              
              <button 
                className="action-btn delete-btn"
                onClick={() => setShowDeleteConfirm(true)}
                title="Permanently delete video"
              >
                <Trash size={20} />
                <span>Delete</span>
              </button>
            </div>
            
            <button 
              className={`action-btn cinema-toggle-btn ${cinemaMode ? 'active' : ''}`}
              onClick={() => setCinemaMode(!cinemaMode)}
              title="Cinema Mode (t)"
            >
              <Monitor size={20} />
              <span>Cinema</span>
            </button>
          </div>
          
          <div className="watch__channel">
            <div className="channel__info">
              <img src={video.channelAvatar} alt={video.channel} className="channel__avatar" />
              <div className="channel__details">
                <h3 className="channel__name">{video.channel}</h3>
                <p className="channel__subs">1.5M subscribers</p>
              </div>
              <button className="channel__subscribe">Subscribe</button>
            </div>
            
            <div className="watch__description">
              <p>{video.filename} • {video.size} • {video.type}</p>
              <p>Video {currentIndex + 1} of {videos.length}</p>
              {video.tags && video.tags.length > 0 && (
                <div className="watch__tags">
                  {video.tags.slice(0, 5).map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="watch__sidebar">
        <VideoSidebar videos={videos} currentVideoId={video.id} />
      </div>
    </div>
  )
}

export default Watch