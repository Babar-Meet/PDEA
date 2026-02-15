import React from 'react'
import './VideoSkeleton.css'

const VideoSkeleton = ({ viewMode = 'grid' }) => {
  if (viewMode === 'list') {
    return (
      <div className="video-skeleton video-skeleton--list">
        <div className="video-skeleton__thumbnail shimmer"></div>
        <div className="video-skeleton__content">
          <div className="video-skeleton__title shimmer"></div>
          <div className="video-skeleton__meta shimmer"></div>
          <div className="video-skeleton__stats shimmer"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="video-skeleton video-skeleton--grid">
      <div className="video-skeleton__thumbnail shimmer"></div>
      <div className="video-skeleton__content">
        <div className="video-skeleton__avatar shimmer"></div>
        <div className="video-skeleton__details">
          <div className="video-skeleton__title shimmer"></div>
          <div className="video-skeleton__meta shimmer"></div>
        </div>
      </div>
    </div>
  )
}

export default VideoSkeleton
