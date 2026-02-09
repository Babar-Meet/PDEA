import React, { useState, useRef, useEffect } from 'react'
import { API_BASE_URL } from '../../config'
import { Link } from 'react-router-dom'
import { Play, MoreVertical, Folder, Trash2, Trash } from 'lucide-react'
import './VideoCard.css'
import { formatViews } from '../../utils/format'

const VideoCard = ({ video, compact = false, fetchVideos }) => {
  const {
    id,
    title,
    channel,
    channelAvatar,
    thumbnail,
    views,
    duration,
    uploadDate,
    size,
    filename,
    folder,
    category
  } = video

  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)
  const buttonRef = useRef(null)

  // Check if thumbnail is local or external
  const isLocalThumbnail = thumbnail && thumbnail.startsWith('/thumbnails/')

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && 
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setShowMenu(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [])

  const handleMenuClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setShowMenu(!showMenu)
  }

  const handleMoveToTrash = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!window.confirm(`Move "${title}" to trash?`)) return
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/videos/trash/${encodeURIComponent(video.relativePath || video.id)}`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('Video moved to trash!')
        if (fetchVideos) fetchVideos()
      } else {
        alert('Failed to move video to trash: ' + data.error)
      }
    } catch (error) {
      console.error('Error moving to trash:', error)
      alert('Error moving video to trash')
    } finally {
      setShowMenu(false)
    }
  }

  const handlePermanentDelete = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!window.confirm(`Permanently delete "${title}"? This cannot be undone!`)) return
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/videos/delete/${encodeURIComponent(video.relativePath || video.id)}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('Video permanently deleted!')
        if (fetchVideos) fetchVideos()
      } else {
        alert('Failed to delete video: ' + data.error)
      }
    } catch (error) {
      console.error('Error deleting video:', error)
      alert('Error deleting video')
    } finally {
      setShowMenu(false)
    }
  }

  // Check if we're in a compact view (list view) or grid view
  const renderCompactView = () => (
    <Link to={`/watch/${encodeURIComponent(id)}`} className="video-card video-card--compact">
      <div className="video-card__thumbnail">
        <img 
          src={thumbnail} 
          alt={title} 
          loading="lazy"
          className={isLocalThumbnail ? 'local-thumbnail' : ''}
        />
        {isLocalThumbnail && <div className="thumbnail-badge">🖼️</div>}
        
        <div className="video-card__overlay">
          <Play size={20} />
        </div>
        
        {/* Folder indicator */}
        {folder && (
            // <div className="video-card__folder-badge">
            <div >
            <Folder size={12} />
            <span>{folder.split('/').pop()}</span>
          </div>
        )}
      </div>
      
      <div className="video-card__info">
        <h3 className="video-card__title" title={title}>
          {title.length > 60 ? title.substring(0, 60) + '...' : title}
        </h3>
        
        <div className="video-card__meta">
          <span>{channel}</span>
          <span>•</span>
          <span>{formatViews(views)} views</span>
            {/* <span>•</span> */}
          <span>{uploadDate}</span>
        </div>
        
        <div className="video-card__file-info">
          <span>{duration}</span>
          <span>•</span>
          <span>{size}</span>
          
          {/* Show folder if exists */}
          {folder && (
            <>
                {/* <span>•</span> */}
              <span className="folder-indicator" title={`Folder: ${folder}`}>
                <Folder size={12} />
                {folder.split('/').pop()}
              </span>
            </>
          )}
        </div>
      </div>
      
      {/* Three dot menu with dropdown */}
      <div style={{ position: 'relative' }}>
        <button 
          ref={buttonRef}
          className="video-card__menu" 
          onClick={handleMenuClick}
        >
          <MoreVertical size={16} />
        </button>
        
        {showMenu && (
          <div ref={menuRef} style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            background: '#1a1a1a',
            borderRadius: '8px',
            padding: '6px 0',
            minWidth: '180px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.7)',
            border: '1px solid #333',
            zIndex: 9999,
            marginTop: '4px'
          }}>
            <button 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 16px',
                color: '#ff9900',
                textDecoration: 'none',
                border: 'none',
                background: 'none',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'background-color 0.2s',
                whiteSpace: 'nowrap'
              }}
              onClick={handleMoveToTrash}
            >
              <Trash2 size={14} />
              <span>Move to Trash</span>
            </button>
            <div style={{
              height: '1px',
              backgroundColor: '#333',
              margin: '4px 0'
            }}></div>
            <button 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 16px',
                color: '#ff0000',
                textDecoration: 'none',
                border: 'none',
                background: 'none',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'background-color 0.2s',
                whiteSpace: 'nowrap'
              }}
              onClick={handlePermanentDelete}
            >
              <Trash size={14} />
              <span>Delete Permanently</span>
            </button>
          </div>
        )}
      </div>
    </Link>
  )

  const renderGridView = () => (
    <Link to={`/watch/${encodeURIComponent(id)}`} className="video-card">
      <div className="video-card__thumbnail">
        <img 
          src={thumbnail} 
          alt={title} 
          loading="lazy"
          className={isLocalThumbnail ? 'local-thumbnail' : ''}
        />
        {isLocalThumbnail && <div className="thumbnail-badge">🖼️</div>}
        
        {/* Folder indicator */}
        {folder && (
          // <div className="video-card__folder-badge">
          <div>
            <Folder size={14} />
            <span>{folder.split('/').pop()}</span>
          </div>
        )}
        
        <div className="video-card__overlay">
          <Play size={30} />
        </div>
      </div>
      
      <div className="video-card__content">
        <img src={channelAvatar} alt={channel} className="video-card__avatar" />
        
        <div className="video-card__details">
          <h3 className="video-card__title" title={title}>
            {title.length > 50 ? title.substring(0, 50) + '...' : title}
          </h3>
          
          <div className="video-card__channel">{channel}</div>
          
          <div className="video-card__stats">
            <span>{formatViews(views)} views</span>
            {/* <span>•</span> */}
            <span>{uploadDate}</span>
          </div>
          
          <div className="video-card__file-info">
            <span>{duration}</span>
            <span>•</span>
            <span>{size}</span>
            
            {/* Show folder if exists */}
            {folder && (
              <>
                <span>•</span>
                <span className="folder-indicator" title={`Folder: ${folder}`}>
                  <Folder size={12} />
                  {folder.split('/').pop()}
                </span>
              </>
            )}
          </div>
        </div>
        
        {/* Three dot menu with dropdown */}
        <div style={{ position: 'relative' }}>
          <button 
            ref={buttonRef}
            className="video-card__menu" 
            onClick={handleMenuClick}
          >
            <MoreVertical size={18} />
          </button>
          
          {showMenu && (
            <div ref={menuRef} style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              background: '#1a1a1a',
              borderRadius: '8px',
              padding: '6px 0',
              minWidth: '180px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.7)',
              border: '1px solid #333',
              zIndex: 9999,
              marginTop: '4px'
            }}>
              <button 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 16px',
                  color: '#ff9900',
                  textDecoration: 'none',
                  border: 'none',
                  background: 'none',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap'
                }}
                onClick={handleMoveToTrash}
              >
                <Trash2 size={14} />
                <span>Move to Trash</span>
              </button>
              <div style={{
                height: '1px',
                backgroundColor: '#333',
                margin: '4px 0'
              }}></div>
              <button 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 16px',
                  color: '#ff0000',
                  textDecoration: 'none',
                  border: 'none',
                  background: 'none',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap'
                }}
                onClick={handlePermanentDelete}
              >
                <Trash size={14} />
                <span>Delete Permanently</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </Link>
  )

  return compact ? renderCompactView() : renderGridView()
}

export default VideoCard