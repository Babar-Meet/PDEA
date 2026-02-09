import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDownloads, fetchSettings } from '../../store/slices/downloadSlice';

/**
 * Polls download status in the background, ensuring downloads continue
 * even when navigating between pages. Uses aggressive polling (2s) when
 * active downloads are detected, and safety polling (10s) otherwise to
 * catch any downloads that might be running on the server but not yet
 * reflected in the Redux state.
 */
const DownloadPoller = () => {
  const dispatch = useDispatch();
  const downloads = useSelector((state) => state.download.downloads);
  const activePollIntervalRef = useRef(null);
  const safetyPollIntervalRef = useRef(null);

  const hasActive = downloads.some((d) =>
    ['downloading', 'starting', 'queued'].includes(d.status)
  );

  // Active polling: Poll every 2 seconds when there are active downloads
  useEffect(() => {
    if (hasActive && !activePollIntervalRef.current) {
      // Start aggressive polling
      activePollIntervalRef.current = setInterval(() => {
        dispatch(fetchDownloads());
      }, 2000);
    } else if (!hasActive && activePollIntervalRef.current) {
      // Stop aggressive polling when no active downloads
      clearInterval(activePollIntervalRef.current);
      activePollIntervalRef.current = null;
    }
  }, [hasActive, dispatch]);

  // Safety polling: Always poll every 10 seconds to catch any "lost" downloads
  // This ensures that if a download is running on the server but the Redux state
  // somehow lost track of it (e.g., during page navigation), we'll pick it up
  useEffect(() => {
    safetyPollIntervalRef.current = setInterval(() => {
      dispatch(fetchDownloads());
    }, 10000);

    return () => {
      if (safetyPollIntervalRef.current) {
        clearInterval(safetyPollIntervalRef.current);
      }
    };
  }, [dispatch]);

  // Initial fetch on mount
  useEffect(() => {
    dispatch(fetchDownloads());
    dispatch(fetchSettings());

    return () => {
      if (activePollIntervalRef.current) {
        clearInterval(activePollIntervalRef.current);
      }
    };
  }, [dispatch]);

  return null;
};

export default DownloadPoller;
