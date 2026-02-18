import { createSlice } from '@reduxjs/toolkit';

// ─── Preset Token Maps ────────────────────────────────────────────────────────

export const darkTheme = {
  '--bg-primary':        '#0f0f0f',
  '--bg-secondary':      '#1a1a1a',
  '--bg-card':           '#1f1f1f',
  '--bg-input':          'rgba(255,255,255,0.05)',
  '--text-primary':      '#ffffff',
  '--text-secondary':    '#aaaaaa',
  '--accent':            '#3ea6ff',
  '--accent-hover':      '#65b8ff',
  '--sidebar-bg':        '#0f0f0f',
  '--sidebar-border':    '#303030',
  '--sidebar-hover':     '#272727',
  '--sidebar-active':    '#272727',
  '--border-color':      'rgba(255,255,255,0.1)',
  '--border-color-hover':'rgba(255,255,255,0.2)',
  '--btn-trash':         '#ff9900',
  '--btn-delete':        '#ff0000',
  '--badge-bg':          '#ff0000',
  '--font-family':       "'Roboto', sans-serif",
  '--font-header':       "'Roboto', sans-serif",
  '--font-title':        "'Roboto', sans-serif",
  '--font-sidebar':      "'Roboto', sans-serif",
  '--font-sidebar-title': "'Roboto', sans-serif",
  '--font-sidebar-label': "'Roboto', sans-serif",
  '--sidebar-label-size': '14px',
  '--font-size-base':    '14px',
  '--icon-size':         '24px',
  '--radius-card':       '12px',
  '--radius-btn':        '8px',
  '--shadow-sm':         '0 2px 8px rgba(0,0,0,0.5)',
  '--shadow-md':         '0 4px 16px rgba(0,0,0,0.6)',
  '--overlay-bg':        'rgba(0,0,0,0.8)',
};

export const lightTheme = {
  '--bg-primary':        '#ffffff',
  '--bg-secondary':      '#f9f9f9',
  '--bg-card':           '#eeeeee',
  '--bg-input':          'rgba(0,0,0,0.05)',
  '--text-primary':      '#0f0f0f',
  '--text-secondary':    '#606060',
  '--accent':            '#065fd4',
  '--accent-hover':      '#0556bf',
  '--sidebar-bg':        '#ffffff',
  '--sidebar-border':    '#e5e5e5',
  '--sidebar-hover':     '#f2f2f2',
  '--sidebar-active':    '#e5e5e5',
  '--border-color':      'rgba(0,0,0,0.1)',
  '--border-color-hover':'rgba(0,0,0,0.2)',
  '--btn-trash':         '#e67e00',
  '--btn-delete':        '#cc0000',
  '--badge-bg':          '#cc0000',
  '--font-family':       "'Roboto', sans-serif",
  '--font-header':       "'Roboto', sans-serif",
  '--font-title':        "'Roboto', sans-serif",
  '--font-sidebar':      "'Roboto', sans-serif",
  '--font-sidebar-title': "'Roboto', sans-serif",
  '--font-sidebar-label': "'Roboto', sans-serif",
  '--sidebar-label-size': '14px',
  '--font-size-base':    '14px',
  '--icon-size':         '24px',
  '--radius-card':       '12px',
  '--radius-btn':        '8px',
  '--shadow-sm':         '0 2px 8px rgba(0,0,0,0.1)',
  '--shadow-md':         '0 4px 16px rgba(0,0,0,0.15)',
  '--overlay-bg':        'rgba(255,255,255,0.9)',
};

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'appTheme';

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveToStorage = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      activeTheme: state.activeTheme,
      customTokens: state.customTokens,
    }));
  } catch { /* ignore */ }
};

// ─── Initial State ────────────────────────────────────────────────────────────

const persisted = loadFromStorage();

const initialState = {
  activeTheme: persisted?.activeTheme || 'dark',   // 'dark' | 'light' | 'custom'
  customTokens: persisted?.customTokens 
    ? { ...(persisted.activeTheme === 'light' ? lightTheme : darkTheme), ...persisted.customTokens }
    : { ...darkTheme },
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    /** Apply a preset ('dark' | 'light') */
    setPreset(state, action) {
      const preset = action.payload; // 'dark' | 'light'
      state.activeTheme = preset;
      state.customTokens = preset === 'light' ? { ...lightTheme } : { ...darkTheme };
      saveToStorage(state);
    },

    /** Update a single CSS variable token (switches to 'custom') */
    updateToken(state, action) {
      const { key, value } = action.payload;
      state.customTokens[key] = value;
      state.activeTheme = 'custom';
      saveToStorage(state);
    },

    /** Bulk-update multiple tokens at once */
    updateTokens(state, action) {
      const updates = action.payload; // { key: value, ... }
      state.customTokens = { ...state.customTokens, ...updates };
      state.activeTheme = 'custom';
      saveToStorage(state);
    },

    /** Import a full theme object */
    importTheme(state, action) {
      const { activeTheme, customTokens } = action.payload;
      state.activeTheme = activeTheme || 'custom';
      state.customTokens = { ...darkTheme, ...customTokens }; // fill missing keys with dark defaults
      saveToStorage(state);
    },

    /** Reset to dark defaults */
    resetToDark(state) {
      state.activeTheme = 'dark';
      state.customTokens = { ...darkTheme };
      saveToStorage(state);
    },

    /** Reset to light defaults */
    resetToLight(state) {
      state.activeTheme = 'light';
      state.customTokens = { ...lightTheme };
      saveToStorage(state);
    },
  },
});

export const {
  setPreset,
  updateToken,
  updateTokens,
  importTheme,
  resetToDark,
  resetToLight,
} = themeSlice.actions;

export default themeSlice.reducer;
