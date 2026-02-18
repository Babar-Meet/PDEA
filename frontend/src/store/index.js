import { configureStore } from '@reduxjs/toolkit';
import videoPlayerSettingsReducer from './slices/videoPlayerSettingsSlice';
import downloadReducer from './slices/downloadSlice';
import ambienceReducer from './slices/ambienceSlice';
import themeReducer from './slices/themeSlice';

export const store = configureStore({
  reducer: {
    videoPlayerSettings: videoPlayerSettingsReducer,
    download: downloadReducer,
    ambience: ambienceReducer,
    theme: themeReducer,
  },
});
