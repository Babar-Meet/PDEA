import React, { useState, useEffect } from 'react'
import { API_BASE_URL } from '../../config'
import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  Folder,
  FolderOpen,
  ListVideo,
  Settings,
  Trash2,
  Download,
  Wind,
  Headphones
} from 'lucide-react'
import './Sidebar.css'

const Sidebar = ({ size, videos }) => {
  const location = useLocation()
  const [trashCount, setTrashCount] = useState(0)

  // Fetch trash count on mount and when videos change
  useEffect(() => {
    const fetchTrashCount = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/videos/trash`)
        const data = await response.json()
        if (data.success) {
          setTrashCount(data.total)
        }
      } catch (error) {
        console.error('Error fetching trash count:', error)
      }
    }
    
    fetchTrashCount()
    // Optionally refresh every 30 seconds
    const interval = setInterval(fetchTrashCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const mainItems = [
    { icon: <Home size={24} />, label: 'Home', path: '/' },
    { icon: <Headphones  size={24} />, label: 'Ambience', path: '/ambience' },
    { icon: <Download size={24} />, label: 'Download', path: '/download' }
  ]

  // Get all folders from videos (excluding thumbnails and playlist folders)
  const getAllFolders = () => {
    if (!videos) return []
    
    const folderSet = new Set()
    
    videos.forEach(video => {
      if (video.folder) {
        folderSet.add(video.folder)
      }
    })
    
    // Convert to array and filter out unwanted folders
    return Array.from(folderSet)
      .filter(folder => {
        const lowerFolder = folder.toLowerCase()
        return lowerFolder !== 'thumbnails' && !lowerFolder.startsWith('playlist') && lowerFolder !== 'trash' && lowerFolder !== 'ambience'
      })
      .map(folder => ({
        name: folder, // Keep original name for display
        path: folder,
        count: videos.filter(v => v.folder === folder).length
      }))
  }

  // Get all playlists from videos (folders that start with "playlist")
  const getAllPlaylists = () => {
    if (!videos) return []
    
    const playlistMap = new Map()
    
    videos.forEach(video => {
      if (video.folder && video.folder.toLowerCase().startsWith('playlist')) {
        // Remove "playlist" prefix and trim whitespace for display
        const displayName = video.folder
          .replace(/^playlist\s*/i, '') // Remove "playlist" prefix (case insensitive)
          .trim()
        
        playlistMap.set(video.folder, {
          originalName: video.folder,
          displayName: displayName || video.folder, // Fallback to original if empty after removal
          count: (playlistMap.get(video.folder)?.count || 0) + 1
        })
      }
    })
    
    // Convert to array
    return Array.from(playlistMap.values())
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
  }

  const allFolders = getAllFolders()
  const allPlaylists = getAllPlaylists()

  const libraryItems = [
    // { icon: <Folder size={24} />, label: 'My Videos', path: '/category/' },
    { icon: <Folder size={24} />, label: 'All Videos', path: '/category/all' },
    { 
      icon: <Trash2 size={24} />, 
      label: 'Trash', 
      path: '/trash',
      badge: trashCount > 0 ? trashCount : null
    }
  ]

  return (
    <aside
      className={`sidebar ${
        size === 'large' ? 'sidebar--open' : size === 'small' ? '' : 'sidebar--hidden'
      }`}
    >
      <nav className="sidebar__nav">

        <div className="sidebar__section">
          {mainItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className={`sidebar__item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="sidebar__icon">{item.icon}</span>
              <span className="sidebar__label">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="sidebar__divider" />

        {/* Library Section */}
        <div className="sidebar__section">
          <h3 className="sidebar__title">Library</h3>
          {libraryItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className={`sidebar__item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="sidebar__icon">{item.icon}</span>
              <div className="sidebar__label-wrapper">
                <span className="sidebar__label">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="sidebar__badge">{item.badge}</span>
                )}
              </div>
            </Link>
          ))}
        </div>

        <div className="sidebar__divider" />

        {/* All Folders Section */}
        {allFolders.length > 0 && (
          <>
            <div className="sidebar__section">
              <h3 className="sidebar__title">Folders</h3>
              {allFolders.map((folder, index) => (
                <Link
                  key={index}
                  to={`/category/${encodeURIComponent(folder.path)}`}
                  className={`sidebar__item ${location.pathname === `/category/${encodeURIComponent(folder.path)}` ? 'active' : ''}`}
                >
                  <span className="sidebar__icon">
                    <FolderOpen size={24} />
                  </span>
                  <div className="sidebar__label-wrapper">
                    <span className="sidebar__label">{folder.name} ({folder.count})</span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="sidebar__divider" />
          </>
        )}

        {/* Playlists Section */}
        {allPlaylists.length > 0 && (
          <div className="sidebar__section">
            <h3 className="sidebar__title">Playlists</h3>
            {allPlaylists.map((playlist, index) => (
              <Link
                key={index}
                to={`/category/${encodeURIComponent(playlist.originalName)}`}
                className={`sidebar__item ${location.pathname === `/category/${encodeURIComponent(playlist.originalName)}` ? 'active' : ''}`}
              >
                <span className="sidebar__icon">
                  <ListVideo size={24} />
                </span>
                <div className="sidebar__label-wrapper">
                  <span className="sidebar__label">{playlist.displayName} ({playlist.count})</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="sidebar__divider" />

        {/* More Options - Only Settings remains */}
        <div className="sidebar__section">
          <Link to="/VideoplayerSettings" className="sidebar__item">
            <span className="sidebar__icon"><Settings size={24} /></span>
            <span className="sidebar__label">Settings</span>
          </Link>
        </div>

      </nav>
    </aside>
  )
}

export default Sidebar