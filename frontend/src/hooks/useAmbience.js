import { useDispatch, useSelector } from 'react-redux';
import {
  toggleSound as toggleSoundAction,
  removeSound as removeSoundAction,
  setSoundVolume as setSoundVolumeAction,
  setMasterVolume as setMasterVolumeAction,
  stopAll as stopAllAction,
  playAll as playAllAction,
  clearQueue as clearQueueAction,
  seekSound as seekSoundAction
} from '../store/slices/ambienceSlice';

export const useAmbience = () => {
  const dispatch = useDispatch();
  const activeSounds = useSelector((state) => state.ambience.activeSounds);
  const masterVolume = useSelector((state) => state.ambience.masterVolume);

  return {
    activeSounds,
    masterVolume,
    toggleSound: (sound) => dispatch(toggleSoundAction(sound)),
    removeSound: (id) => dispatch(removeSoundAction(id)),
    setSoundVolume: (id, volume) => dispatch(setSoundVolumeAction({ id, volume })),
    setGlobalVolume: (volume) => dispatch(setMasterVolumeAction(volume)),
    stopAll: () => dispatch(stopAllAction()),
    playAll: () => dispatch(playAllAction()),
    clearQueue: () => dispatch(clearQueueAction()),
    seekSound: (id, time) => dispatch(seekSoundAction({ id, time })),
  };
};
