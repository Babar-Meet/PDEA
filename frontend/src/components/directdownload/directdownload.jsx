import React, { useState, useEffect } from 'react'
import { API_BASE_URL } from '../../config'
import { useDownload } from '../../hooks/useDownload'
import {
  Download,
  Search,
  Folder,
  Globe,
  Video,
  Languages,
  AlertCircle
} from 'lucide-react'
import './directdownload.css'

const DirectDownload = () => {
  const { startDirectDownload, downloads, directVideoData, setDirectVideoData } = useDownload()

  // Initialize from Redux or defaults
  const [url, setUrl] = useState(directVideoData?.url || '')
  const [directories, setDirectories] = useState(['Not Watched'])
  const [selectedDir, setSelectedDir] = useState('Not Watched')

  const [loadingMeta, setLoadingMeta] = useState(false)
  const [startingDirect, setStartingDirect] = useState(false)
  const [startingPlanned, setStartingPlanned] = useState(false)

  const [metadata, setMetadata] = useState(directVideoData?.metadata || null)
  const [qualities, setQualities] = useState(directVideoData?.qualities || [])
  const [audioLanguages, setAudioLanguages] = useState(directVideoData?.audioLanguages || [])
  const [selectedQuality, setSelectedQuality] = useState(directVideoData?.selectedQuality || null)
  const [selectedLanguage, setSelectedLanguage] = useState(directVideoData?.selectedLanguage || null)

  const [error, setError] = useState(null)

  // Duplicate Check
  const isDownloading = downloads.some(d => 
    (d.url === url || (metadata && d.title === metadata.title)) && 
    ['downloading', 'queued', 'starting'].includes(d.status)
  )

  useEffect(() => {
    fetchDirectories()
    // Restore
    if (directVideoData) {
        if (!url) setUrl(directVideoData.url)
        if (!metadata) setMetadata(directVideoData.metadata)
        if (!qualities.length) setQualities(directVideoData.qualities)
        if (!audioLanguages.length) setAudioLanguages(directVideoData.audioLanguages)
        if (!selectedQuality) setSelectedQuality(directVideoData.selectedQuality)
        if (!selectedLanguage) setSelectedLanguage(directVideoData.selectedLanguage)
    }
  }, [])

  const fetchDirectories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/download/directories`)
      const data = await res.json()
      if (data.success) {
        setDirectories(data.directories)
        if (data.directories.length > 0) {
          setSelectedDir((prev) =>
            prev && data.directories.includes(prev) ? prev : data.directories[0]
          )
        }
      }
    } catch (err) {
      console.error('Failed to fetch directories', err)
    }
  }

  const buildClientInfo = () => {
    if (typeof navigator === 'undefined') return {}
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform
    }
  }

  const handleDirectDownload = async () => {
    if (!url || !selectedDir) return
    setError(null)
    setStartingDirect(true)
    try {
      const result = await startDirectDownload({
        url,
        save_dir: selectedDir,
        mode: 'original',
        clientInfo: buildClientInfo()
      })
      if (!result.success) {
        setError(result.error || 'Failed to start direct download')
      }
    } finally {
      setStartingDirect(false)
    }
  }

  const handleFetchDetails = async () => {
    if (!url) return
    setLoadingMeta(true)
    setError(null)
    setMetadata(null)
    setQualities([])
    setAudioLanguages([])
    setSelectedQuality(null)
    setSelectedLanguage(null)

    try {
      const res = await fetch(`${API_BASE_URL}/api/download/direct/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          clientInfo: buildClientInfo()
        })
      })
      const data = await res.json()

      if (data.success) {
        setMetadata(data.metadata)
        setQualities(data.qualities || [])
        setAudioLanguages(data.audioLanguages || [])

        if (data.defaultQualityKey) {
          const q = (data.qualities || []).find(
            (item) => item.key === data.defaultQualityKey
          )
          if (q) setSelectedQuality(q)
        }

        if (data.defaultAudioLanguage) {
          const lang = (data.audioLanguages || []).find(
            (item) => item.code === data.defaultAudioLanguage
          )
          if (lang) setSelectedLanguage(lang)
        }

        // Persist
        setDirectVideoData({
            url,
            metadata: data.metadata,
            qualities: data.qualities || [],
            audioLanguages: data.audioLanguages || [],
            selectedQuality: null, // Reset on new fetch
            selectedLanguage: null 
        })

      } else {
        setError(data.error || 'Failed to fetch video details')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
    } finally {
      setLoadingMeta(false)
    }
  }

  const handlePlannedDownload = async () => {
    if (!url || !selectedDir || !selectedQuality || !selectedLanguage) return
    setError(null)
    setStartingPlanned(true)
    try {
      const result = await startDirectDownload({
        url,
        save_dir: selectedDir,
        mode: 'planned',
        qualityKey: selectedQuality.key,
        audioLanguage: selectedLanguage.code,
        metadata: {
          title: metadata?.title,
          thumbnail: metadata?.thumbnail
        },
        clientInfo: buildClientInfo()
      })

      if (!result.success) {
        setError(result.error || 'Failed to start download')
      }
    } finally {
      setStartingPlanned(false)
    }
  }

  const canDirectDownload = url && selectedDir && !startingDirect && !loadingMeta && !isDownloading
  const canFetchDetails = url && !loadingMeta
  const canStartPlanned =
    url && selectedDir && selectedQuality && selectedLanguage && !startingPlanned && !isDownloading

  return (
    <div className="direct-download-container">
      <div className="direct-download-header">
        <h2>Direct Download</h2>
        <p className="direct-download-subtitle">
          Paste a video link, choose a category, and let the app pick the best
          formats for you.
        </p>
      </div>

      <div className="direct-input-row">
        <div className="direct-input-group">
          <label className="direct-label">
            <Globe size={16} />
            Video URL
          </label>
          <input
            type="text"
            className="direct-input"
            placeholder="Paste YouTube URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFetchDetails()}
          />
        </div>

        <div className="direct-input-group">
          <label className="direct-label">
            <Folder size={16} />
            Category
          </label>
          <select
            className="direct-select"
            value={selectedDir}
            onChange={(e) => setSelectedDir(e.target.value)}
          >
            {directories.map((dir) => (
              <option key={dir} value={dir}>
                {dir}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="direct-actions-row">
        <button
          className="direct-primary-btn"
          onClick={handleDirectDownload}
          disabled={!canDirectDownload}
        >
          {startingDirect ? (
            <span className="loading-spinner-small" />
          ) : (
            <Download size={18} />
          )}
          Direct Download (Original Language)
        </button>

        <button
          className="direct-secondary-btn"
          onClick={handleFetchDetails}
          disabled={!canFetchDetails}
        >
          {loadingMeta ? (
            <span className="loading-spinner-small" />
          ) : (
            <Search size={18} />
          )}
          Fetch Details
        </button>
      </div>

      {error && (
        <div className="direct-error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {metadata && (
        <div className="direct-metadata">
          <img
            src={metadata.thumbnail}
            alt={metadata.title}
            className="direct-thumb"
          />
          <div className="direct-meta-info">
            <h3 className="direct-title">{metadata.title}</h3>
            <div className="direct-meta-row">
              <span className="direct-meta-chip">
                <Video size={14} />
                {metadata.durationText || metadata.duration || 'Unknown length'}
              </span>
              {metadata.uploader && (
                <span className="direct-meta-chip">
                  {metadata.uploader}
                </span>
              )}
              {metadata.originalLanguageLabel && (
                <span className="direct-meta-chip original-lang">
                  <Languages size={14} />
                  {metadata.originalLanguageLabel}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {qualities.length > 0 && audioLanguages.length > 0 && (
        <div className="direct-planned-section">
          <div className="direct-columns">
            <div className="direct-column">
              <h4>Video quality</h4>
              <div className="direct-pill-list">
                {qualities.map((q) => (
                  <button
                    key={q.key}
                    className={`direct-pill ${
                      selectedQuality?.key === q.key ? 'active' : ''
                    }`}
                    onClick={() => {
                        setSelectedQuality(q)
                        setDirectVideoData({
                            url, metadata, qualities, audioLanguages, selectedLanguage, selectedQuality: q
                        })
                    }}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="direct-column">
              <h4>Audio language</h4>
              <div className="direct-pill-list">
                {audioLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    className={`direct-pill ${
                      selectedLanguage?.code === lang.code ? 'active' : ''
                    }`}
                    onClick={() => {
                        setSelectedLanguage(lang)
                        setDirectVideoData({
                            url, metadata, qualities, audioLanguages, selectedQuality, selectedLanguage: lang
                        })
                    }}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {canStartPlanned && (
            <div className="direct-download-footer">
              <button
                className="direct-primary-btn wide"
                onClick={handlePlannedDownload}
                disabled={!canStartPlanned}
              >
                {startingPlanned ? (
                  <span className="loading-spinner-small" />
                ) : (
                  <Download size={18} />
                )}
                Download with selected quality & language
              </button>
            </div>
          )}
        </div>
      )}

      {downloads.length > 0 && (
        <div className="direct-mini-progress">
          <h3>Recent Downloads</h3>
          {downloads.slice(0, 3).map((dl) => (
            <div key={dl.id} className="mini-progress-item">
              <div className="mini-progress-info">
                <span className="mini-filename">
                  {dl.filename || dl.title || 'Starting...'}
                </span>
                <span className="mini-percent">{dl.progress}%</span>
              </div>
              <div className="mini-progress-bar">
                <div
                  className={`mini-progress-fill ${dl.status}`}
                  style={{ width: `${dl.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DirectDownload

