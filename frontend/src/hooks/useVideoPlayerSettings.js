import { useDispatch, useSelector } from 'react-redux';
import {
  updateDraftSetting as updateDraftSettingAction,
  saveSettings as saveSettingsAction,
  resetToDefaults as resetToDefaultsAction,
  cancelChanges as cancelChangesAction,
} from '../store/slices/videoPlayerSettingsSlice';

export const useVideoPlayerSettings = () => {
  const dispatch = useDispatch();
  const settings = useSelector((state) => state.videoPlayerSettings.settings);
  const draftSettings = useSelector((state) => state.videoPlayerSettings.draftSettings);
  const hasUnsavedChanges = useSelector(
    (state) => state.videoPlayerSettings.hasUnsavedChanges
  );

  return {
    settings,
    draftSettings,
    hasUnsavedChanges,
    updateDraftSetting: (key, value) =>
      dispatch(updateDraftSettingAction({ key, value })),
    saveSettings: () => dispatch(saveSettingsAction()),
    resetToDefaults: () => dispatch(resetToDefaultsAction()),
    cancelChanges: () => dispatch(cancelChangesAction()),
  };
};
