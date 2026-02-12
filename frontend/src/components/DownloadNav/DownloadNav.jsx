import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Video, 
  SlidersHorizontal,
  Users, 
  List, 
  Clock, 
  Settings,
  BarChart3
} from 'lucide-react'
import './DownloadNav.css'

const DownloadNav = () => {
  const location = useLocation()
  const currentPath = location.pathname

  const navItems = [
    { path: '/download/direct', label: 'Direct Download', icon: <Video size={20} /> },
    { path: '/download/simple', label: 'Simple Download', icon: <Video size={20} /> },
    { path: '/download/advance', label: 'Advance Download', icon: <SlidersHorizontal size={20} /> },
    { path: '/download/batch', label: 'Batch Download', icon: <Users size={20} /> },
    { path: '/download/playlist', label: 'Playlist', icon: <List size={20} /> },
    { path: '/download/new-videos', label: 'New Videos', icon: <Clock size={20} /> },
    { path: '/download/subscriptions', label: 'Subscriptions', icon: <Users size={20} /> },
    { path: '/download/progress', label: 'Processes', icon: <BarChart3 size={20} /> },
    { path: '/download/settings', label: 'Settings', icon: <Settings size={20} /> }
  ]

  return (
    <div className="download-nav-bar">
      <nav className="download-horizontal-nav">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`download-nav-item ${currentPath === item.path ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}

export default DownloadNav