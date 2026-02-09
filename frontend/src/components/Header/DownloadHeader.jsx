import React from 'react'
import { AlertTriangle } from 'lucide-react'
import './DownloadHeader.css'

const DownloadHeader = () => {
  return (
    <div className="download-header disclaimer-header">
      <div className="disclaimer-content">
        <div className="disclaimer-icon">
          <AlertTriangle size={50} />
        </div>
        <div className="disclaimer-text">
          <h1>Disclaimer</h1>
          <p>
            This is a basic college student project created for educational purposes only.
            We do not support or promote downloading YouTube videos.
            Please ensure you have proper rights or permission from the original content creator
            before downloading or using any video.
          </p>
        </div>
      </div>
    </div>
  )
}

export default DownloadHeader
