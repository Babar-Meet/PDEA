import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDownloads, fetchSettings, updateDownloadProgress, fetchPendingVideosCount } from '../../store/slices/downloadSlice';
import { API_BASE_URL } from '../../config';

const DownloadPoller = () => {
  const dispatch = useDispatch();
  const downloads = useSelector((state) => state.download.downloads);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws/downloads';
    
    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'progress' && data.downloadId) {
            dispatch(updateDownloadProgress({
              downloadId: data.downloadId,
              progress: data.progress,
              speed: data.speed,
              eta: data.eta,
              status: data.status,
              filename: data.filename,
              error: data.error
            }));
          }
          
          if (data.type === 'pending_videos_updated') {
            dispatch(fetchPendingVideosCount());
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
        wsRef.current = null;
        
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect WebSocket...');
          connectWebSocket();
        }, 3000);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    }
  }, [dispatch]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  useEffect(() => {
    dispatch(fetchDownloads());
    dispatch(fetchSettings());
    dispatch(fetchPendingVideosCount());

    const safetyInterval = setInterval(() => {
      dispatch(fetchDownloads());
    }, 30000);

    return () => {
      clearInterval(safetyInterval);
    };
  }, [dispatch]);

  return null;
};

export default DownloadPoller;
