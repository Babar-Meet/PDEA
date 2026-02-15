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
            This software was originally developed as a college student project for educational and research purposes. We do not support or promote unauthorized downloading of copyrighted content from YouTube or any other platform. Users are solely responsible for ensuring they have proper rights, licenses, or permission from the original content owner before downloading, using, or distributing any media through this application.
          </p>
        </div>
      </div>
    </div>
  )
}

export default DownloadHeader
