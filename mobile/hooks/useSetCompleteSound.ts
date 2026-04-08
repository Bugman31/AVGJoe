import { useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SOUND_PREF_KEY = 'sound_on_set_complete';

/**
 * Plays a short beep on set completion when the user has the preference enabled.
 * Uses expo-av Audio, guarded so it silently no-ops in environments where the
 * native module isn't available (e.g. Expo Go, Jest).
 */
export function useSetCompleteSound() {
  const soundRef = useRef<any>(null);
  const enabledRef = useRef(true);

  // Load sound + preference on mount
  useEffect(() => {
    let mounted = true;

    async function setup() {
      try {
        // Read user preference
        const pref = await AsyncStorage.getItem(SOUND_PREF_KEY);
        enabledRef.current = pref !== 'false'; // default on

        // Dynamically import expo-av to avoid hard crash in Expo Go / Jest
        const { Audio } = await import('expo-av');
        const { sound } = await Audio.Sound.createAsync(
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require('../assets/sounds/set_complete.mp3')
        );
        if (mounted) soundRef.current = sound;
      } catch {
        // Asset not found or native module unavailable — silently skip
      }
    }

    setup();
    return () => {
      mounted = false;
      soundRef.current?.unloadAsync?.();
    };
  }, []);

  const play = useCallback(async () => {
    if (!enabledRef.current || !soundRef.current) return;
    try {
      await soundRef.current.setPositionAsync(0);
      await soundRef.current.playAsync();
    } catch {
      // Silently ignore playback errors (device muted, background, etc.)
    }
  }, []);

  return { play };
}
