import React, { useState, useEffect } from 'react'
import { API_BASE_URL } from '../../config'
import { useNavigate } from 'react-router-dom'
import { Trash2, RefreshCw, AlertTriangle, FileVideo, Play, ExternalLink } from 'lucide-react'
import './Trash.css'

const Trash = ({ fetchVideos }) => {
  const [trashVideos, setTrashVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEmptying, setIsEmptying] = useState(false)
  const navigate = useNavigate()

  const fetchTrashVideos = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/videos/trash`)
      const data = await response.json()
      
      if (data.success) {
        setTrashVideos(data.videos)
      }
    } catch (error) {
      console.error('Error fetching trash videos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrashVideos()
  }, [])

  const handleEmptyTrash = async () => {
    if (!window.confirm('Are you sure you want to permanently delete ALL videos in trash? This action cannot be undone!')) {
      return
    }

    setIsEmptying(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/videos/trash/empty`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`Trash emptied! ${data.deletedCount} files deleted.`)
        setTrashVideos([])
        if (fetchVideos) fetchVideos()
      } else {
        alert('Failed to empty trash: ' + data.error)
      }
    } catch (error) {
      console.error('Error emptying trash:', error)
      alert('Error emptying trash')
    } finally {
      setIsEmptying(false)
    }
  }

  // Function to open video in default media player
  const openInMediaPlayer = (filename) => {
    // Get the full path to the trash video
    const videoUrl = `${API_BASE_URL}/trash/${encodeURIComponent(filename)}`
    
    // Create a temporary link to download/play the video
    const link = document.createElement('a')
    link.href = videoUrl
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.click()
  }

  // Function to watch video in browser
  const watchInBrowser = (filename) => {
    const videoUrl = `${API_BASE_URL}/trash/${encodeURIComponent(filename)}`
    window.open(videoUrl, '_blank')
  }

  if (loading) {
    return (
      <div className="trash-loading">
        <div className="loading-spinner"></div>
        <p>Loading trash videos...</p>
      </div>
    )
  }

  return (
    <div className="trash-page">
      {/* Header with Empty Trash Button */}
      <div className="trash-header">
        <div className="trash-header__info">
          <h1 className="trash-title">
            <Trash2 size={32} />
            Trash Bin
          </h1>
          <div className="trash-stats">
            <span className="trash-count">{trashVideos.length} videos</span>
            <button 
              className="refresh-btn"
              onClick={fetchTrashVideos}
              title="Refresh trash"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
        
        <div className="trash-actions">
          <button 
            className="empty-trash-btn"
            onClick={handleEmptyTrash}
            disabled={trashVideos.length === 0 || isEmptying}
          >
            {isEmptying ? (
              <>
                <RefreshCw size={16} className="spinning" />
                Emptying...
              </>
            ) : (
              <>
                <AlertTriangle size={16} />
                Empty Trash
              </>
            )}
          </button>
        </div>
      </div>

      {/* Warning Banner */}
      {trashVideos.length > 0 && (
        <div className="trash-warning">
          <AlertTriangle size={20} />
          <div className="warning-content">
            <strong>Videos in trash will be deleted permanently when you empty the trash.</strong>
            <span>Watch videos before emptying to make sure you don't need them.</span>
          </div>
        </div>
      )}

      {/* Video List */}
      <div className="trash-content">
        {trashVideos.length === 0 ? (
          <div className="trash-empty">
            <Trash2 size={64} />
            <h3>Trash is empty</h3>
            <p>Videos you delete will appear here</p>
            <button 
              className="go-home-btn"
              onClick={() => navigate('/')}
            >
              Go to Home
            </button>
          </div>
        ) : (
          <>
            <div className="trash-videos-header">
              <h3>Videos in Trash ({trashVideos.length})</h3>
              <div className="trash-instructions">
                <span>Watch videos before emptying trash. Once emptied, videos are permanently deleted.</span>
              </div>
            </div>
            
            <div className="trash-videos-list">
              {trashVideos.map((video) => (
                <div key={video.id} className="trash-video-item">
                  <div className="trash-video-icon">
                    <FileVideo size={24} />
                  </div>
                  
                  <div className="trash-video-info">
                    <h4 className="trash-video-title" title={video.title}>
                      {video.title}
                    </h4>
                    <div className="trash-video-details">
                      <span className="trash-video-filename" title={video.filename}>
                        {video.filename}
                      </span>
                      <span className="trash-video-size">{video.size}</span>
                      <span className="trash-video-type">{video.type}</span>
                    </div>
                    <div className="trash-video-date">
                      <span>Deleted: {new Date(video.deletedDate).toLocaleDateString()} {new Date(video.deletedDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                  
                  <div className="trash-video-actions">
                    <button 
                      className="watch-btn"
                      onClick={() => watchInBrowser(video.filename)}
                      title="Watch in browser"
                    >
                      <Play size={16} />
                      Watch
                    </button>
                    {/* <button 
                      className="open-player-btn"
                      onClick={() => openInMediaPlayer(video.filename)}
                      title="Open in default media player"
                    >
                      <ExternalLink size={16} />
                      Open in Player
                    </button> */}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Trash