import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../../config'
import { useDownload } from '../../hooks/useDownload'
import { 
  Search, 
  List, 
  Settings, 
  Download, 
  CheckCircle2, 
  Clock, 
  X,
  Plus,
  ArrowRight,
  Folder,
  ChevronRight,
  Monitor,
  Video,
  Music,
  Film,
  AlertCircle
} from 'lucide-react'
import './playlistdownload.css'

const PlaylistDownload = () => {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [processingStatus, setProcessingStatus] = useState('idle') // idle, fetching_list, processing_videos, done
  const [playlistVideos, setPlaylistVideos] = useState([])
  const [videoFormatsMap, setVideoFormatsMap] = useState({})
  const [processedCount, setProcessedCount] = useState(0)
  const [error, setError] = useState(null)
  
  const [selectedCommonQuality, setSelectedCommonQuality] = useState(null)
  const [customSelections, setCustomSelections] = useState({}) // videoId -> formatId
  const [activeBatchId, setActiveBatchId] = useState(null)
  
  const [directories, setDirectories] = useState(['Not Watched'])
  const [selectedDir, setSelectedDir] = useState('Not Watched')
  const [newDirName, setNewDirName] = useState('')
  const [showNewDirInput, setShowNewDirInput] = useState(false)
  
  // New States for enhanced selection
  const [activeTab, setActiveTab] = useState('merge') // merge, video_audio, video_only, audio_only
  const [modalActiveTab, setModalActiveTab] = useState('merge') // For the modal
  const [modalVideo, setModalVideo] = useState(null) // Video object being configured in modal
  
  // Modal specific merge selections
  const [modalSelectedVideo, setModalSelectedVideo] = useState(null)
  const [modalSelectedAudio, setModalSelectedAudio] = useState(null)
  
  const { startDownload, downloads } = useDownload()

  useEffect(() => {
    fetchDirectories()
    
    // Auto-detect if there's an active batch in progress
    if (!activeBatchId) {
      const activeBatch = downloads.find(d => 
        ['downloading', 'starting', 'queued'].includes(d.status) && d.batchId
      );
      if (activeBatch) {
        setActiveBatchId(activeBatch.batchId);
      }
    }
  }, [downloads, activeBatchId])

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

  const handleProcessPlaylist = async () => {
    if (!url) return
    setProcessingStatus('fetching_list')
    setError(null)
    setPlaylistVideos([])
    setVideoFormatsMap({})
    setProcessedCount(0)
    setSelectedCommonQuality(null)
    setCustomSelections({})

    try {
      const res = await fetch(`${API_BASE_URL}/api/download/playlist-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      const data = await res.json()

      if (data.success) {
        setPlaylistVideos(data.videos)
        setProcessingStatus('processing_videos')
        
        // Process each video to get formats
        // We'll do it in chunks to avoid overwhelming the server
        const CHUNK_SIZE = 3
        let count = 0
        const formatsMap = {}
        
        for (let i = 0; i < data.videos.length; i += CHUNK_SIZE) {
          const chunk = data.videos.slice(i, i + CHUNK_SIZE)
          await Promise.all(chunk.map(async (v) => {
            try {
              const fRes = await fetch(`${API_BASE_URL}/api/download/formats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: v.url })
              })
              const fData = await fRes.json()
              if (fData.success) {
                formatsMap[v.id] = fData
              }
            } catch (err) {
              console.error(`Failed to fetch formats for ${v.id}`, err)
            } finally {
              count++
              setProcessedCount(count)
            }
          }))
          setVideoFormatsMap({ ...formatsMap })
        }
        
        setProcessingStatus('done')
        
        // Default behavior: Set to 'merge' and find best common video_only resolution
        setActiveTab('merge')
        
        const videoResSets = data.videos.map(v => {
          const formats = formatsMap[v.id]?.formats?.video_only || []
          return new Set(formats.map(f => f.resolution).filter(r => r && r !== 'N/A'))
        })

        if (videoResSets.length > 0) {
          const common = Array.from(videoResSets[0]).filter(res => 
            videoResSets.every(set => set.has(res))
          )
          
          const sortedCommon = common.sort((a, b) => {
            const getVal = (s) => {
              const parts = s.split('x')
              return parseInt(parts[0]) * (parts.length > 1 ? parseInt(parts[1]) : 1)
            }
            return getVal(b) - getVal(a)
          })

          // Default select the best available common resolution
          if (sortedCommon.length > 0) {
            setSelectedCommonQuality(sortedCommon[0])
          } else {
             // If no commonality, ensure we at least reset
             setSelectedCommonQuality(null)
          }
        }
      } else {
        setError(data.error || 'Failed to fetch playlist info')
        setProcessingStatus('idle')
      }
    } catch (err) {
      setError('Network error: ' + err.message)
      setProcessingStatus('idle')
    }
  }

  // Calculate common qualities based on Active Tab
  const commonQualitiesList = useMemo(() => {
    if (processingStatus !== 'done' || playlistVideos.length === 0) return []
    
    // Determine which list to look at
    const formatKey = activeTab === 'video_audio' ? 'video_audio' : 
                      activeTab === 'audio_only' ? 'audio_only' : 
                      'video_only' // merge uses video_only for resolution selection

    // Get all resolutions/formats available for each video
    const videoResSets = playlistVideos.map(v => {
      const formats = videoFormatsMap[v.id]?.formats?.[formatKey] || []
      
      // For audio only, we might want to group by extension or just show "Best Audio"
      if (activeTab === 'audio_only') {
         // Using bitrate or extension as "quality" selector? 
         // For simplicity in playlist mode, we might just list extensions (m4a, mp3)
         return new Set(formats.map(f => f.ext).filter(Boolean))
      }
      
      return new Set(formats.map(f => f.resolution).filter(r => r && r !== 'N/A'))
    })

    if (videoResSets.length === 0) return []

    // Intersection
    const common = Array.from(videoResSets[0]).filter(res => 
      videoResSets.every(set => set.has(res))
    )

    if (activeTab === 'audio_only') {
        return common.sort()
    }

    // Sort by resolution
    return common.sort((a, b) => {
      const getVal = (s) => {
        const parts = s.split('x')
        return parseInt(parts[0]) * (parts.length > 1 ? parseInt(parts[1]) : 1)
      }
      return getVal(b) - getVal(a)
    })
  }, [processingStatus, playlistVideos, videoFormatsMap, activeTab])

  const resolveAutoFormat = (videoId) => {
    const formatsData = videoFormatsMap[videoId]
    if (!formatsData || !formatsData.formats) return null

    const vFormats = formatsData.formats

    if (activeTab === 'merge') {
        // 1. Try Merge (Video Only + Audio Only)
        let videoFmt = null
        const videoList = vFormats.video_only || []
        
        if (selectedCommonQuality) {
            videoFmt = videoList.find(f => f.resolution === selectedCommonQuality)
        }
        // Fallback to best available if specific resolution not found
        if (!videoFmt && videoList.length > 0) videoFmt = videoList[0]
        
        const audioList = vFormats.audio_only || []
        const audioFmt = audioList.length > 0 ? audioList[0] : null
        
        if (videoFmt && audioFmt) {
            return {
                formatId: `${videoFmt.format_id}+${audioFmt.format_id}`,
                label: `${videoFmt.resolution} (${audioFmt.acodec || audioFmt.ext || 'audio'}) Merge`
            }
        }
        
        // 2. Fallback to Standard (Video + Audio) if Merge candidates not found
        let stdFmt = null
        const stdList = vFormats.video_audio || []
        
        if (selectedCommonQuality) {
            stdFmt = stdList.find(f => f.resolution === selectedCommonQuality)
        }
         // Fallback to best available
        if (!stdFmt && stdList.length > 0) stdFmt = stdList[0]
        
        if (stdFmt) {
            return {
                formatId: stdFmt.format_id,
                label: `${stdFmt.resolution} (Standard)`
            }
        }
    } else if (activeTab === 'video_only') {
        const list = vFormats.video_only || []
        let fmt = null
        if (selectedCommonQuality) fmt = list.find(f => f.resolution === selectedCommonQuality)
        if (!fmt && list.length > 0) fmt = list[0]
        if (fmt) return { formatId: fmt.format_id, label: fmt.resolution }
        
    } else if (activeTab === 'audio_only') {
        const list = vFormats.audio_only || []
        let fmt = null
        if (selectedCommonQuality) fmt = list.find(f => f.ext === selectedCommonQuality)
        if (!fmt && list.length > 0) fmt = list[0]
        if (fmt) return { formatId: fmt.format_id, label: fmt.ext }

    } else if (activeTab === 'video_audio') {
        const list = vFormats.video_audio || []
        let fmt = null
        if (selectedCommonQuality) fmt = list.find(f => f.resolution === selectedCommonQuality)
        if (!fmt && list.length > 0) fmt = list[0]
        if (fmt) return { formatId: fmt.format_id, label: fmt.resolution }
    }

    return null
  }

  const handleDownloadAll = async () => {
    if (!selectedCommonQuality && Object.keys(customSelections).length === 0) {
      if (!confirm('No quality selected for some videos. Use best available quality?')) {
        return;
      }
    }
    
    const finalDir = showNewDirInput && newDirName.trim() ? newDirName.trim() : selectedDir
    const batchId = `playlist_${Date.now()}`
    setActiveBatchId(batchId)
    
    for (const v of playlistVideos) {
      let formatId = customSelections[v.id]
      const vFormats = videoFormatsMap[v.id]?.formats || {}
      
      // If no custom selection, try common quality logic
      // If no custom selection, try common quality logic
      if (!formatId) {
        const auto = resolveAutoFormat(v.id)
        if (auto) formatId = auto.formatId
      }

      if (formatId) {
        await startDownload(v.url, formatId, finalDir, {
          title: v.title,
          thumbnail: v.thumbnail,
          batchId: batchId,
          index: playlistVideos.indexOf(v) // Pass index for 00, 01, etc.
        })
      }
    }

    if (showNewDirInput) {
      fetchDirectories()
      setShowNewDirInput(false)
      setNewDirName('')
    }
    
    navigate('/download/progress')
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A'
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
    <div className="playlist-download-container">
      <div className="url-input-container">
        <input
          type="text"
          className="url-input"
          placeholder="Paste YouTube Playlist URL here..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleProcessPlaylist()}
        />
        <button 
          className="fetch-btn"
          onClick={handleProcessPlaylist}
          disabled={processingStatus !== 'idle' && processingStatus !== 'done' || !url}
        >
          {processingStatus === 'fetching_list' || processingStatus === 'processing_videos' ? (
            <span className="loading-spinner-small"></span>
          ) : (
            <Search size={20} />
          )}
          Process Playlist
        </button>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {activeBatchId && (
        <div className="batch-progress-summary">
           <div className="batch-summary-header">
              <h3>Playlist Download Status</h3>
              <a href="/download/progress" className="view-full-queue">View Full Queue <ChevronRight size={14} /></a>
           </div>
           <div className="batch-stats-grid">
              <div className="batch-stat-card">
                 <div className="stat-value">{downloads.filter(d => d.batchId === activeBatchId).length}</div>
                 <div className="stat-label">Total</div>
              </div>
              <div className="batch-stat-card queued">
                 <div className="stat-value">{downloads.filter(d => d.batchId === activeBatchId && d.status === 'queued').length}</div>
                 <div className="stat-label">Queued</div>
              </div>
              <div className="batch-stat-card downloading">
                 <div className="stat-value">{downloads.filter(d => d.batchId === activeBatchId && (d.status === 'downloading' || d.status === 'starting')).length}</div>
                 <div className="stat-label">Active</div>
              </div>
              <div className="batch-stat-card finished">
                 <div className="stat-value">{downloads.filter(d => d.batchId === activeBatchId && d.status === 'finished').length}</div>
                 <div className="stat-label">Success</div>
              </div>
              <div className="batch-stat-card error">
                 <div className="stat-value">{downloads.filter(d => d.batchId === activeBatchId && d.status === 'error').length}</div>
                 <div className="stat-label">Failed</div>
              </div>
           </div>
           
           <div className="active-batch-list">
              {downloads.filter(d => d.batchId === activeBatchId).slice(0, 5).map(dl => (
                 <div key={dl.id} className="batch-mini-item">
                    <img src={dl.thumbnail} alt="" className="mini-thumb" />
                    <div className="mini-info">
                       <div className="mini-title">{dl.title}</div>
                       <div className="mini-progress-row">
                          <div className="mini-bar-bg">
                             <div className={`mini-bar-fill ${dl.status}`} style={{ width: `${dl.progress}%` }}></div>
                          </div>
                          <span className="mini-percent">
                            {dl.status === 'queued' ? 'Queued' : `${dl.progress}%`}
                          </span>
                       </div>
                    </div>
                 </div>
              ))}
              {downloads.filter(d => d.batchId === activeBatchId).length > 5 && (
                 <div className="more-in-queue">And {downloads.filter(d => d.batchId === activeBatchId).length - 5} more videos...</div>
              )}
           </div>
        </div>
      )}

      {playlistVideos.length > 0 && (
        <div className="playlist-info-card">
          <div className="playlist-header">
            <div className="playlist-title">Playlist: {playlistVideos.length} Videos</div>
            <div className="processing-stats">
              {processingStatus === 'processing_videos' ? (
                `Processing formats: ${processedCount} / ${playlistVideos.length}`
              ) : processingStatus === 'done' ? (
                <span style={{ color: '#1dd1a1', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={16} /> All Processed
                </span>
              ) : null}
            </div>
          </div>

          {processingStatus === 'done' && (
            <div className="common-quality-section">
              <div className="section-title">
                <Settings size={18} />
                Global Preferences
              </div>
              
              {/* Type Selection Tabs */}
              <div className="playlist-tabs">
                <button 
                    className={`p-tab ${activeTab === 'merge' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('merge'); setSelectedCommonQuality(null); }}
                >
                    <Plus size={14} /> Merge (Best Quality)
                </button>
                <button 
                    className={`p-tab ${activeTab === 'video_only' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('video_only'); setSelectedCommonQuality(null); }}
                >
                    <Film size={14} /> Video Only
                </button>
                <button 
                    className={`p-tab ${activeTab === 'audio_only' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('audio_only'); setSelectedCommonQuality(null); }}
                >
                    <Music size={14} /> Audio Only
                </button>
                <button 
                    className={`p-tab ${activeTab === 'video_audio' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('video_audio'); setSelectedCommonQuality(null); }}
                >
                    <Video size={14} /> Standard (Pre-Merged)
                </button>
              </div>

              {/* Quality Chips */}
              <div className="quality-selector-area">
                  <h4>Select {activeTab === 'audio_only' ? 'Format' : 'Quality'} (Applied to all)</h4>
                  {commonQualitiesList.length > 0 ? (
                    <div className="qualities-grid">
                      {commonQualitiesList.map(res => (
                        <div 
                          key={res} 
                          className={`quality-chip ${selectedCommonQuality === res ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedCommonQuality(res)
                          }}
                        >
                          {res}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-common-msg">
                        {activeTab === 'merge' ? 'Using "Best Available" for mixed resolutions.' : 'No common options found.'}
                    </div>
                  )}
              </div>
            </div>
          )}

          <div className="video-list-section">
             <div className="section-title">
                <List size={18} />
                Option 2: Individual Custom Downloads
              </div>
            {playlistVideos.map((video) => {
              const formatsData = videoFormatsMap[video.id]
              const isProcessed = !!formatsData
              const hasCustom = !!customSelections[video.id]
              
              let effectiveQuality = ''
              if (isProcessed) {
                if (hasCustom) {
                  // If id contains +, it's a merge
                  if (String(customSelections[video.id]).includes('+')) {
                    effectiveQuality = 'Custom Merge'
                  } else {
                     // Try to find the format label
                     const all = [
                        ...(formatsData.formats?.video_audio||[]), 
                        ...(formatsData.formats?.video_only||[]), 
                        ...(formatsData.formats?.audio_only||[])
                     ]
                     const startFmt = all.find(f => f.format_id === customSelections[video.id])
                     effectiveQuality = startFmt ? (startFmt.resolution !== 'N/A' ? startFmt.resolution : startFmt.ext) : 'Custom'
                  }
                } else {
                  // Auto-selected description
                  const auto = resolveAutoFormat(video.id)
                  effectiveQuality = auto ? auto.label : 'N/A'
                }
              }
              
              return (
                <div key={video.id} className="playlist-video-item">
                  <img src={video.thumbnail} alt={video.title} className="video-mini-thumb" />
                  <div className="video-detail">
                    <div className="video-title-mini" title={video.title}>{video.title}</div>
                    <div className="video-meta-mini">
                      {video.uploader} • {formatDuration(video.duration)}
                    </div>
                  </div>
                  
                  <div className="item-actions">
                    {!isProcessed ? (
                      <div className="video-status">
                        <div className="status-spinner"></div>
                        Wait...
                      </div>
                    ) : (
                      <div className="item-quality-wrapper">
                        <div className="current-quality-tag">
                          {effectiveQuality}
                        </div>
                        <button 
                          className={`custom-download-btn ${hasCustom ? 'has-selection' : ''}`}
                          onClick={() => setModalVideo(video)}
                        >
                          <Settings size={14} />
                          {hasCustom ? 'Changing' : 'Custom'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {playlistVideos.length > 0 && processingStatus === 'done' && (
        <div className="action-footer">
          <div className="dir-selector-wrapper">
            <div className="dir-selector" style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Folder size={20} color="#aaa" />
                <select 
                  value={selectedDir} 
                  onChange={(e) => setSelectedDir(e.target.value)}
                  className="dir-select"
                  style={{ background: 'none', border: 'none', color: 'white', outline: 'none', cursor: 'pointer' }}
                  disabled={showNewDirInput}
                >
                  {directories.map(dir => (
                    <option key={dir} value={dir}>{dir}</option>
                  ))}
                </select>
                <button 
                  className={`new-dir-toggle ${showNewDirInput ? 'active' : ''}`}
                  onClick={() => setShowNewDirInput(!showNewDirInput)}
                  style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}
                >
                  <Plus size={18} />
                </button>
            </div>
            
            {showNewDirInput && (
              <div className="new-dir-input-container" style={{ marginTop: 8 }}>
                <input 
                  type="text" 
                  className="new-dir-input" 
                  placeholder="New folder name..."
                  value={newDirName}
                  onChange={(e) => setNewDirName(e.target.value)}
                  autoFocus
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #3ea6ff', borderRadius: 8, padding: '8px 12px', color: 'white', width: '100%' }}
                />
              </div>
            )}
          </div>

          <button 
            className="download-all-btn"
            onClick={handleDownloadAll}
          >
            <Download size={20} />
            Download all {playlistVideos.length} Videos
          </button>
        </div>
      )}

      {/* Custom Format Modal */}
      {modalVideo && (
        <div className="overlay" onClick={() => setModalVideo(null)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Settings size={20} />
                Custom: {modalVideo.title.substring(0, 40)}...
              </h3>
              <button className="close-btn" onClick={() => setModalVideo(null)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-tabs">
                <button className={`m-tab ${modalActiveTab === 'merge' ? 'active' : ''}`} onClick={() => setModalActiveTab('merge')}>Merge</button>
                <button className={`m-tab ${modalActiveTab === 'video_only' ? 'active' : ''}`} onClick={() => setModalActiveTab('video_only')}>Video Only</button>
                <button className={`m-tab ${modalActiveTab === 'audio_only' ? 'active' : ''}`} onClick={() => setModalActiveTab('audio_only')}>Audio Only</button>
                <button className={`m-tab ${modalActiveTab === 'video_audio' ? 'active' : ''}`} onClick={() => setModalActiveTab('video_audio')}>Std (V+A)</button>
            </div>

            <div className="modal-body">
              {modalActiveTab === 'merge' ? (
                  <div className="merge-selection-container">
                    <div className="merge-column">
                        <h4>Select Video</h4>
                        <div className="formats-list-mini">
                            {(videoFormatsMap[modalVideo.id]?.formats?.video_only || []).map(fmt => (
                                <div 
                                    key={fmt.format_id}
                                    className={`format-card-mini ${modalSelectedVideo?.format_id === fmt.format_id ? 'selected' : ''}`}
                                    onClick={() => setModalSelectedVideo(fmt)}
                                >
                                    <span className="mini-res">{fmt.resolution}</span>
                                    <span className="mini-meta">{fmt.ext} • {formatFileSize(fmt.filesize)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="merge-icon-divider"><Plus size={24} /></div>
                    <div className="merge-column">
                        <h4>Select Audio</h4>
                        <div className="formats-list-mini">
                            {(videoFormatsMap[modalVideo.id]?.formats?.audio_only || []).map(fmt => (
                                <div 
                                    key={fmt.format_id}
                                    className={`format-card-mini ${modalSelectedAudio?.format_id === fmt.format_id ? 'selected' : ''}`}
                                    onClick={() => setModalSelectedAudio(fmt)}
                                >
                                    <span className="mini-res">{fmt.language !== 'und' ? fmt.language : 'Audio'}</span>
                                    <span className="mini-meta">{fmt.ext} • {formatFileSize(fmt.filesize)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                  </div>
              ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                    {(videoFormatsMap[modalVideo.id]?.formats?.[modalActiveTab] || []).map(fmt => (
                      <div 
                        key={fmt.format_id}
                        className={`format-card ${customSelections[modalVideo.id] === fmt.format_id ? 'active' : ''}`}
                        onClick={() => {
                            setCustomSelections({...customSelections, [modalVideo.id]: fmt.format_id})
                            setModalVideo(null)
                        }}
                        style={{
                          background: customSelections[modalVideo.id] === fmt.format_id ? 'rgba(62, 166, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          border: customSelections[modalVideo.id] === fmt.format_id ? '1px solid #3ea6ff' : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 12,
                          padding: 16,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 4 }}>{fmt.resolution !== 'N/A' ? fmt.resolution : (fmt.audio_ext || fmt.ext)}</div>
                        <div style={{ fontSize: '0.85rem', color: '#aaa' }}>{fmt.ext} • {formatFileSize(fmt.filesize)}</div>
                        <div style={{ fontSize: '0.75rem', marginTop: 8, background: 'rgba(255,255,255,0.05)', display: 'inline-block', padding: '2px 6px', borderRadius: 4 }}>
                          {fmt.fps ? `${fmt.fps}fps • ` : ''}{fmt.vcodec || fmt.acodec}
                        </div>
                      </div>
                    ))}
                    {(videoFormatsMap[modalVideo.id]?.formats?.[modalActiveTab] || []).length === 0 && (
                        <div className="no-formats">No formats for this type.</div>
                    )}
                  </div>
              )}
            </div>
            <div className="modal-footer">
               {modalActiveTab === 'merge' && (
                   <button 
                    className="fetch-btn"
                    disabled={!modalSelectedVideo || !modalSelectedAudio}
                    onClick={() => {
                        if (modalSelectedVideo && modalSelectedAudio) {
                            setCustomSelections({
                                ...customSelections, 
                                [modalVideo.id]: `${modalSelectedVideo.format_id}+${modalSelectedAudio.format_id}`
                            })
                            setModalVideo(null)
                            setModalSelectedVideo(null)
                            setModalSelectedAudio(null)
                        }
                    }}
                   >
                       Apply Merge
                   </button>
               )}
              <button 
                className="fetch-btn" 
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
                onClick={() => {
                   const { [modalVideo.id]: _, ...rest } = customSelections
                   setCustomSelections(rest)
                   setModalVideo(null)
                }}
              >
                Reset to Default
              </button>
              <button className="fetch-btn" onClick={() => setModalVideo(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


export default PlaylistDownload