import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import DownloadHeader from '../../components/Header/DownloadHeader'
import DownloadNav from '../../components/DownloadNav/DownloadNav'
import DirectDownload from '../../components/directdownload/directdownload'
import SimpleDownload from '../../components/simpledownload/simpledownload'
import AdvanceDownload from '../../components/advancedownload/advancedownload'
import BatchDownload from '../../components/batchdownload/batchdownload'
import PlaylistDownload from '../../components/playlistdownload/playlistdownload'
import NewVideos from '../../components/newvideos/newvideos'
import Subscriptions from '../../components/subscriptions/subscriptions'
import ProgressPage from '../../components/progresspage/progresspage'
import DownloadSettings from '../../components/downloadsettings/downloadsettings'
import './Download.css'

const Download = () => {
  return (
    <div className="download-page">
      <DownloadHeader />
      <DownloadNav />
      
      <div className="download-content">
        <Routes>
          <Route index element={<Navigate to="/download/simple" replace />} />
          <Route path="direct" element={<DirectDownload />} />
          <Route path="simple" element={<SimpleDownload />} />
          <Route path="advance" element={<AdvanceDownload />} />
          <Route path="batch" element={<BatchDownload />} />
          <Route path="playlist" element={<PlaylistDownload />} />
          <Route path="new-videos" element={<NewVideos />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="settings" element={<DownloadSettings />} />
        </Routes>
      </div>
    </div>
  )
}

export default Download