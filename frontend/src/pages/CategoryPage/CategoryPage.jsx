import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import VideoGrid from '../../components/VideoGrid/VideoGrid'
import { ArrowLeft } from 'lucide-react'
import './CategoryPage.css'

const CategoryPage = ({ videos, categories, fetchVideos }) => {
  const { categoryPath } = useParams()
  const navigate = useNavigate()
  const [categoryVideos, setCategoryVideos] = useState([])
  const [categoryInfo, setCategoryInfo] = useState(null)

  useEffect(() => {
    if (!videos || !categoryPath) return

    // Decode category path
    const decodedPath = decodeURIComponent(categoryPath)
    
    // Filter videos for this category
    const filtered = videos.filter(video => {
      if (!video.folder) return false
      
      if (decodedPath === 'all') return true
      
      // Match exact folder or subfolder
      return video.folder === decodedPath || 
             video.folder.startsWith(decodedPath + '/')
    })
    
    setCategoryVideos(filtered)

    // Get category info
    if (decodedPath === 'all') {
      setCategoryInfo({
        name: 'All Videos',
        path: 'all',
        displayName: 'All Videos',
        count: videos.length
      })
    } else {
      const category = categories?.find(c => c.path === decodedPath)
      setCategoryInfo(category || {
        name: decodedPath.split('/').pop(),
        path: decodedPath,
        displayName: decodedPath.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count: filtered.length
      })
    }

  }, [categoryPath, videos, categories])

  if (!categoryPath) {
    return (
      <div className="category-page">
        <div className="category-not-found">
          <h2>Category not specified</h2>
          <button onClick={() => navigate('/')}>Go Home</button>
        </div>
      </div>
    )
  }

  return (
    <div className="category-page">
      {/* Category Header */}
      <div className="category-header">
        <button className="back-button" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
          Back to Home
        </button>
      </div>

      {/* Videos */}
      <div className="category-videos">
        <h3>{categoryInfo?.displayName || 'Category'} ({categoryVideos.length} videos)</h3>
        {categoryVideos.length > 0 ? (
          <VideoGrid videos={categoryVideos} viewMode="grid" />
        ) : (
          <div className="no-videos">
            <p>No videos found in this category</p>
            <button onClick={() => navigate('/')}>Browse All Videos</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CategoryPage