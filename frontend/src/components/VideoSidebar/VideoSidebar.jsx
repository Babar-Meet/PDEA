import React, { useState, useEffect, useRef } from 'react'
import VideoCard from '../VideoCard/VideoCard'
import './VideoSidebar.css'

const VideoSidebar = ({ videos, currentVideoId }) => {
  // Set default to 'same-type'
  const [selectedCategory, setSelectedCategory] = useState('same-type')
  const categoryFilterRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  
  // Get current video
  const currentVideo = videos.find(video => video.id === currentVideoId)
  
  // Get current video's folder (for "Same Type" filter)
  const currentVideoFolder = currentVideo?.folder || ''
  
  // Get current video's folder name for display
  const currentFolderName = currentVideoFolder ? 
    currentVideoFolder.split('/').pop().replace(/[-_]/g, ' ') : ''

  // Check if same-type category has videos
  const sameTypeVideoCount = videos.filter(v => 
    v.folder === currentVideoFolder && v.id !== currentVideoId
  ).length

  // If same-type has no videos, default to 'all' instead
  useEffect(() => {
    if (selectedCategory === 'same-type' && sameTypeVideoCount === 0) {
      setSelectedCategory('all')
    }
  }, [sameTypeVideoCount, selectedCategory])

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

  // Get popular folders (folders with most videos)
  const getPopularFolders = () => {
    const folderCounts = {}
    
    videos.forEach(video => {
      if (video.folder) {
        const folderPath = video.folder
        folderCounts[folderPath] = (folderCounts[folderPath] || 0) + 1
      }
    })
    
    return Object.entries(folderCounts)
      .filter(([path]) => !path.toLowerCase().startsWith('ambience') && !path.toLowerCase().startsWith('trash'))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // Top 10 folders
      .map(([folderPath, count]) => {
        const folderName = folderPath.split('/').pop()
        return {
          id: folderPath,
          name: folderName.replace(/[-_]/g, ' ').split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
          displayName: `${folderName.replace(/[-_]/g, ' ').split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')} (${count})`,
          path: folderPath,
          count: count
        }
      })
  }

  const popularFolders = getPopularFolders()

  // Create category options - KEEPING THE ORIGINAL ORDER
  const validVideos = videos.filter(v => {
    const lowerFolder = (v.folder || '').toLowerCase();
    return !lowerFolder.startsWith('ambience') && !lowerFolder.startsWith('trash');
  });

  const categories = [
    {
      id: 'all',
      name: 'All Videos',
      displayName: `All Videos (${validVideos.length - 1})`
    },
    {
      id: 'same-type',
      name: 'Same Type',
      displayName: currentFolderName ? 
        `${currentFolderName} (${sameTypeVideoCount})` : 
        'Same Type (0)'
    },
    ...popularFolders.filter(folder => folder.path !== currentVideoFolder)
  ]

  // Filter videos based on selected category
  const filteredVideos = validVideos.filter(video => {
    if (video.id === currentVideoId) return false
    
    switch (selectedCategory) {
      case 'all':
        return true
      case 'same-type':
        return video.folder === currentVideoFolder
      default:
        return video.folder === selectedCategory
    }
  })

  // If there are no videos after filtering
  if (filteredVideos.length === 0) {
    const noVideosMessage = selectedCategory === 'same-type' ? 
      'No videos in the same folder' : 
      'No videos in this category'
    
    return (
      <div className="video-sidebar">
        <div className="video-sidebar__header">
          <h3 className="video-sidebar__title">Recommended</h3>
          <div className="video-sidebar__category-filter-container">
            <div 
              ref={categoryFilterRef}
              className="video-sidebar__category-filter"
            >
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.displayName}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="video-sidebar__empty">
          <p>{noVideosMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="video-sidebar">
      <div className="video-sidebar__header">
        <h3 className="video-sidebar__title">Recommended</h3>
        <div className="video-sidebar__category-filter-container">
          <div 
            ref={categoryFilterRef}
            className="video-sidebar__category-filter"
          >
            {categories.map((category) => (
              <button
                key={category.id}
                className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.displayName}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="video-sidebar__list">
        {filteredVideos.map((video) => (
          <VideoCard key={video.id} video={video} compact={true} />
        ))}
      </div>
    </div>
  )
}

export default VideoSidebar