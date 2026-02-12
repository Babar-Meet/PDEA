import { useDispatch, useSelector } from 'react-redux';
import {
  fetchDownloads as fetchDownloadsThunk,
  fetchSettings as fetchSettingsThunk,
  updateSettings as updateSettingsThunk,
  startDownload as startDownloadThunk,
  startDirectDownload as startDirectDownloadThunk,
  cancelDownload as cancelDownloadThunk,
  retryDownload as retryDownloadThunk,
  cleanupOrphanedFiles as cleanupOrphanedFilesThunk,
  setSimpleVideoData as setSimpleVideoDataAction,
  setDirectVideoData as setDirectVideoDataAction,
  clearVideoData as clearVideoDataAction,
} from '../store/slices/downloadSlice';

export const useDownload = () => {
  const dispatch = useDispatch();
  const downloads = useSelector((state) => state.download.downloads);
  const settings = useSelector((state) => state.download.settings);
  const simpleVideoData = useSelector((state) => state.download.simpleVideoData);
  const directVideoData = useSelector((state) => state.download.directVideoData);
  const cleanupMessage = useSelector((state) => state.download.cleanupMessage);

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

  return {
    downloads,
    settings,
    startDownload,
    startDirectDownload,
    cancelDownload,
    fetchDownloads: () => dispatch(fetchDownloadsThunk()),
    retryDownload,
    updateSettings,
    fetchSettings: () => dispatch(fetchSettingsThunk()),
    cleanupOrphanedFiles,

    simpleVideoData,
    directVideoData,
    cleanupMessage,
    setSimpleVideoData: (data) => dispatch(setSimpleVideoDataAction(data)),
    setDirectVideoData: (data) => dispatch(setDirectVideoDataAction(data)),
    clearVideoData: () => dispatch(clearVideoDataAction()),
  };
};
