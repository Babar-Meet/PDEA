import { createSlice } from '@reduxjs/toolkit';

const defaultSettings = {
  forwardSkipAmount: 10,
  backwardSkipAmount: -10,
  leftArrowSkip: -5,
  rightArrowSkip: 5,
  skipUnit: 'seconds',
  normalSpeedIncrement: 0.25,
  minSpeed: 0.25,
  maxSpeed: 4,
  tempSpeedAmount: 2,
  tempSpeedHoldDelay: 1000,
  tempSpeedEnabled: true,
  frameStepSeconds: 1 / 30,
  playPauseKey: 'k',
  forwardSkipKey: 'l',
  backwardSkipKey: 'j',
  leftArrowKey: 'ArrowLeft',
  rightArrowKey: 'ArrowRight',
  volumeUpKey: 'ArrowUp',
  volumeDownKey: 'ArrowDown',
  muteKey: 'm',
  frameBackKey: ',',
  frameForwardKey: '.',
  speedDownKey: '[',
  speedUpKey: ']',
  fullscreenKey: 'f',
  spacebarMode: 'playpause',
  showSkipButtons: true,
  showVolumeSlider: true,
  showTimeDisplay: true,
  controlsAutoHide: true,
  autoHideDelay: 3000,
  autoPlayNext: true,
  loopSingle: false,
  showPlaylistControls: true,
  nextVideoKey: 'n',
  prevVideoKey: 'p',
  autoPlayDelay: 0,
};

const getInitialSettings = () => {
  const saved = localStorage.getItem('videoPlayerSettings');
  return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
};

const initialState = {
  settings: getInitialSettings(),
  draftSettings: getInitialSettings(),
  hasUnsavedChanges: false,
};

const videoPlayerSettingsSlice = createSlice({
  name: 'videoPlayerSettings',
  initialState,
  reducers: {
    updateDraftSetting(state, action) {
      const { key, value } = action.payload;
      state.draftSettings[key] = value;
      state.hasUnsavedChanges = true;
    },
    saveSettings(state) {
      state.settings = { ...state.draftSettings };
      state.hasUnsavedChanges = false;
      localStorage.setItem('videoPlayerSettings', JSON.stringify(state.settings));
    },
    resetToDefaults(state) {
      state.draftSettings = { ...defaultSettings };
      state.hasUnsavedChanges = true;
    },
    cancelChanges(state) {
      state.draftSettings = { ...state.settings };
      state.hasUnsavedChanges = false;
    },
  },
});

export const {
  updateDraftSetting,
  saveSettings,
  resetToDefaults,
  cancelChanges,
} = videoPlayerSettingsSlice.actions;

export default videoPlayerSettingsSlice.reducer;
