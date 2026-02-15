import { useDispatch, useSelector } from 'react-redux';
import {
  fetchDownloads as fetchDownloadsThunk,
  fetchSettings as fetchSettingsThunk,
  updateSettings as updateSettingsThunk,
  startDownload as startDownloadThunk,
  startDirectDownload as startDirectDownloadThunk,
  cancelDownload as cancelDownloadThunk,
  pauseDownload as pauseDownloadThunk,
  resumeDownload as resumeDownloadThunk,
  pauseAllDownloads as pauseAllDownloadsThunk,
  resumeAllDownloads as resumeAllDownloadsThunk,
  fetchPausedCount as fetchPausedCountThunk,
  fetchPausedDownloads as fetchPausedDownloadsThunk,
  retryDownload as retryDownloadThunk,
  removeDownload as removeDownloadThunk,
  cleanupOrphanedFiles as cleanupOrphanedFilesThunk,
  setSimpleVideoData as setSimpleVideoDataAction,
  setDirectVideoData as setDirectVideoDataAction,
  clearVideoData as clearVideoDataAction,
  clearCleanupMessage as clearCleanupMessageAction,
} from '../store/slices/downloadSlice';

export const useDownload = () => {
  const dispatch = useDispatch();
  const downloads = useSelector((state) => state.download.downloads);
  const settings = useSelector((state) => state.download.settings);
  const simpleVideoData = useSelector((state) => state.download.simpleVideoData);
  const directVideoData = useSelector((state) => state.download.directVideoData);
  const cleanupMessage = useSelector((state) => state.download.cleanupMessage);
  const pausedCount = useSelector((state) => state.download.pausedCount);
  const pausedDownloads = useSelector((state) => state.download.pausedDownloads);
  const pendingVideosCount = useSelector((state) => state.download.pendingVideosCount);

  const startDirectDownload = async (payload) => {
    try {
      const result = await dispatch(
        startDirectDownloadThunk(payload)
      ).unwrap();
      return { success: true, downloadId: result.downloadId };
    } catch (error) {
      return { success: false, error };
    }
  };

  const startDownload = async (url, format_id, save_dir, metadata = {}) => {
    try {
      const result = await dispatch(
        startDownloadThunk({ url, format_id, save_dir, metadata })
      ).unwrap();
      return { success: true, downloadId: result.downloadId };
    } catch (error) {
      return { success: false, error };
    }
  };

  const cancelDownload = async (id) => {
    try {
      await dispatch(cancelDownloadThunk(id)).unwrap();
      return true;
    } catch {
      return false;
    }
  };

  const pauseDownload = async (id) => {
    try {
      await dispatch(pauseDownloadThunk(id)).unwrap();
      return true;
    } catch {
      return false;
    }
  };

  const resumeDownload = async (id) => {
    try {
      await dispatch(resumeDownloadThunk(id)).unwrap();
      return true;
    } catch {
      return false;
    }
  };

  const pauseAllDownloads = async () => {
    try {
      await dispatch(pauseAllDownloadsThunk()).unwrap();
      return true;
    } catch {
      return false;
    }
  };

  const resumeAllDownloads = async () => {
    try {
      await dispatch(resumeAllDownloadsThunk()).unwrap();
      return true;
    } catch {
      return false;
    }
  };

  const fetchPausedCount = async () => {
    try {
      await dispatch(fetchPausedCountThunk()).unwrap();
      return true;
    } catch {
      return false;
    }
  };

  const fetchPausedDownloads = async () => {
    try {
      await dispatch(fetchPausedDownloadsThunk()).unwrap();
      return true;
    } catch {
      return false;
    }
  };

  const retryDownload = async (id) => {
    try {
      await dispatch(retryDownloadThunk(id)).unwrap();
      return true;
    } catch {
      return false;
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      await dispatch(updateSettingsThunk(newSettings)).unwrap();
      return true;
    } catch {
      return false;
    }
  };

  const cleanupOrphanedFiles = async () => {
    try {
      await dispatch(cleanupOrphanedFilesThunk()).unwrap();
      return true;
    } catch {
      return false;
    }
  };

  const removeDownload = async (id) => {
    try {
      await dispatch(removeDownloadThunk(id)).unwrap();
      return true;
    } catch {
      return false;
    }
  };



  return {
    downloads,
    settings,
    startDownload,
    startDirectDownload,
    cancelDownload,
    pauseDownload,
    resumeDownload,
    pauseAllDownloads,
    resumeAllDownloads,
    fetchPausedCount,
    fetchPausedDownloads,
    pausedCount,
    pausedDownloads,
    fetchDownloads: () => dispatch(fetchDownloadsThunk()),
    retryDownload,
    updateSettings,
    fetchSettings: () => dispatch(fetchSettingsThunk()),
    cleanupOrphanedFiles,
    removeDownload,


    directVideoData,
    cleanupMessage: cleanupMessage,
    pendingVideosCount,
    setSimpleVideoData: (data) => dispatch(setSimpleVideoDataAction(data)),
    setDirectVideoData: (data) => dispatch(setDirectVideoDataAction(data)),
    clearVideoData: () => dispatch(clearVideoDataAction()),
    clearCleanupMessage: () => dispatch(clearCleanupMessageAction()),
    fetchPendingVideosCount: () => dispatch(fetchPendingVideosCountThunk()),
  };
};
