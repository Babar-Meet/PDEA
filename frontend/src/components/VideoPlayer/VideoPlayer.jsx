import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { API_BASE_URL } from '../../config'
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight,
  Settings,
  Clock,
  SkipForward,
  SkipBack,
  Repeat,
  Repeat1,
  Check,
  RotateCcw,
  X,
  Monitor
} from 'lucide-react'
import { useVideoPlayerSettings } from '../../hooks/useVideoPlayerSettings'
import './VideoPlayer.css'

const SPEED_OPTIONS = [3, 2.5, 2, 1.75, 1.5, 1.25, 1, 0.75, 0.5, 0.25, 0.01]

const VideoPlayer = forwardRef(({ video, videos, onNextVideo, onPreviousVideo, cinemaMode, onToggleCinemaMode }, ref) => {
  const { settings } = useVideoPlayerSettings()
  
  const videoRef = useRef(null)
  
  useImperativeHandle(ref, () => ({
    captureFrame: () => {
      if (!videoRef.current) return null;
      
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      return canvas.toDataURL('image/jpeg', 0.9);
    }
  }));

  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [playbackRate, setPlaybackRate] = useState(1)
  
  const [videoQuality, setVideoQuality] = useState(null)
  
  // NEW: Loop and auto-play states
  const [loopSingle, setLoopSingle] = useState(settings.loopSingle)
  const [showLoopAnimation, setShowLoopAnimation] = useState(false)
  const [isAutoPlayingNext, setIsAutoPlayingNext] = useState(false)
  
  // Refs for spacebar hold functionality
  const spacebarHoldTimerRef = useRef(null)
  const spacebarPressedRef = useRef(false)
  const originalPlaybackRateRef = useRef(1)
  const isTempSpeedActiveRef = useRef(false)
  const controlsTimeoutRef = useRef(null)
  
  // Animation states
  const [showPlayPauseAnimation, setShowPlayPauseAnimation] = useState(false)
  const [leftSkipAnimation, setLeftSkipAnimation] = useState({
    show: false,
    amount: 0,
    key: 0,
    type: 'skip' // 'skip' or 'video'
  })
  const [rightSkipAnimation, setRightSkipAnimation] = useState({
    show: false,
    amount: 0,
    key: 0,
    type: 'skip' // 'skip' or 'video'
  })
  
  const [showSpeedIndicator, setShowSpeedIndicator] = useState(false)
  const [speedIndicatorValue, setSpeedIndicatorValue] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  
  // Resume state
  const [showResumePopup, setShowResumePopup] = useState(false)
  const [resumeTimestamp, setResumeTimestamp] = useState(0)
  const [resumeCountdown, setResumeCountdown] = useState(5)
  const lastSavedTimeRef = useRef(0)
  const resumeTimerRef = useRef(null)
  
  // Tooltip state
  const [showSpacebarTooltip, setShowSpacebarTooltip] = useState(true)
  
  // Animation timeouts
  const animationTimeoutRef = useRef(null)
  const leftSkipTimeoutRef = useRef(null)
  const rightSkipTimeoutRef = useRef(null)
  const speedIndicatorTimeoutRef = useRef(null)
  const tooltipTimeoutRef = useRef(null)
  
  // Mouse/touch handling
  const videoContainerRef = useRef(null)
  const lastClickTimeRef = useRef(0)
  const clickCountRef = useRef(0)
  const clickTimeoutRef = useRef(null)
  const mouseHoldTimerRef = useRef(null)
  const isMouseHoldingRef = useRef(false)

  // Auto-play effect when video changes
  useEffect(() => {
    // Reset video state when video changes
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    
    // Clear any existing animations
    setLeftSkipAnimation(prev => ({ ...prev, show: false }));
    setRightSkipAnimation(prev => ({ ...prev, show: false }));
    setShowPlayPauseAnimation(false);
    setShowLoopAnimation(false);
    
    // Clear animation timeouts
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    if (leftSkipTimeoutRef.current) clearTimeout(leftSkipTimeoutRef.current);
    if (rightSkipTimeoutRef.current) clearTimeout(rightSkipTimeoutRef.current);
    
    // Auto-play the new video after a short delay
    const autoPlayTimer = setTimeout(() => {
      if (videoRef.current && settings.autoPlayNext) {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
          // Show play animation
          setShowPlayPauseAnimation(true);
          setTimeout(() => {
            setShowPlayPauseAnimation(false);
          }, 600);
        }).catch(error => {
          console.log("Auto-play prevented by browser. User interaction required.");
          // Auto-play was prevented, we'll show the play button
          setIsPlaying(false);
        });
      }
    }, 300); // Small delay to ensure video is loaded
    
    return () => {
      clearTimeout(autoPlayTimer);
    };
  }, [video, settings.autoPlayNext]);

  // Clean up animations when video changes
  useEffect(() => {
    // Save progress of previous video before switching
    if (videoRef.current && currentTime > 5 && duration > 0) {
      saveProgress(videoRef.current.currentTime);
    }

    // Clear all animations when video changes
    setLeftSkipAnimation(prev => ({ ...prev, show: false }));
    setRightSkipAnimation(prev => ({ ...prev, show: false }));
    setShowPlayPauseAnimation(false);
    setShowLoopAnimation(false);
    setShowResumePopup(false);
    setResumeCountdown(5);
    
    // Clear animation timeouts
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    if (leftSkipTimeoutRef.current) clearTimeout(leftSkipTimeoutRef.current);
    if (rightSkipTimeoutRef.current) clearTimeout(rightSkipTimeoutRef.current);
    if (resumeTimerRef.current) clearInterval(resumeTimerRef.current);
    
    return () => {
      // Cleanup when component unmounts
      clearAllTimeouts();
      if (resumeTimerRef.current) clearInterval(resumeTimerRef.current);
    };
  }, [video]) // Run when video prop changes

  // Check for saved progress on load
  useEffect(() => {
    const checkSavedProgress = async () => {
      if (!video) return;

      try {
        // Fetch saved progress
        const response = await fetch(`${API_BASE_URL}/api/videos/file/${video.id || video.relativePath}`);
        const data = await response.json();
        
        if (data.success && data.video && data.video.progress > 5) {
          const savedTime = data.video.progress;
          // Only show if saved time is not near the end (let's say 95% or < 30s remaining)
          const isNearEnd = data.video.duration && (savedTime > (data.video.duration - 15)); // Assumption if duration is in seconds
          
          // Since duration might be a string "MM:SS" from backend or undefined initially, 
          // we rely on the client-side check after metadata loaded, OR just trust the saved time if it looks valid
          
          if (!isNearEnd) {
             setResumeTimestamp(savedTime);
             setShowResumePopup(true);
             setIsPlaying(false); // Pause to ask user
             if (videoRef.current) videoRef.current.pause();

             // Start countdown
             let count = 5;
             setResumeCountdown(count);
             if (resumeTimerRef.current) clearInterval(resumeTimerRef.current);
             
             resumeTimerRef.current = setInterval(() => {
               count -= 0.1;
               setResumeCountdown(Math.max(0, count));
               
               if (count <= 0) {
                 clearInterval(resumeTimerRef.current);
                 handleStartOver(); // Timeout -> Start from 0
               }
             }, 100);
          }
        }
      } catch (error) {
        console.error("Error fetching progress:", error);
      }
    };

    checkSavedProgress();
  }, [video.id]);

  const saveProgress = async (time) => {
    if (!video || !time) return;
    try {
      await fetch(`${API_BASE_URL}/api/videos/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId: video.id || video.relativePath,
          timestamp: time
        }),
      });
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  const handleResume = () => {
    if (resumeTimerRef.current) clearInterval(resumeTimerRef.current);
    setShowResumePopup(false);
    if (videoRef.current) {
      videoRef.current.currentTime = resumeTimestamp;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleStartOver = () => {
    if (resumeTimerRef.current) clearInterval(resumeTimerRef.current);
    setShowResumePopup(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };


  useEffect(() => {
    const videoElement = videoRef.current
    
    const handleLoadedMetadata = () => {
      setDuration(videoElement.duration)
      
      // Calculate Quality Label
      const height = videoElement.videoHeight
      if (height) {
        let quality = ''
        if (height >= 12960) quality = '24K'
        else if (height >= 8640) quality = '16K'
        else if (height >= 6480) quality = '12K'
        else if (height >= 4320) quality = '8K'
        else if (height >= 2160) quality = '4K'
        else if (height >= 1440) quality = '1440p'
        else if (height >= 1080) quality = '1080p'
        else if (height >= 720) quality = '720p'
        else if (height >= 480) quality = '480p'
        else if (height >= 360) quality = '360p'
        else quality = `${height}p`
        setVideoQuality(quality)
      }

      // Show tooltip for 10 seconds on first load
      if (showSpacebarTooltip && settings.tempSpeedEnabled) {
        tooltipTimeoutRef.current = setTimeout(() => {
          setShowSpacebarTooltip(false)
        }, 10000)
      }
    }
    
    const handleEnded = () => {
      if (loopSingle) {
        // Loop current video
        videoElement.currentTime = 0
        videoElement.play()
        showLoopAnimationEffect()
      } else if (settings.autoPlayNext && onNextVideo) {
        // Auto-play next video
        setIsAutoPlayingNext(true)
        setTimeout(() => {
          onNextVideo()
          setIsAutoPlayingNext(false)
        }, settings.autoPlayDelay * 1000)
      } else {
        setIsPlaying(false)
      }
    }
    
    // Handle fullscreen change
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata)
    videoElement.addEventListener('ended', handleEnded)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    
    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata)
      videoElement.removeEventListener('ended', handleEnded)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      clearAllTimeouts()
    }
  }, [loopSingle, settings.autoPlayNext, settings.autoPlayDelay, onNextVideo, showSpacebarTooltip, settings.tempSpeedEnabled])

  const clearAllTimeouts = () => {
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
    if (leftSkipTimeoutRef.current) clearTimeout(leftSkipTimeoutRef.current)
    if (rightSkipTimeoutRef.current) clearTimeout(rightSkipTimeoutRef.current)
    if (speedIndicatorTimeoutRef.current) clearTimeout(speedIndicatorTimeoutRef.current)
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current)
    if (spacebarHoldTimerRef.current) clearTimeout(spacebarHoldTimerRef.current)
    if (mouseHoldTimerRef.current) clearTimeout(mouseHoldTimerRef.current)
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
  }

  const showLoopAnimationEffect = () => {
    setShowLoopAnimation(true)
    setTimeout(() => {
      setShowLoopAnimation(false)
    }, 1000)
  }

  // Handle mouse down - start tracking for hold
  const handleMouseDown = (e) => {
    // Only handle left mouse button
    if (e.button !== 0) return
    
    // Don't activate if clicking on controls or resume popup
    if (e.target.closest('.video-player__controls') || 
        e.target.closest('.control-btn') ||
        e.target.closest('.progress-slider') ||
        e.target.closest('.volume-slider') ||
        e.target.closest('.resume-popup') ||
        e.target.tagName === 'INPUT') {
      return
    }
    
    isMouseHoldingRef.current = false
    
    // Start hold timer for temp speed
    if (settings.tempSpeedEnabled) {
      mouseHoldTimerRef.current = setTimeout(() => {
        if (!isMouseHoldingRef.current) {
          isMouseHoldingRef.current = true
          activateTempSpeed('mouse')
        }
      }, settings.tempSpeedHoldDelay)
    }
  }

  // Handle mouse up - determine if it was a click or hold
  const handleMouseUp = (e) => {
    if (e.button !== 0) return
    
    // Don't handle if clicking on controls or resume popup
    if (e.target.closest('.video-player__controls') || 
        e.target.closest('.control-btn') ||
        e.target.closest('.progress-slider') ||
        e.target.closest('.volume-slider') ||
        e.target.closest('.resume-popup') ||
        e.target.tagName === 'INPUT') {
      return
    }
    
    // Clear the hold timer if it hasn't fired yet
    if (mouseHoldTimerRef.current) {
      clearTimeout(mouseHoldTimerRef.current)
      mouseHoldTimerRef.current = null
    }
    
    // If we were holding for temp speed, deactivate it
    if (isMouseHoldingRef.current) {
      deactivateTempSpeed('mouse')
      isMouseHoldingRef.current = false
      return // Don't treat as a click
    }
    
    // It's a click - handle single/double click
    handleClick()
  }

  // Handle click (for play/pause and double click for fullscreen)
  const handleClick = () => {
    const currentTime = Date.now()
    const timeSinceLastClick = currentTime - lastClickTimeRef.current
    
    clickCountRef.current++
    
    if (clickCountRef.current === 1) {
      // First click
      lastClickTimeRef.current = currentTime
      
      // Wait for possible second click
      clickTimeoutRef.current = setTimeout(() => {
        if (clickCountRef.current === 1) {
          // Single click - toggle play/pause
          togglePlay()
        }
        clickCountRef.current = 0
      }, 300)
    } else if (clickCountRef.current === 2 && timeSinceLastClick < 300) {
      // Double click within 300ms - toggle fullscreen
      clearTimeout(clickTimeoutRef.current)
      clickCountRef.current = 0
      toggleFullscreen()
    }
  }

  // Handle double click event directly (as backup)
  const handleDoubleClick = (e) => {
    // Don't handle if clicking on controls or resume popup
    if (e.target.closest('.video-player__controls') || 
        e.target.closest('.control-btn') ||
        e.target.closest('.progress-slider') ||
        e.target.closest('.volume-slider') ||
        e.target.closest('.resume-popup') ||
        e.target.tagName === 'INPUT') {
      return
    }
    
    e.preventDefault()
    e.stopPropagation()
    
    // Clear any pending single click timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
      clickTimeoutRef.current = null
    }
    clickCountRef.current = 0
    
    toggleFullscreen()
  }

  // Mouse leave - cleanup hold timer
  const handleMouseLeave = () => {
    if (mouseHoldTimerRef.current) {
      clearTimeout(mouseHoldTimerRef.current)
      mouseHoldTimerRef.current = null
    }
    
    if (isMouseHoldingRef.current) {
      deactivateTempSpeed('mouse')
      isMouseHoldingRef.current = false
    }
  }

  // Temporary speed functions
  const activateTempSpeed = (source) => {
    if (!videoRef.current || !settings.tempSpeedEnabled) return
    
    // Store original playback rate if we're not already in temp speed mode
    if (!isTempSpeedActiveRef.current) {
      originalPlaybackRateRef.current = videoRef.current.playbackRate
    }
    
    const tempSpeed = settings.tempSpeedAmount
    videoRef.current.playbackRate = tempSpeed
    isTempSpeedActiveRef.current = true
    
    // Show speed indicator for temporary speed
    displaySpeedIndicator(tempSpeed)
    
    // Hide tooltip when temp speed is activated
    if (source === 'mouse') {
      setShowSpacebarTooltip(false)
      if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current)
    }
  }

  const deactivateTempSpeed = (source) => {
    if (!videoRef.current || !isTempSpeedActiveRef.current) return
    
    const originalSpeed = originalPlaybackRateRef.current
    videoRef.current.playbackRate = originalSpeed
    isTempSpeedActiveRef.current = false
    
    // Show original speed indicator
    displaySpeedIndicator(originalSpeed)
  }

  // Keyboard shortcuts with dynamic key bindings
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'
      if (isInput) return

      const key = e.key
      
      // Handle spacebar based on mode
      if (key === ' ' && settings.spacebarMode === 'playpause') {
        e.preventDefault()
        e.stopPropagation()
        
        if (spacebarPressedRef.current) return
        spacebarPressedRef.current = true
        
        if (settings.tempSpeedEnabled) {
          spacebarHoldTimerRef.current = setTimeout(() => {
            if (spacebarPressedRef.current && videoRef.current) {
              activateTempSpeed()
            }
          }, settings.tempSpeedHoldDelay)
        }
        return
      }

      // Map keys to actions
      switch(key.toLowerCase()) {
        case settings.playPauseKey.toLowerCase():
          e.preventDefault()
          togglePlay()
          break
          
        case settings.forwardSkipKey.toLowerCase():
          e.preventDefault()
          handleSkipWithAnimation(settings.forwardSkipAmount, 'right')
          break
          
        case settings.backwardSkipKey.toLowerCase():
          e.preventDefault()
          handleSkipWithAnimation(settings.backwardSkipAmount, 'left')
          break
          
        case settings.muteKey.toLowerCase():
          e.preventDefault()
          toggleMute()
          break
          
        case settings.frameBackKey.toLowerCase():
          e.preventDefault()
          if (videoRef.current) {
            if (isPlaying) {
              videoRef.current.pause()
              setIsPlaying(false)
            }
            previousFrame()
          }
          break
          
        case settings.frameForwardKey.toLowerCase():
          e.preventDefault()
          if (videoRef.current) {
            if (isPlaying) {
              videoRef.current.pause()
              setIsPlaying(false)
            }
            nextFrame()
          }
          break
          
        case settings.speedDownKey.toLowerCase():
          e.preventDefault()
          decreasePlaybackRate()
          break
          
        case settings.speedUpKey.toLowerCase():
          e.preventDefault()
          increasePlaybackRate()
          break
          
        case settings.fullscreenKey.toLowerCase():
          e.preventDefault()
          toggleFullscreen()
          break
          
        // NEW: Next/Previous video shortcuts
        case settings.nextVideoKey.toLowerCase():
          e.preventDefault()
          if (onNextVideo) {
            handleNextVideo()
          }
          break
          
        case settings.prevVideoKey.toLowerCase():
          e.preventDefault()
          if (onPreviousVideo) {
            handlePreviousVideo()
          }
          break
          
        // NEW: Toggle loop shortcut
        case 'l':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            toggleLoop()
          }
          break
      }

      // Handle arrow keys
      if (key === settings.leftArrowKey) {
        e.preventDefault()
        handleSkipWithAnimation(settings.leftArrowSkip, 'left')
      } else if (key === settings.rightArrowKey) {
        e.preventDefault()
        handleSkipWithAnimation(settings.rightArrowSkip, 'right')
      } else if (key === settings.volumeUpKey) {
        e.preventDefault()
        changeVolume(volume + 0.1)
      } else if (key === settings.volumeDownKey) {
        e.preventDefault()
        changeVolume(volume - 0.1)
      }
    }

    const handleKeyUp = (e) => {
      const key = e.key
      
      if (key === ' ' && settings.spacebarMode === 'playpause') {
        e.preventDefault()
        e.stopPropagation()
        
        if (spacebarHoldTimerRef.current) {
          clearTimeout(spacebarHoldTimerRef.current)
          spacebarHoldTimerRef.current = null
        }
        
        if (isTempSpeedActiveRef.current) {
          deactivateTempSpeed()
        } else if (spacebarPressedRef.current) {
          togglePlay()
        }
        
        spacebarPressedRef.current = false
      }
    }

    document.addEventListener('keydown', handleKeyDown, { capture: true })
    document.addEventListener('keyup', handleKeyUp, { capture: true })

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true })
      document.removeEventListener('keyup', handleKeyUp, { capture: true })
      
      if (spacebarHoldTimerRef.current) {
        clearTimeout(spacebarHoldTimerRef.current)
      }
    }
  }, [volume, playbackRate, showControls, isFullscreen, isPlaying, settings, onNextVideo, onPreviousVideo])

  // Auto-hide controls
  useEffect(() => {
    if (!settings.controlsAutoHide) {
      setShowControls(true)
      return
    }

    if (showControls && isPlaying) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, settings.autoHideDelay)
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [showControls, isPlaying, settings.controlsAutoHide, settings.autoHideDelay])

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
      
      // Hide tooltip when user interacts
      setShowSpacebarTooltip(false)
      if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current)
      
      // Show play/pause animation
      setShowPlayPauseAnimation(true)
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
      animationTimeoutRef.current = setTimeout(() => {
        setShowPlayPauseAnimation(false)
      }, 600)
    }
  }

  const toggleLoop = () => {
    setLoopSingle(!loopSingle)
    if (!loopSingle) {
      showLoopAnimationEffect()
    }
  }

  const handleNextVideo = () => {
    if (onNextVideo) {
      // Clear any existing animation immediately
      setRightSkipAnimation(prev => ({ ...prev, show: false }))
      
      // Force a re-render with new animation
      setTimeout(() => {
        setRightSkipAnimation({
          show: true,
          amount: 'Next Video',
          key: Date.now(),
          type: 'video'
        })
        
        // Clear previous timeout
        if (rightSkipTimeoutRef.current) clearTimeout(rightSkipTimeoutRef.current)
        
        // Set new timeout - shorter duration for video change
        rightSkipTimeoutRef.current = setTimeout(() => {
          setRightSkipAnimation(prev => ({ ...prev, show: false }))
        }, 800) // Slightly longer for video change
      }, 10)
      
      // Call the callback immediately
      onNextVideo()
    }
  }

  const handlePreviousVideo = () => {
    if (onPreviousVideo) {
      // Clear any existing animation immediately
      setLeftSkipAnimation(prev => ({ ...prev, show: false }))
      
      // Force a re-render with new animation
      setTimeout(() => {
        setLeftSkipAnimation({
          show: true,
          amount: 'Prev Video',
          key: Date.now(),
          type: 'video'
        })
        
        // Clear previous timeout
        if (leftSkipTimeoutRef.current) clearTimeout(leftSkipTimeoutRef.current)
        
        // Set new timeout - shorter duration for video change
        leftSkipTimeoutRef.current = setTimeout(() => {
          setLeftSkipAnimation(prev => ({ ...prev, show: false }))
        }, 800) // Slightly longer for video change
      }, 10)
      
      // Call the callback immediately
      onPreviousVideo()
    }
  }

  const handleSkipWithAnimation = (seconds, side) => {
    skip(seconds)
    
    if (side === 'left') {
      // Clear any existing animation
      setLeftSkipAnimation(prev => ({ ...prev, show: false }))
      
      // Force re-render with setTimeout
      setTimeout(() => {
        setLeftSkipAnimation({
          show: true,
          amount: seconds,
          key: Date.now(),
          type: 'skip'
        })
      }, 10)
      
      // Clear previous timeout
      if (leftSkipTimeoutRef.current) clearTimeout(leftSkipTimeoutRef.current)
      leftSkipTimeoutRef.current = setTimeout(() => {
        setLeftSkipAnimation(prev => ({ ...prev, show: false }))
      }, 600)
      
    } else if (side === 'right') {
      // Clear any existing animation
      setRightSkipAnimation(prev => ({ ...prev, show: false }))
      
      // Force re-render with setTimeout
      setTimeout(() => {
        setRightSkipAnimation({
          show: true,
          amount: seconds,
          key: Date.now(),
          type: 'skip'
        })
      }, 10)
      
      // Clear previous timeout
      if (rightSkipTimeoutRef.current) clearTimeout(rightSkipTimeoutRef.current)
      rightSkipTimeoutRef.current = setTimeout(() => {
        setRightSkipAnimation(prev => ({ ...prev, show: false }))
      }, 600)
    }
  }

  const handleTimeUpdate = () => {
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    
    // Save progress logic (every 5 seconds)
    if (Math.abs(time - lastSavedTimeRef.current) > 5) {
      saveProgress(time);
      lastSavedTimeRef.current = time;
    }
  }

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value)
    setCurrentTime(newTime)
    if (videoRef.current) {
      videoRef.current.currentTime = newTime
    }
  }

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
      videoRef.current.muted = newVolume === 0
    }
  }

  const changeVolume = (newVolume) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume))
    setVolume(clampedVolume)
    setIsMuted(clampedVolume === 0)
    if (videoRef.current) {
      videoRef.current.volume = clampedVolume
      videoRef.current.muted = clampedVolume === 0
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
      if (!isMuted) {
        setVolume(0)
      } else {
        setVolume(1)
      }
    }
  }

  const toggleFullscreen = () => {
    const elem = videoContainerRef.current
    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen()
        setIsFullscreen(true)
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }

  const skip = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds
    }
  }

  // Frame-by-frame navigation with dynamic step
  const previousFrame = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - settings.frameStepSeconds)
    }
  }

  const nextFrame = () => {
    if (videoRef.current) {
      videoRef.current.currentTime += settings.frameStepSeconds
    }
  }

  // Playback rate controls with dynamic settings
  const decreasePlaybackRate = () => {
    const newRate = Math.max(settings.minSpeed, playbackRate - settings.normalSpeedIncrement)
    setPlaybackRate(newRate)
    if (videoRef.current && !isTempSpeedActiveRef.current) {
      videoRef.current.playbackRate = newRate
    }
    displaySpeedIndicator(newRate)
  }

  const increasePlaybackRate = () => {
    const newRate = Math.min(settings.maxSpeed, playbackRate + settings.normalSpeedIncrement)
    setPlaybackRate(newRate)
    if (videoRef.current && !isTempSpeedActiveRef.current) {
      videoRef.current.playbackRate = newRate
    }
    displaySpeedIndicator(newRate)
  }

  const handleSpeedSelect = (speed) => {
    setPlaybackRate(speed)
    if (videoRef.current) {
      videoRef.current.playbackRate = speed
    }
    displaySpeedIndicator(speed)
    setShowSpeedMenu(false)
  }

  // Display speed indicator
  const displaySpeedIndicator = (speed) => {
    setSpeedIndicatorValue(speed)
    setShowSpeedIndicator(true)
    
    if (speedIndicatorTimeoutRef.current) clearTimeout(speedIndicatorTimeoutRef.current)
    speedIndicatorTimeoutRef.current = setTimeout(() => {
      setShowSpeedIndicator(false)
    }, 2000)
  }

  const handleMouseMove = () => {
    if (!settings.controlsAutoHide) return
    
    setShowControls(true)
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, settings.autoHideDelay)
    }
  }

  // Format time function
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div 
      ref={videoContainerRef}
      className={`video-player ${cinemaMode ? 'cinema-mode' : ''} ${isFullscreen ? 'fullscreen' : ''} ${!isPlaying ? 'paused' : ''} ${showControls ? 'show-controls' : ''}`} 
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
    >
      <video
        ref={videoRef}
        className="video-player__element"
        src={`${API_BASE_URL}/api/videos/stream/${encodeURIComponent(video.relativePath || video.id)}`}
        onTimeUpdate={handleTimeUpdate}
        loop={loopSingle}
        crossOrigin="anonymous"
      />
      
      {/* Play/Pause Animation Overlay - Center */}
      <div className={`animation-overlay center-animation ${showPlayPauseAnimation ? 'active' : ''}`}>
        <div className="animation-icon">
          {isPlaying ? (
            <div className="pause-icon-animation">
              <div className="pause-bar left"></div>
              <div className="pause-bar right"></div>
            </div>
          ) : (
            <div className="play-icon-animation">
              <div className="play-triangle"></div>
            </div>
          )}
        </div>
      </div>

      {/* Loop Animation Overlay */}
      <div className={`animation-overlay center-animation ${showLoopAnimation ? 'active' : ''}`}>
        <div className="animation-icon">
          <div className="loop-icon-animation">
            <Repeat1 size={40} />
          </div>
        </div>
      </div>

      {/* Left Skip Animation Overlay */}
      <div 
        key={`left-${leftSkipAnimation.key}`}
        className={`animation-overlay left-animation ${leftSkipAnimation.show ? 'active' : ''}`}
      >
        <div className="skip-animation-content">
          <div className="skip-icon">
            <ChevronLeft size={36} />
          </div>
          <div className="skip-time">
            {leftSkipAnimation.type === 'skip' 
              ? `${leftSkipAnimation.amount < 0 ? '' : '-'}${Math.abs(leftSkipAnimation.amount)}s`
              : leftSkipAnimation.amount}
          </div>
        </div>
      </div>

      {/* Right Skip Animation Overlay */}
      <div 
        key={`right-${rightSkipAnimation.key}`}
        className={`animation-overlay right-animation ${rightSkipAnimation.show ? 'active' : ''}`}
      >
        <div className="skip-animation-content">
          <div className="skip-icon">
            <ChevronRight size={36} />
          </div>
          <div className="skip-time">
            {rightSkipAnimation.type === 'skip' 
              ? `${rightSkipAnimation.amount}s`
              : rightSkipAnimation.amount}
          </div>
        </div>
      </div>

      {/* Resume Popup */}
      {showResumePopup && (
        <div className="resume-popup">
          <div className="resume-header">
            <div>
              <div className="resume-title">Resume Playing?</div>
              <div className="resume-subtitle">You left off at {formatTime(resumeTimestamp)}</div>
            </div>
            <button className="resume-close" onClick={handleStartOver}>
              <X size={16} />
            </button>
          </div>
          
          <div className="resume-actions">
            <button className="resume-btn primary" onClick={handleResume}>
              <Play size={16} fill="black" /> Resume
            </button>
            <button className="resume-btn secondary" onClick={handleStartOver}>
              <RotateCcw size={16} /> Start Over
            </button>
          </div>
          
          <div className="resume-timeout-bar" style={{ width: `${(resumeCountdown / 5) * 100}%` }}></div>
        </div>
      )}

      {/* Speed Indicator Overlay */}
      <div className={`animation-overlay speed-indicator ${showSpeedIndicator ? 'active' : ''}`}>
        <div className="speed-indicator-content">
          <div className="speed-value">
            {speedIndicatorValue.toFixed(1)}x
          </div>
          <div className="speed-label">
            {isTempSpeedActiveRef.current ? "Temporary Speed" : "Playback Speed"}
          </div>
        </div>
      </div>

      {/* Spacebar Tooltip */}
      {showSpacebarTooltip && settings.tempSpeedEnabled && !isPlaying && (
        <div className="spacebar-tooltip">
          <div className="tooltip-icon">
            <Clock size={16} />
          </div>
          <div className="tooltip-content">
            <div className="tooltip-title">Shortcuts Available</div>
            <div className="tooltip-text">
              • Press and hold <span className="key-highlight">Spacebar</span> or <span className="key-highlight">Mouse</span> for {settings.tempSpeedAmount}x speed
              <br />
              • <span className="key-highlight">Double click</span> to toggle fullscreen
              <br />
              • <span className="key-highlight">{settings.prevVideoKey.toUpperCase()}</span>/<span className="key-highlight">{settings.nextVideoKey.toUpperCase()}</span> for previous/next video
            </div>
          </div>
          <button 
            className="tooltip-close"
            onClick={() => {
              setShowSpacebarTooltip(false)
              if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current)
            }}
          >
            ×
          </button>
        </div>
      )}
      
      <div className={`video-player__controls ${showControls ? 'visible' : ''}`}>
        <div className="video-player__progress">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="progress-slider"
            style={{ '--progress': `${progress}%` }}
          />
        </div>

        <div className="video-player__controls-bottom">
          <div className="video-player__left-controls">
            <button className="control-btn" onClick={togglePlay}>
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            
            {settings.showSkipButtons && (
              <>
                <button className="control-btn" onClick={() => handleSkipWithAnimation(settings.backwardSkipAmount, 'left')}>
                  <ChevronLeft size={20} />
                </button>
                
                <button className="control-btn" onClick={() => handleSkipWithAnimation(settings.forwardSkipAmount, 'right')}>
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            {/* NEW: Previous/Next Video Buttons */}
            {settings.showPlaylistControls && onPreviousVideo && (
              <button className="control-btn" onClick={handlePreviousVideo}>
                <SkipBack size={20} />
              </button>
            )}
            
            {settings.showPlaylistControls && onNextVideo && (
              <button className="control-btn" onClick={handleNextVideo}>
                <SkipForward size={20} />
              </button>
            )}

            <div className="volume-control">
              <button className="control-btn" onClick={toggleMute}>
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              {settings.showVolumeSlider && (
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="volume-slider"
                />
              )}
            </div>

            {/* NEW: Loop Button */}
            <button 
              className={`control-btn ${loopSingle ? 'active' : ''}`} 
              onClick={toggleLoop}
              title={`Loop: ${loopSingle ? 'ON' : 'OFF'}`}
            >
              {loopSingle ? <Repeat1 size={20} /> : <Repeat size={20} />}
            </button>

            {settings.showTimeDisplay && (
              <div className="time-display">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            )}
          </div>

          <div className="video-player__right-controls">
            <div className="speed-control-container">
              {showSpeedMenu && (
                <div className="speed-menu">
                  {SPEED_OPTIONS.map((speed) => (
                    <button
                      key={speed}
                      className={`speed-menu-item ${playbackRate === speed ? 'active' : ''}`}
                      onClick={() => handleSpeedSelect(speed)}
                    >
                      {playbackRate === speed && <Check size={14} />}
                      <span style={{ marginLeft: playbackRate === speed ? 0 : '22px' }}>
                        {speed === 1 ? 'Normal' : `${speed}x`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <button 
                className="speed-display-btn"
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                title="Playback Speed"
              >
                <div className="current-speed-display">
                  {playbackRate === 1 ? '1.0x' : `${playbackRate}x`}
                </div>
              </button>
            </div>

            {/* Quality Display */}
            {videoQuality && (
              <div className="quality-display">
                {videoQuality}
              </div>
            )}
            
            {onToggleCinemaMode && (
              <button 
                className={`control-btn ${cinemaMode ? 'active' : ''}`} 
                onClick={onToggleCinemaMode}
                title="Cinema Mode (t)"
              >
                <Monitor size={20} />
              </button>
            )}
            
            <button className="control-btn" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

export default VideoPlayer