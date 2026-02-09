import { configureStore } from '@reduxjs/toolkit';
import videoPlayerSettingsReducer from './slices/videoPlayerSettingsSlice';
import downloadReducer from './slices/downloadSlice';
import ambienceReducer from './slices/ambienceSlice';

export const store = configureStore({
  reducer: {
    videoPlayerSettings: videoPlayerSettingsReducer,
    download: downloadReducer,
    ambience: ambienceReducer,
  },
});
