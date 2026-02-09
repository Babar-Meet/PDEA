import React, { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "./config";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import AmbienceSync from "./components/AmbienceSync/AmbienceSync";
import DownloadPoller from "./components/DownloadPoller/DownloadPoller";
import Header from "./components/Header/Header";
import Sidebar from "./components/Sidebar/Sidebar";
import Home from "./pages/Home/Home";
import Watch from "./pages/Watch/Watch";
import CategoryPage from "./pages/CategoryPage/CategoryPage";
import VideoplayerSettings from "./components/VideoplayerSettings/VideoplayerSettings";
import Trash from "./pages/Trash/Trash";
import Download from "./pages/Download/Download";
import Ambience from "./components/Ambience/Ambience";
import ThumbnailGenerator from "./components/ThumbnailGenerator/ThumbnailGenerator";
import "./App.css";

function App() {
  const [sidebarSize, setSidebarSize] = useState("large");
  const [videos, setVideos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [thumbnailsNeeded, setThumbnailsNeeded] = useState(0);
  const [showThumbnailGenerator, setShowThumbnailGenerator] = useState(false);
  const [hasSkipped, setHasSkipped] = useState(false);

  const fetchVideos = async (skipThumbnailGeneration = false) => {
    try {
      setLoading(true);
      const url = skipThumbnailGeneration 
        ? `${API_BASE_URL}/api/videos?skipThumbnailGeneration=true`
        : `${API_BASE_URL}/api/videos`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        // Process videos with full URLs for thumbnails and streaming
        const videosWithFullUrls = data.videos.map((video) => ({
          ...video,
          url:
            video.url ||
            `/api/videos/stream/${encodeURIComponent(video.relativePath || video.id)}`,
          thumbnail: video.thumbnail.startsWith("/")
            ? `${API_BASE_URL}${video.thumbnail}?t=${Date.now()}`
            : video.thumbnail,
        }));

        setVideos(videosWithFullUrls);
        setCategories(data.categories || []);
        setThumbnailsNeeded(data.thumbnailsNeeded || 0);
        
        // Show thumbnail generator if thumbnails are needed and user hasn't skipped
        if (data.thumbnailsNeeded > 0 && !hasSkipped && !skipThumbnailGeneration) {
          setShowThumbnailGenerator(true);
        }
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipThumbnailGeneration = () => {
    setHasSkipped(true);
    setShowThumbnailGenerator(false);
    // Re-fetch with skip parameter
    fetchVideos(true);
  };

  const handleCloseThumbnailGenerator = () => {
    setShowThumbnailGenerator(false);
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const toggleSidebar = () => {
    if (sidebarSize === "large") setSidebarSize("small");
    else if (sidebarSize === "small") setSidebarSize("hidden");
    else setSidebarSize("large");
  };

  return (
    <>
      <AmbienceSync />
      <DownloadPoller />
      <Router>
        <AppContent 
              sidebarSize={sidebarSize} 
              setSidebarSize={setSidebarSize}
              toggleSidebar={toggleSidebar}
              videos={videos}
              categories={categories}
              loading={loading}
              fetchVideos={fetchVideos}
              thumbnailsNeeded={thumbnailsNeeded}
              showThumbnailGenerator={showThumbnailGenerator}
              handleSkipThumbnailGeneration={handleSkipThumbnailGeneration}
            />
      </Router>
    </>
  );
}

function AppContent({ 
  sidebarSize, 
  setSidebarSize, 
  toggleSidebar, 
  videos, 
  categories, 
  loading, 
  fetchVideos, 
  thumbnailsNeeded, 
  showThumbnailGenerator,
  handleSkipThumbnailGeneration
}) {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    // If entering a watch page, hide sidebar
    if (location.pathname.startsWith('/watch/') && !prevPathRef.current.startsWith('/watch/')) {
      setSidebarSize("hidden");
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname, setSidebarSize]);

  return (
    <div className="app">
      <Header toggleSidebar={toggleSidebar} />
      <div className="app__main">
        <Sidebar
          size={sidebarSize}
          categories={categories}
          videos={videos}
        />
        <div
          className={`app__content ${sidebarSize === "large" ? "sidebar-open" : ""}`}
        >
          {showThumbnailGenerator && (
            <ThumbnailGenerator
              onSkip={handleSkipThumbnailGeneration}
              thumbnailsNeeded={thumbnailsNeeded}
            />
          )}
          
          <Routes>
            <Route
              path="/"
              element={
                <Home
                  videos={videos}
                  categories={categories}
                  loading={loading}
                  fetchVideos={fetchVideos}
                  thumbnailsNeeded={thumbnailsNeeded}
                  showThumbnailGenerator={showThumbnailGenerator}
                />
              }
            />
            <Route
              path="/watch/:id"
              element={<Watch videos={videos} fetchVideos={fetchVideos} />}
            />
            <Route
              path="/VideoplayerSettings"
              element={<VideoplayerSettings />}
            />
            <Route
              path="/category/:categoryPath?"
              element={
                <CategoryPage
                  videos={videos}
                  categories={categories}
                  fetchVideos={fetchVideos}
                />
              }
            />
            <Route
              path="/trash"
              element={<Trash fetchVideos={fetchVideos} />}
            />
            <Route
              path="/download/*"
              element={<Download />}
            />
            <Route
              path="/ambience"
              element={<Ambience />}
            />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default App;