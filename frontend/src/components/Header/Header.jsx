import React, { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../../config";
import { useNavigate } from "react-router-dom";
import { useDownload } from "../../hooks/useDownload";
import {
  Menu,
  Search,
  Mic,
  User,
  Github,
  Linkedin,
  Twitter,
  PiIcon,
  InfoIcon,
  DollarSign,
  X,
  Download,
  Video,
  Music,
  Play,
  Pause,
} from "lucide-react";
import "./Header.css";
import { useAmbience } from "../../hooks/useAmbience";

const Header = ({ toggleSidebar }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAbout, setShowAbout] = useState(false);
  const [showSocials, setShowSocials] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const navigate = useNavigate();
  const { downloads, pendingVideosCount } = useDownload();
  const { activeSounds, playAll, stopAll } = useAmbience();
  const aboutRef = useRef(null);
  const socialsRef = useRef(null);
  const searchResultsRef = useRef(null);
  const searchInputRef = useRef(null);

  // Calculate active downloads
  const activeDownloads = downloads.filter(d => 
    ['downloading', 'starting', 'queued'].includes(d.status)
  );

  // Function to calculate search relevance score
  const calculateRelevanceScore = (video, query, queryWords) => {
    let score = 0;
    const queryLower = query.toLowerCase();
    
    // Check if query appears at the beginning of title (highest priority)
    if (video.title?.toLowerCase().startsWith(queryLower)) {
      score += 100;
    }
    
    // Check for exact phrase match in title
    if (video.title?.toLowerCase().includes(queryLower)) {
      score += 50;
    }
    
    // Check each word individually
    queryWords.forEach(word => {
      if (video.title?.toLowerCase().includes(word)) {
        // More points if word appears earlier in title
        const index = video.title.toLowerCase().indexOf(word);
        score += 30 - (index / 100); // Slight bonus for earlier appearance
        
        // Extra points if the word is at the beginning of a word in title
        const titleWords = video.title.toLowerCase().split(/\s+/);
        if (titleWords.some(titleWord => titleWord.startsWith(word))) {
          score += 20;
        }
      }
      
      // Check in channel name
      if (video.channel?.toLowerCase().includes(word)) {
        score += 10;
      }
      
      // Check in filename
      if (video.filename?.toLowerCase().includes(word)) {
        score += 5;
      }
      
      // Check in tags
      if (video.tags?.some(tag => tag.toLowerCase().includes(word))) {
        score += 8;
      }
    });
    
    return score;
  };

  // Function to search locally with improved relevance
  const searchLocally = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      // Search in videos
      const response = await fetch(`${API_BASE_URL}/api/videos`);
      const data = await response.json();
      
      if (data.success) {
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(word => word.length > 0);
        
        // Filter and score videos
        const videosWithScores = data.videos.map(video => {
          // Convert thumbnail path to full URL
          const fullThumbnail = video.thumbnail?.startsWith("/")
            ? `${API_BASE_URL}${video.thumbnail}`
            : video.thumbnail;
          
          return {
            ...video,
            thumbnail: fullThumbnail,
            relevanceScore: calculateRelevanceScore(video, queryLower, queryWords)
          };
        }).filter(video => video.relevanceScore > 0); // Only include videos with some relevance
        
        // Sort by relevance score (highest first)
        videosWithScores.sort((a, b) => b.relevanceScore - a.relevanceScore);
        
        setSearchResults(videosWithScores.slice(0, 10)); // Top 10 results
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error("Error searching videos:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setShowSearchResults(false);
      return;
    }

    // Check if query starts with "??"
    if (searchQuery.startsWith("??")) {
      // Extract the search term (remove "??")
      const youtubeQuery = searchQuery.substring(2).trim();
      if (youtubeQuery) {
        const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeQuery)}`;
        window.open(ytUrl, "_blank");
      }
      setSearchQuery("");
      setShowSearchResults(false);
      return;
    }

    // Local search - if we have results, select the first one
    if (searchResults.length > 0) {
      handleSelectResult(searchResults[0]);
    } else {
      // If no results, just close the dropdown
      setShowSearchResults(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // If query starts with "??", don't show local results
    if (value.startsWith("??")) {
      setShowSearchResults(false);
      return;
    }
    
    // Debounced search
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    
    searchTimerRef.current = setTimeout(() => {
      searchLocally(value);
    }, 300); // 300ms delay
  };

  const searchTimerRef = useRef(null);

  const handleClearSearch = () => {
    setSearchQuery("");
    setShowSearchResults(false);
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleSelectResult = (video) => {
    setSearchQuery("");
    setShowSearchResults(false);
    navigate(`/watch/${encodeURIComponent(video.id)}`);
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (aboutRef.current && !aboutRef.current.contains(event.target)) {
        setShowAbout(false);
      }
      if (socialsRef.current && !socialsRef.current.contains(event.target)) {
        setShowSocials(false);
      }
      if (searchResultsRef.current && !searchResultsRef.current.contains(event.target) && 
          searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement.tagName.toLowerCase();

      // If user is already typing somewhere → ignore
      if (tag === "input" || tag === "textarea") return;

      // "/" key - focus search
      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Ctrl + K
      if (e.ctrlKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Escape key - clear search and close results
      if (e.key === "Escape") {
        if (showSearchResults) {
          setShowSearchResults(false);
        } else if (searchQuery) {
          handleClearSearch();
        }
      }

      // Arrow down - navigate search results
      if (e.key === "ArrowDown" && showSearchResults && searchResults.length > 0) {
        e.preventDefault();
        const firstResult = document.querySelector('.search-result-item');
        if (firstResult) {
          firstResult.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showSearchResults, searchQuery, searchResults.length]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  const toggleAbout = () => {
    setShowAbout(!showAbout);
    if (!showAbout) {
      setShowSocials(false);
      setShowSearchResults(false);
    }
  };

  const toggleSocials = () => {
    setShowSocials(!showSocials);
    if (!showSocials) {
      setShowAbout(false);
      setShowSearchResults(false);
    }
  };

  // Handle keyboard navigation in search results
  const handleResultKeyDown = (e, video, index) => {
    if (e.key === 'Enter') {
      handleSelectResult(video);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextResult = document.querySelectorAll('.search-result-item')[index + 1];
      if (nextResult) {
        nextResult.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index === 0) {
        searchInputRef.current?.focus();
      } else {
        const prevResult = document.querySelectorAll('.search-result-item')[index - 1];
        if (prevResult) {
          prevResult.focus();
        }
      }
    }
  };

  return (
    <header className="header">
      <div className="header__left">
        <button className="header__menu-btn" onClick={toggleSidebar}>
          ☰
        </button>

        <a href="/" className="header__logo">
          <div className="logo">
            <img src="/YT_Logo.svg" alt="YouTube Logo" className="logo__icon" />
          </div>
          <h1 className="logo__text">Dr . PDEA</h1>
        </a>
      </div>

      <div className="header__center">
        <form className="header__search-form" onSubmit={handleSearch}>
          <div className="search__container" ref={searchResultsRef}>
            <div className="search-input-wrapper">
              <input
                ref={searchInputRef}
                type="text"
                className="search__input"
                placeholder="Search local videos or type ?? to search YouTube"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (searchQuery && !searchQuery.startsWith("??")) {
                    searchLocally(searchQuery);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' && showSearchResults && searchResults.length > 0) {
                    e.preventDefault();
                    const firstResult = document.querySelector('.search-result-item');
                    if (firstResult) {
                      firstResult.focus();
                    }
                  }
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search__clear-btn"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button type="submit" className="search__button">
              <Search size={20} />
            </button>

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="search-results">
                <div className="search-results__header">
                  <span>Local Videos</span>
                  <span className="search-results__count">
                    {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
                  </span>
                </div>
                <div className="search-results__list">
                  {searchResults.map((video, index) => (
                    <div
                      key={video.id}
                      className="search-result-item"
                      onClick={() => handleSelectResult(video)}
                      onKeyDown={(e) => handleResultKeyDown(e, video, index)}
                      tabIndex={0}
                      role="button"
                    >
                      <div className="search-result__thumbnail">
                        {video.thumbnail ? (
                          <img 
                            src={video.thumbnail} 
                            alt={video.title} 
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://via.placeholder.com/120x68/333/fff?text=${encodeURIComponent(video.title.substring(0, 10))}`;
                            }}
                          />
                        ) : (
                          <div className="thumbnail-placeholder">
                            {video.title?.substring(0, 10)}
                          </div>
                        )}
                      </div>
                      <div className="search-result__info">
                        <div className="search-result__title">
                          {video.title}
                        </div>
                        <div className="search-result__channel">
                          {video.channel}
                        </div>
                        <div className="search-result__meta">
                          <span className="search-result__duration">
                            {video.duration}
                          </span>
                          {video.relevanceScore > 0 && (
                            <span className="search-result__relevance">
                              {video.relevanceScore > 50 ? "🔥" : "✓"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showSearchResults && isSearching && (
              <div className="search-results">
                <div className="search-loading">
                  <div className="search-spinner"></div>
                  <span>Searching...</span>
                </div>
              </div>
            )}

            {showSearchResults && searchQuery && searchResults.length === 0 && !isSearching && (
              <div className="search-results">
                <div className="search-no-results">
                  <span>No local videos found for "{searchQuery}"</span>
                  {!searchQuery.startsWith("??") && (
                    <div className="search-youtube-hint">
                      Press Enter to search on YouTube with "??{searchQuery}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>
        <button className="header__mic-btn">
          <Mic size={20} />
        </button>
      </div>

      <div className="header__right">
        {/* New Videos Indicator */}
        {pendingVideosCount > 0 && (
          <div 
            className="header__new-videos-indicator" 
            onClick={() => navigate('/download/new-videos')}
            title={`${pendingVideosCount} new video${pendingVideosCount > 1 ? 's' : ''} available`}
          >
            <Video size={20} />
            <span className="new-videos-count">{pendingVideosCount}</span>
          </div>
        )}

        {/* Download Indicator */}
        {activeDownloads.length > 0 && (
          <div 
            className="header__download-indicator" 
            onClick={() => navigate('/download/progress')}
            title={`${activeDownloads.length} download${activeDownloads.length > 1 ? 's' : ''} in progress`}
          >
            <Download size={20} className="download-icon-pulse" />
            <span className="download-count">{activeDownloads.length}</span>
          </div>
        )}

        {/* Ambience Toggle */}
        {activeSounds.length > 0 && (
          <div 
            className={`header__ambience-toggle ${!activeSounds.some(s => s.isPlaying) ? 'paused' : ''}`}
            onClick={() => {
              if (activeSounds.some(s => s.isPlaying)) {
                stopAll();
              } else {
                playAll();
              }
            }}
            title={activeSounds.some(s => s.isPlaying) ? "Pause Ambience" : "Play Ambience"}
          >
            {activeSounds.some(s => s.isPlaying) ? <Pause size={18} /> : <Play size={18} />}
            <span className="ambience-label">Ambience</span>
          </div>
        )}

        <div ref={aboutRef} className="header__icon-btn" onClick={toggleAbout}>
          <User size={22} />
          {showAbout && (
            <div className="about-tooltip">
              <img
                src="/Creator.jpg"
                alt="Meet Profile"
                className="profile-pic"
              />
              <h3>About Me</h3>
              <p>I Am A Creator</p>
              <p>Enjoyyyyyyyyyyyyyyyyyy</p>
            </div>
          )}
        </div>

        <a
          href="https://github.com/Babar-Meet"
          target="_blank"
          className="header__icon-btn"
        >
          <Github size={22} />
        </a>
        <a
          href="https://buymeacoffee.com/babariyameet"
          target="_blank"
          className="header__icon-btn"
        >
          <DollarSign size={22} />
        </a>
        <a href="#" className="header__icon-btn">
          <Linkedin size={22} />
        </a>
        <a href="#" className="header__icon-btn">
          <Twitter size={22} />
        </a>

        <div
          ref={socialsRef}
          className="header__icon-btn"
          onClick={toggleSocials}
        >
          <InfoIcon size={22} />
          {showSocials && (
            <div className="about-tooltip">
              <h3>
                <PiIcon size={18} /> Socials / Support
              </h3>
              <ul>
                <li>
                  Instagram:{" "}
                  <a
                    href="https://www.instagram.com/babar_meet"
                    target="_blank"
                  >
                    @babar_meet
                  </a>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;