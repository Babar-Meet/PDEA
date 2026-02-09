import React, { useState, useEffect } from 'react'
import { API_BASE_URL } from '../../config'
import { Check, X, Image } from 'lucide-react'
import './ThumbnailStatus.css'

const ThumbnailStatus = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchThumbnailStats()
  }, [])

  const fetchThumbnailStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/info`)
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching thumbnail stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="thumbnail-status loading">Loading thumbnail stats...</div>
  }

  if (!stats) {
    return <div className="thumbnail-status error">Failed to load thumbnail stats</div>
  }

  const matchRate = stats.videoCount > 0 
    ? ((stats.thumbnailCount / stats.videoCount) * 100).toFixed(1) 
    : 0

  return (
    <div className="thumbnail-status">
      <div className="thumbnail-status__header">
        <Image size={20} />
        <h4>Thumbnail Status</h4>
      </div>
      
      <div className="thumbnail-status__stats">
        <div className="stat-item">
          <div className="stat-label">Videos:</div>
          <div className="stat-value">{stats.videoCount}</div>
        </div>
        
        <div className="stat-item">
          <div className="stat-label">Thumbnails:</div>
          <div className="stat-value">
            {stats.thumbnailCount}
            {stats.thumbnailCount > 0 && (
              <span className="stat-icon success">
                <Check size={12} />
              </span>
            )}
          </div>
        </div>
        
        <div className="stat-item">
          <div className="stat-label">Match Rate:</div>
          <div className={`stat-value ${matchRate > 50 ? 'good' : 'warning'}`}>
            {matchRate}%
          </div>
        </div>
      </div>
      
      <div className="thumbnail-status__info">
        <p className="info-text">
          Place thumbnails in: <code>{stats.thumbnailsFolder.split('\\').pop()}</code>
        </p>
        <p className="info-text">
          Format: <code>videoname.jpg</code> (same name as video)
        </p>
      </div>
      
      <button 
        className="refresh-btn"
        onClick={fetchThumbnailStats}
        disabled={loading}
      >
        {loading ? 'Refreshing...' : 'Refresh Stats'}
      </button>
    </div>
  )
}

export default ThumbnailStatus