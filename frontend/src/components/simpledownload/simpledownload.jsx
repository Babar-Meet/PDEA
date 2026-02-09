import React, { useState, useEffect } from 'react'
import { API_BASE_URL } from '../../config'
import { useDownload } from '../../hooks/useDownload'
import { 
  Download, 
  Search, 
  Folder, 
  AlertCircle,
  Clock,
  Eye,
  User,
  Calendar,
  Languages,
  Plus,
  ArrowRight,
  ChevronDown
} from 'lucide-react'
import './simpledownload.css'

const SimpleDownload = () => {
  const { startDownload, downloads, simpleVideoData, setSimpleVideoData } = useDownload()

  // Initialize from Redux or defaults
  const [url, setUrl] = useState(simpleVideoData?.url || '')
  const [loading, setLoading] = useState(false)
  const [metadata, setMetadata] = useState(simpleVideoData?.metadata || null)
  const [formats, setFormats] = useState(simpleVideoData?.formats || null)
  const [selectedQuality, setSelectedQuality] = useState(simpleVideoData?.selectedQuality || null)
  
  const [directories, setDirectories] = useState(['Not Watched'])
  const [selectedDir, setSelectedDir] = useState('Not Watched')
  const [newDirName, setNewDirName] = useState('')
  const [showNewDirInput, setShowNewDirInput] = useState(false)
  const [error, setError] = useState(null)

  // Check if this video is already downloading
  const isDownloading = downloads.some(d => 
    (d.url === url || (metadata && d.title === metadata.title)) && 
    ['downloading', 'queued', 'starting'].includes(d.status)
  )

  useEffect(() => {
    fetchDirectories()
    // Restore state from Redux if available
    if (simpleVideoData) { 
        if (!url) setUrl(simpleVideoData.url)
        if (!metadata) setMetadata(simpleVideoData.metadata)
        if (!formats) setFormats(simpleVideoData.formats)
        if (!selectedQuality) setSelectedQuality(simpleVideoData.selectedQuality)
    }
  }, []) // On mount

  const fetchDirectories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/download/directories`)
      const data = await res.json()
      if (data.success) {
        setDirectories(data.directories)
      }
    } catch (err) {
      console.error('Failed to fetch directories', err)
    }
  }

  const handleFetch = async () => {
    if (!url) return
    setLoading(true)
    setError(null)
    setMetadata(null)
    setFormats(null)
    setSelectedQuality(null)

    try {
      const res = await fetch(`${API_BASE_URL}/api/download/formats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      const data = await res.json()

      if (data.success) {
        setMetadata(data.metadata)
        setFormats(data.formats)
        
        let initialQuality = null
        if (data.formats.video_only && data.formats.video_only.length > 0) {
          initialQuality = data.formats.video_only[0].resolution
          setSelectedQuality(initialQuality)
        }
        
        // Persist to Redux
        setSimpleVideoData({
            url,
            metadata: data.metadata,
            formats: data.formats,
            selectedQuality: initialQuality
        })

      } else {
        setError(data.error || 'Failed to fetch formats')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleQualityChange = (e) => {
      const quality = e.target.value
      setSelectedQuality(quality)
      if (formats && metadata) {
          setSimpleVideoData({
              url,
              metadata,
              formats,
              selectedQuality: quality
          })
      }
  }

  const handleDownload = async () => {
    if (!selectedQuality) {
      setError('Please select a quality')
      return
    }

    if (isDownloading) {
        setError('This video is already in the download queue!')
        return
    }

    // Find video format with selected quality
    const videoFormat = formats.video_only.find(f => f.resolution === selectedQuality) || formats.video_only[0]
    
    // Find best audio in original language
    const originalLang = metadata?.original_language || metadata?.language || 'und'
    const audioFormats = formats.audio_only.filter(f => f.language === originalLang || f.language === 'und')
    const audioFormat = audioFormats.length > 0 ? audioFormats[0] : formats.audio_only[0]

    if (!videoFormat || !audioFormat) {
      setError('Could not find suitable formats for merging')
      return
    }

    const formatId = `${videoFormat.format_id}+${audioFormat.format_id}`
    const finalDir = showNewDirInput && newDirName.trim() ? newDirName.trim() : selectedDir
    
    setError(null)
    const result = await startDownload(url, formatId, finalDir, {
      title: metadata?.title,
      thumbnail: metadata?.thumbnail
    })
    
    if (!result.success) {
      setError(result.error)
    } else {
      if (showNewDirInput) {
        fetchDirectories()
        setShowNewDirInput(false)
        setNewDirName('')
      }
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`
  }

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return ''
    const gb = bytes / (1024 * 1024 * 1024)
    const mb = bytes / (1024 * 1024)
    
    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`
    } else if (mb >= 1) {
      return `${Math.round(mb)} MB`
    } else {
      return `${Math.round(bytes / 1024)} KB`
    }
  }

  const getSizeForQuality = (quality) => {
    if (!formats) return ''
    
    // Find video format with selected quality
    const videoFormat = formats.video_only.find(f => f.resolution === quality)
    if (!videoFormat) return ''
    
    // Find best audio in original language
    const originalLang = metadata?.original_language || metadata?.language || 'und'
    const audioFormats = formats.audio_only.filter(f => f.language === originalLang || f.language === 'und')
    const audioFormat = audioFormats.length > 0 ? audioFormats[0] : formats.audio_only[0]
    
    if (!audioFormat) return ''
    
    // Calculate total size (video + audio)
    const videoSize = videoFormat.filesize || videoFormat.filesize_approx || 0
    const audioSize = audioFormat.filesize || audioFormat.filesize_approx || 0
    const totalSize = videoSize + audioSize
    
    return totalSize > 0 ? formatFileSize(totalSize) : ''
  }

  // Get unique quality options
  const qualityOptions = formats?.video_only 
    ? [...new Set(formats.video_only.map(f => f.resolution))].sort((a, b) => {
        const aHeight = parseInt(a) || 0
        const bHeight = parseInt(b) || 0
        return bHeight - aHeight
      })
    : []

  return (
    <div className="simple-download-container">
      <div className="simple-header">
        <h1>Simple Download</h1>
        <p>Just paste a link, select quality, and download. Audio will be merged automatically.</p>
      </div>

      {/* URL Input */}
      <div className="url-input-container">
        <input
          type="text"
          className="url-input"
          placeholder="Paste YouTube URL here..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
        />
        <button 
          className="fetch-btn"
          onClick={handleFetch}
          disabled={loading || !url}
        >
          {loading ? (
            <span className="loading-spinner-small"></span>
          ) : (
            <Search size={20} />
          )}
          Fetch Video
        </button>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Metadata Display */}
      {metadata && (
        <div className="video-metadata">
          <img src={metadata.thumbnail} alt={metadata.title} className="video-thumb" />
          <div className="video-info">
            <h2 className="video-title">{metadata.title}</h2>
            <div className="video-uploader">
              <User size={14} />
              {metadata.uploader}
            </div>
            <div className="video-stats">
              <div className="stat-item">
                <Eye size={14} />
                {metadata.view_count?.toLocaleString()} views
              </div>
              <div className="stat-item">
                <Clock size={14} />
                {formatDuration(metadata.duration)}
              </div>
              <div className="stat-item">
                <Calendar size={14} />
                {metadata.upload_date}
              </div>
              <div className="stat-item">
                <Languages size={14} />
                {metadata.language || 'Original'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quality Selection */}
      {qualityOptions.length > 0 && (
        <div className="quality-selection-container">
          <h3>Select Video Quality</h3>
          <p className="quality-hint">Audio will be automatically merged in original language with best quality</p>
          
          <div className="quality-dropdown-wrapper">
            <ChevronDown className="dropdown-icon" size={20} />
            <select 
              className="quality-dropdown"
              value={selectedQuality || ''}
              onChange={handleQualityChange}
            >
              {qualityOptions.map(quality => {
                const size = getSizeForQuality(quality)
                const qualityLabel = 
                   quality === '23040x12960' ? '24K (12960p)' :
                   quality === '15360x8640' ? '16K (8640p)' :
                   quality === '11520x6480' ? '12K (6480p)' :
                   quality === '7680x4320' ? '8K (4320p)' :
                   quality === '3840x2160' ? '4K (2160p)' :
                   quality === '2560x1440' ? '2K (1440p)' :
                   quality === '1920x1080' ? 'Full HD (1080p)' :
                   quality === '1280x720' ? 'HD (720p)' :
                   quality === '854x480' ? 'SD (480p)' :
                   quality === '640x360' ? '360p' :
                   quality
                
                return (
                  <option key={quality} value={quality}>
                    {size ? `${qualityLabel} (${size})` : qualityLabel}
                  </option>
                )
              })}
            </select>
          </div>
        </div>
      )}

      {/* Action Bar */}
      {selectedQuality && (
        <div className="action-bar">
          <div className="dir-selector-wrapper">
            <div className="dir-selector">
              <Folder size={20} color="#aaa" />
              <select 
                value={selectedDir} 
                onChange={(e) => setSelectedDir(e.target.value)}
                className="dir-select"
                disabled={showNewDirInput}
              >
                {directories.map(dir => (
                  <option key={dir} value={dir}>{dir}</option>
                ))}
              </select>
              <button 
                className={`new-dir-toggle ${showNewDirInput ? 'active' : ''}`}
                onClick={() => setShowNewDirInput(!showNewDirInput)}
                title="Create New Folder"
              >
                <Plus size={18} />
              </button>
            </div>
            
            {showNewDirInput && (
              <div className="new-dir-input-container">
                <input 
                  type="text" 
                  className="new-dir-input" 
                  placeholder="New folder name..."
                  value={newDirName}
                  onChange={(e) => setNewDirName(e.target.value)}
                  autoFocus
                />
              </div>
            )}
          </div>
          
          <button 
            className="download-btn"
            onClick={handleDownload}
            disabled={isDownloading}
            style={isDownloading ? { opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#555' } : {}}
            title={isDownloading ? "Download in progress" : "Download Video"}
          >
            <Download size={20} />
            Download
          </button>
        </div>
      )}

      {/* Active Downloads List (Mini) */}
      {downloads.length > 0 && (
        <div className="mini-progress-list">
          <h3>Recent Downloads</h3>
          {downloads.slice(0, 3).map(dl => (
            <div key={dl.id} className="mini-progress-item">
              <div className="mini-progress-info">
                <span className="mini-filename">{dl.filename || dl.title || 'Starting...'}</span>
                <span className="mini-percent">{dl.progress}%</span>
              </div>
              <div className="mini-progress-bar">
                <div 
                  className={`mini-progress-fill ${dl.status}`} 
                  style={{ width: `${dl.progress}%` }}
                ></div>
              </div>
            </div>
          ))}
          {downloads.length > 3 && (
            <div className="view-all-link">
              <a href="/download/progress">View all processes <ArrowRight size={14} /></a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SimpleDownload
