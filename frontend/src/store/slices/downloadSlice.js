import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_BASE_URL } from '../../config';

export const fetchDownloads = createAsyncThunk(
  'download/fetchDownloads',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/download/all`);
      const data = await res.json();
      if (data.success) return data.downloads;
      return rejectWithValue(data.error);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchSettings = createAsyncThunk(
  'download/fetchSettings',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/download/settings`);
      const data = await res.json();
      if (data.success) return data.settings;
      return rejectWithValue(data.error);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateSettings = createAsyncThunk(
  'download/updateSettings',
  async (newSettings, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/download/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      const data = await res.json();
      if (data.success) return data.settings;
      return rejectWithValue(data.error);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchPendingVideosCount = createAsyncThunk(
  'download/fetchPendingVideosCount',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/subscriptions/pending-videos`);
      const pendingVideos = await res.json();
      return pendingVideos.length;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const startDownload = createAsyncThunk(
  'download/startDownload',
  async ({ url, format_id, save_dir, metadata = {} }, { dispatch, rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/download/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, format_id, save_dir, metadata }),
      });
      const data = await res.json();
      if (data.success) {
        dispatch(fetchDownloads());
        return { success: true, downloadId: data.download_id };
      }
      return rejectWithValue(data.error || 'Failed to start download');
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const startDirectDownload = createAsyncThunk(
  'download/startDirectDownload',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/download/direct/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        dispatch(fetchDownloads());
        return { success: true, downloadId: data.download_id };
      }
      return rejectWithValue(data.error || 'Failed to start direct download');
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const cancelDownload = createAsyncThunk(
  'download/cancelDownload',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/download/cancel/${id}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        dispatch(fetchDownloads());
        return true;
      }
      return rejectWithValue(data.error);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const pauseDownload = createAsyncThunk(
  'download/pauseDownload',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/download/pause/${id}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        dispatch(fetchDownloads());
        return true;
      }
      return rejectWithValue(data.error);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const resumeDownload = createAsyncThunk(
  'download/resumeDownload',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/download/resume/${id}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        dispatch(fetchDownloads());
        return true;
      }
      return rejectWithValue(data.error);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const pauseAllDownloads = createAsyncThunk(
  'download/pauseAllDownloads',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/download/pause-all`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        dispatch(fetchDownloads());
        return data.pausedCount;
      }
      return rejectWithValue(data.error);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const resumeAllDownloads = createAsyncThunk(
  'download/resumeAllDownloads',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/download/resume-all`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        dispatch(fetchDownloads());
        return data.resumedCount;
      }
      return rejectWithValue(data.error);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchPausedCount = createAsyncThunk(
  'download/fetchPausedCount',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/download/paused-count`);
      const data = await res.json();
      if (data.success) return data.count;
      return rejectWithValue(data.error);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchPausedDownloads = createAsyncThunk(
  'download/fetchPausedDownloads',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/download/paused`);
      const data = await res.json();
      if (data.success) return data.pausedDownloads;
      return rejectWithValue(data.error);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const retryDownload = createAsyncThunk(
  'download/retryDownload',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/download/retry/${id}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        dispatch(fetchDownloads());
        return true;
      }
      return rejectWithValue(data.error);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const cleanupOrphanedFiles = createAsyncThunk(
  'download/cleanupOrphanedFiles',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/download/cleanup`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) return data.message;
      return rejectWithValue(data.error);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const removeDownload = createAsyncThunk(
  'download/removeDownload',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/download/remove/${id}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        dispatch(fetchDownloads());
        return true;
      }
      return rejectWithValue(data.error);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);



const initialState = {
  downloads: [],
  settings: { maxConcurrentPlaylistDownloads: 3 },
  simpleVideoData: null,
  directVideoData: null,
  cleanupMessage: null,
  pausedCount: 0,
  pausedDownloads: [],
  pendingVideosCount: 0,
};

const downloadSlice = createSlice({
  name: 'download',
  initialState,
  reducers: {
    setSimpleVideoData: (state, action) => {
      state.simpleVideoData = action.payload;
    },
    setDirectVideoData: (state, action) => {
      state.directVideoData = action.payload;
    },
    clearVideoData: (state) => {
      state.simpleVideoData = null;
      state.directVideoData = null;
    },
    clearCleanupMessage: (state) => {
      state.cleanupMessage = null;
    },
    updateDownloadProgress: (state, action) => {
      const { downloadId, ...updates } = action.payload;
      const index = state.downloads.findIndex(d => d.id === downloadId);
      if (index !== -1) {
        state.downloads[index] = { ...state.downloads[index], ...updates };
      }
    },
    removeDownloadLocally: (state, action) => {
      state.downloads = state.downloads.filter(d => d.id !== action.payload);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDownloads.fulfilled, (state, action) => {
        state.downloads = action.payload;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
      })
      .addCase(cleanupOrphanedFiles.fulfilled, (state, action) => {
        state.cleanupMessage = action.payload;
      })
      .addCase(cleanupOrphanedFiles.rejected, (state, action) => {
        state.cleanupMessage = null;
      })
      .addCase(removeDownload.fulfilled, (state, action) => {
        // Download removed from backend, no need to do anything here
        // as fetchDownloads will be called
      })
      .addCase(fetchPausedCount.fulfilled, (state, action) => {
        state.pausedCount = action.payload;
      })
      .addCase(fetchPausedDownloads.fulfilled, (state, action) => {
        state.pausedDownloads = action.payload;
        state.pausedCount = action.payload.length;
      })
      .addCase(fetchPendingVideosCount.fulfilled, (state, action) => {
        state.pendingVideosCount = action.payload;
      });
  },
});


export const { setSimpleVideoData, setDirectVideoData, clearVideoData, clearCleanupMessage, updateDownloadProgress, removeDownloadLocally } = downloadSlice.actions;

export default downloadSlice.reducer;
