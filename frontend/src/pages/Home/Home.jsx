import React, { useState, useEffect, useRef } from 'react'
import VideoGrid from '../../components/VideoGrid/VideoGrid'
import { Grid, List, FolderOpen, Folder, ListVideo } from 'lucide-react'
import './Home.css'

const Home = ({ videos, categories, loading, fetchVideos, thumbnailsNeeded }) => {
  const [viewMode, setViewMode] = useState('grid')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const categoryFilterRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  
  // Get all categories including "All", folders, and playlists
  const getSidebarCategories = () => {
    const categoriesList = []
    
    // Add "All Videos" category (filtering out ambience and trash)
    const validVideos = videos.filter(v => {
      const lowerFolder = (v.folder || '').toLowerCase();
      return !lowerFolder.startsWith('ambience') && !lowerFolder.startsWith('trash');
    });

    categoriesList.push({
      id: 'all',
      name: 'All Videos',
      displayName: `All Videos (${validVideos.length})`,
      count: validVideos.length
    })

    // Add "My Videos" (root category)
    categoriesList.push({
      id: 'my-videos',
      name: 'My Videos',
      displayName: `My Videos (${videos.filter(v => !v.folder || v.folder === '').length})`,
      count: videos.filter(v => !v.folder || v.folder === '').length
    })

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
          id: folder,
          name: folder.split('/').pop(),
          displayName: `${folder.split('/').pop().replace(/[-_]/g, ' ')} (${videos.filter(v => v.folder === folder).length})`,
          path: folder,
          count: videos.filter(v => v.folder === folder).length,
          icon: <Folder size={16} />
        }))
        .sort((a, b) => b.count - a.count) // Sort by count descending
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
        .map(playlist => ({
          id: playlist.originalName,
          name: playlist.displayName,
          displayName: `${playlist.displayName} (${playlist.count})`,
          count: playlist.count,
          icon: <ListVideo size={16} />
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    }

    const allFolders = getAllFolders()
    const allPlaylists = getAllPlaylists()

    // Add folders to categories
    allFolders.forEach(folder => {
      categoriesList.push(folder)
    })

    // Add playlists to categories
    allPlaylists.forEach(playlist => {
      categoriesList.push({
        id: playlist.id,
        name: playlist.name,
        displayName: playlist.displayName,
        count: playlist.count,
        icon: <ListVideo size={16} />
      })
    })

    return categoriesList
  }

  const sidebarCategories = getSidebarCategories()

  // Filter videos based on selected category
  const filteredVideos = () => {
    // Basic filter to always exclude ambience and trash from the main lists
    const baseVideos = videos.filter(v => {
      const lowerFolder = (v.folder || '').toLowerCase();
      return !lowerFolder.startsWith('ambience') && !lowerFolder.startsWith('trash');
    });

    if (selectedCategory === 'all') return baseVideos;
    if (selectedCategory === 'my-videos') return baseVideos.filter(v => !v.folder || v.folder === '');
    
    // For folder/playlist categories
    return baseVideos.filter(video => video.folder === selectedCategory);
  }

  const currentVideos = filteredVideos()
  const currentCategory = sidebarCategories.find(cat => cat.id === selectedCategory) || { displayName: 'All Videos' }

  // Mouse events for horizontal drag scrolling
  const handleMouseDown = (e) => {
    setIsDragging(true)
    setStartX(e.pageX - categoryFilterRef.current.offsetLeft)
    setScrollLeft(categoryFilterRef.current.scrollLeft)
    categoryFilterRef.current.style.cursor = 'grabbing'
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
    if (categoryFilterRef.current) {
      categoryFilterRef.current.style.cursor = 'grab'
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    if (categoryFilterRef.current) {
      categoryFilterRef.current.style.cursor = 'grab'
    }
  }

  const handleMouseMove = (e) => {
    if (!isDragging || !categoryFilterRef.current) return
    e.preventDefault()
    const x = e.pageX - categoryFilterRef.current.offsetLeft
    const walk = (x - startX) * 2 // scroll-fast factor
    categoryFilterRef.current.scrollLeft = scrollLeft - walk
  }

  // Touch events for mobile
  const handleTouchStart = (e) => {
    setIsDragging(true)
    const touch = e.touches[0]
    setStartX(touch.pageX - categoryFilterRef.current.offsetLeft)
    setScrollLeft(categoryFilterRef.current.scrollLeft)
  }

  const handleTouchMove = (e) => {
    if (!isDragging || !categoryFilterRef.current) return
    const touch = e.touches[0]
    const x = touch.pageX - categoryFilterRef.current.offsetLeft
    const walk = (x - startX) * 2
    categoryFilterRef.current.scrollLeft = scrollLeft - walk
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  // Cleanup event listeners
  useEffect(() => {
    const element = categoryFilterRef.current
    if (!element) return

    element.addEventListener('mousedown', handleMouseDown)
    element.addEventListener('mouseleave', handleMouseLeave)
    element.addEventListener('mouseup', handleMouseUp)
    element.addEventListener('mousemove', handleMouseMove)
    element.addEventListener('touchstart', handleTouchStart)
    element.addEventListener('touchmove', handleTouchMove)
    element.addEventListener('touchend', handleTouchEnd)

    return () => {
      element.removeEventListener('mousedown', handleMouseDown)
      element.removeEventListener('mouseleave', handleMouseLeave)
      element.removeEventListener('mouseup', handleMouseUp)
      element.removeEventListener('mousemove', handleMouseMove)
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDragging, startX, scrollLeft])

  return (
    <div className="home">
      {/* Category Filter Bar */}
      <div className="home__categories">
        <div className="video-sidebar__category-filter-container">
          <div 
            ref={categoryFilterRef}
            className="video-sidebar__category-filter"
          >
            {sidebarCategories.map((category) => (
              <button
                key={category.id}
                className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.id)}
                title={category.displayName}
              >
                {category.icon && <span style={{ marginRight: '6px', display: 'flex', alignItems: 'center' }}>{category.icon}</span>}
                <span className="category-btn__text">
                  {category.displayName}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Header with View Toggle */}
      <div className="home__header">
        <div className="header__left">
          <h2 className="home__title">
            {currentCategory.displayName}
          </h2>
          {selectedCategory !== 'all' && selectedCategory !== 'my-videos' && (
            <div className="category-info">
              {sidebarCategories.find(cat => cat.id === selectedCategory)?.icon || <FolderOpen size={16} />}
              <span className="category-path">{selectedCategory}</span>
            </div>
          )}
        </div>
        <div className="view-toggle">
          <button
            className={`view-toggle__btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            <Grid size={20} />
          </button>
          <button
            className={`view-toggle__btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {/* Video Count */}
      <div className="video-count">
        Showing {currentVideos.length} of {videos.length} videos
        {selectedCategory !== 'all' && ` in "${currentCategory.displayName}"`}
      </div>

      {/* Video Grid */}
      <VideoGrid 
        videos={currentVideos} 
        loading={loading} 
        viewMode={viewMode} 
      />
    </div>
  )
}

export default Home