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

const initialState = {
  downloads: [],
  settings: { maxConcurrentPlaylistDownloads: 3 },
  simpleVideoData: null,
  directVideoData: null,
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
    updateDownloadProgress: (state, action) => {
      const { downloadId, ...updates } = action.payload;
      const index = state.downloads.findIndex(d => d.id === downloadId);
      if (index !== -1) {
        state.downloads[index] = { ...state.downloads[index], ...updates };
      }
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
      });
  },
});


export const { setSimpleVideoData, setDirectVideoData, clearVideoData, updateDownloadProgress } = downloadSlice.actions;

export default downloadSlice.reducer;
