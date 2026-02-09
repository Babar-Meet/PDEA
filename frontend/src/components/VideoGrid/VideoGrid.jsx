import React from 'react'
import VideoCard from '../VideoCard/VideoCard'
import './VideoGrid.css'

const VideoGrid = ({ videos, loading, viewMode = 'grid' }) => {
  if (loading) {
    return (
      <div className="video-grid__loading">
        <div className="loading-spinner"></div>
        <p>Loading videos...</p>
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="video-grid__empty">
        <div className="empty-icon">🎥</div>
        <h3>No videos found</h3>
        <p>Add video files to the videos folder</p>
      </div>
    )
  }

  if (viewMode === 'list') {
    return (
      <div className="video-grid video-grid--list">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} compact={true} />
        ))}
      </div>
    )
  }

  return (
    <div className="video-grid video-grid--grid">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  )
}

export default VideoGrid