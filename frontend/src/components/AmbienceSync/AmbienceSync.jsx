import React, { useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { API_BASE_URL } from '../../config';
import { updateSoundProgress, clearSeek } from '../../store/slices/ambienceSlice';

/**
 * Syncs Redux ambience state to actual Audio objects.
 * Handles Audio lifecycle (create, play, pause, volume, cleanup) based on Redux state.
 */
const AmbienceSync = () => {
  const { activeSounds, masterVolume } = useSelector((state) => state.ambience);
  const dispatch = useDispatch();
  const audioRefs = useRef({});
  const lastUpdateRefs = useRef({}); // To throttle updates

  useEffect(() => {
    const refs = audioRefs.current;

    activeSounds.forEach((sound) => {
      let audio = refs[sound.id];

      if (!audio) {
        audio = new Audio(`${API_BASE_URL}${sound.path}`);
        audio.loop = true;
        refs[sound.id] = audio;

        // Event listeners for progress
        audio.addEventListener('timeupdate', () => {
            const now = Date.now();
            if (!lastUpdateRefs.current[sound.id] || now - lastUpdateRefs.current[sound.id] > 500) {
                dispatch(updateSoundProgress({
                    id: sound.id,
                    currentTime: audio.currentTime
                }));
                lastUpdateRefs.current[sound.id] = now;
            }
        });
        
        audio.addEventListener('loadedmetadata', () => {
             dispatch(updateSoundProgress({
                id: sound.id,
                duration: audio.duration
            }));
        });
      }

      // Sync Volume
      audio.volume = masterVolume * (sound.volume ?? 0.5);

      // Sync Playback State
      if (sound.isPlaying) {
        if (audio.paused) {
            audio.play().catch((e) => console.error('Playback failed', e));
        }
      } else {
        if (!audio.paused) {
            audio.pause();
        }
      }

      // Sync Seek
      if (sound.seekTo !== undefined && Math.abs(audio.currentTime - sound.seekTo) > 0.5) {
          audio.currentTime = sound.seekTo;
          dispatch(clearSeek({ id: sound.id }));
      }
    });

    // Cleanup removed sounds
    Object.keys(refs).forEach((id) => {
      if (!activeSounds.find((s) => s.id === id)) {
        const audio = refs[id];
        if (audio) {
          audio.pause();
          audio.src = '';
          delete refs[id];
          delete lastUpdateRefs.current[id];
        }
      }
    });
  }, [activeSounds, masterVolume, dispatch]);

  useEffect(() => {
    return () => {
      Object.keys(audioRefs.current).forEach((id) => {
        const audio = audioRefs.current[id];
        if (audio) {
          audio.pause();
          audio.src = '';
        }
      });
      audioRefs.current = {};
    };
  }, []);

  return null;
};

export default AmbienceSync;
