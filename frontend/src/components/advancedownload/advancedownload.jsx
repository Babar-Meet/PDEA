import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../../config'
import { formatDate } from '../../utils/format'
import { useDownload } from '../../hooks/useDownload'
import { 
  Download, 
  Search, 
  Link, 
  Folder, 
  Film, 
  Music, 
  Video, 
  Check, 
  AlertCircle,
  Clock,
  Eye,
  User,
  Calendar,
  Languages,
  Plus,
  ArrowRight
} from 'lucide-react'
import './advancedownload.css'

const AdvanceDownload = () => {
  const navigate = useNavigate()
  const { startDownload, downloads, simpleVideoData, setSimpleVideoData } = useDownload()

  // Initialize from Redux or defaults
  const [url, setUrl] = useState(simpleVideoData?.url || '')
  const [loading, setLoading] = useState(false)
  const [metadata, setMetadata] = useState(simpleVideoData?.metadata || null)
  const [formats, setFormats] = useState(simpleVideoData?.formats || null)
  
  const [activeTab, setActiveTab] = useState('video_audio') 
  const [selectedFormat, setSelectedFormat] = useState(null)
  
  const [directories, setDirectories] = useState(['Not Watched'])
  const [selectedDir, setSelectedDir] = useState('Not Watched')
  const [newDirName, setNewDirName] = useState('')
  const [showNewDirInput, setShowNewDirInput] = useState(false)
  const [error, setError] = useState(null)
  
  // Merge states
  const [selectedVideoOnly, setSelectedVideoOnly] = useState(null)
  const [selectedAudioOnly, setSelectedAudioOnly] = useState(null)

  // Duplicate Check
  const isDownloading = downloads.some(d => 
    (d.url === url || (metadata && d.title === metadata.title)) && 
    ['downloading', 'queued', 'starting'].includes(d.status)
  )

  useEffect(() => {
    fetchDirectories()
    // Restore
    if (simpleVideoData) {
        if (!url) setUrl(simpleVideoData.url)
        if (!metadata) setMetadata(simpleVideoData.metadata)
        if (!formats) {
            setFormats(simpleVideoData.formats)
            // Auto-select tab if formats just restored
            if (simpleVideoData.formats?.video_audio?.length > 0) setActiveTab('video_audio')
            else if (simpleVideoData.formats?.video_only?.length > 0) setActiveTab('video_only')
            else setActiveTab('audio_only')
        }
    }
  }, [])

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

  const handleFetchFormats = async () => {
    if (!url) return
    setLoading(true)
    setError(null)
    setMetadata(null)
    setFormats(null)
    setSelectedFormat(null)
    setSelectedVideoOnly(null)
    setSelectedAudioOnly(null)

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
        // Auto-select first available tab
        if (data.formats.video_audio.length > 0) setActiveTab('video_audio')
        else if (data.formats.video_only.length > 0) setActiveTab('video_only')
        else setActiveTab('audio_only')

        setSimpleVideoData({
            url, 
            metadata: data.metadata,
            formats: data.formats
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

  const handleDownload = async () => {
    let formatId = ''
    if (activeTab === 'merge') {
      if (!selectedVideoOnly || !selectedAudioOnly) {
        setError('Please select both video and audio for merging')
        return
      }
      formatId = `${selectedVideoOnly.format_id}+${selectedAudioOnly.format_id}`
    } else {
      if (!selectedFormat) return
      formatId = selectedFormat.format_id
    }

    const finalDir = showNewDirInput && newDirName.trim() ? newDirName.trim() : selectedDir
    
    setError(null)
    const result = await startDownload(url, formatId, finalDir, {
      title: metadata?.title,
      thumbnail: metadata?.thumbnail
    })
    
    if (!result.success) {
      setError(result.error)
    } else {
      // Refresh directories if we created a new one
      if (showNewDirInput) {
        fetchDirectories()
        setShowNewDirInput(false)
        setNewDirName('')
      }
      navigate('/download/progress')
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A'
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`
  }

  return (
    <div className="advance-download-container">
      {/* URL Input */}
      <div className="url-input-container">
        <input
          type="text"
          className="url-input"
          placeholder="Paste YouTube URL here..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleFetchFormats()}
        />
        <button 
          className="fetch-btn"
          onClick={handleFetchFormats}
          disabled={loading || !url}
        >
          {loading ? (
            <span className="loading-spinner-small"></span>
          ) : (
            <Search size={20} />
          )}
          Get Formats
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
              <User size={14} style={{ display: 'inline', marginRight: 4 }} />
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
                {formatDate(metadata.upload_date)}
              </div>
              <div className="stat-item">
                <Languages size={14} />
                {metadata.language || 'Original'}
                {metadata.original_language && (
                  <span className="original-badge">ORIGINAL</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formats Selection */}
      {formats && (
        <div className="formats-container">
          <div className="format-tabs">
            <button 
              className={`tab-btn ${activeTab === 'video_audio' ? 'active' : ''}`}
              onClick={() => setActiveTab('video_audio')}
            >
              <Video size={16} />
              Video + Audio
            </button>
            <button 
              className={`tab-btn ${activeTab === 'video_only' ? 'active' : ''}`}
              onClick={() => setActiveTab('video_only')}
            >
              <Film size={16} />
              Video Only
            </button>
            <button 
              className={`tab-btn ${activeTab === 'audio_only' ? 'active' : ''}`}
              onClick={() => setActiveTab('audio_only')}
            >
              <Music size={16} />
              Audio Only
            </button>
            <button 
              className={`tab-btn ${activeTab === 'merge' ? 'active' : ''}`}
              onClick={() => setActiveTab('merge')}
            >
              <Plus size={16} />
              Advanced Merge
            </button>
          </div>

          <div className="formats-list-wrapper">
            {activeTab === 'merge' ? (
                <div className="merge-selection-container">
                    <div className="merge-column">
                        <h3>Select Video</h3>
                        <div className="formats-list-mini">
                            {formats.video_only.map(fmt => (
                                <div 
                                    key={fmt.format_id}
                                    className={`format-card-mini ${selectedVideoOnly?.format_id === fmt.format_id ? 'selected' : ''}`}
                                    onClick={() => setSelectedVideoOnly(fmt)}
                                >
                                    <span className="mini-res">{fmt.resolution}</span>
                                    <span className="mini-meta">{fmt.ext} • {formatFileSize(fmt.filesize)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="merge-icon-divider"><Plus size={24} /></div>
                    <div className="merge-column">
                        <h3>Select Audio</h3>
                        <div className="formats-list-mini">
                            {formats.audio_only.map(fmt => (
                                <div 
                                    key={fmt.format_id}
                                    className={`format-card-mini ${selectedAudioOnly?.format_id === fmt.format_id ? 'selected' : ''}`}
                                    onClick={() => setSelectedAudioOnly(fmt)}
                                >
                                    <span className="mini-res">{fmt.language !== 'und' ? fmt.language : 'Audio'}</span>
                                    <span className="mini-meta">{fmt.ext} • {formatFileSize(fmt.filesize)}</span>
                                    {fmt.is_original && <span className="mini-badge">ORIGINAL</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="formats-list">
                    {formats[activeTab]?.map((fmt) => (
                    <div 
                        key={fmt.format_id}
                        className={`format-card ${selectedFormat?.format_id === fmt.format_id ? 'selected' : ''}`}
                        onClick={() => setSelectedFormat(fmt)}
                    >
                        <div className="format-res">
                        {fmt.resolution !== 'N/A' ? fmt.resolution : fmt.audio_ext || fmt.ext}
                        {selectedFormat?.format_id === fmt.format_id && <Check size={18} className="format-check" />}
                        </div>
                        <div className="format-meta">
                        <span className="format-ext">{fmt.ext}</span>
                        <span className="format-size">{formatFileSize(fmt.filesize)}</span>
                        </div>
                        <div className="format-badges">
                        {fmt.vcodec && <span className="format-badge">{fmt.vcodec}</span>}
                        {fmt.acodec && <span className="format-badge">{fmt.acodec}</span>}
                        {fmt.fps && <span className="format-badge">{fmt.fps}fps</span>}
                        {fmt.language && fmt.language !== 'und' && <span className="format-badge lang">{fmt.language}</span>}
                        {fmt.is_original && <span className="format-badge original">ORIGINAL</span>}
                        </div>
                    </div>
                    ))}
                    {formats[activeTab]?.length === 0 && (
                    <div className="no-formats">No formats available for this category</div>
                    )}
                </div>
            )}
          </div>
        </div>
      )}

      {/* Action Bar */}
      {(selectedFormat || (selectedVideoOnly && selectedAudioOnly)) && (
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
                <span className="mini-filename">{dl.filename || 'Starting...'}</span>
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

export default AdvanceDownload
