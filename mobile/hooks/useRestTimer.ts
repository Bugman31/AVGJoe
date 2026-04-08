import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'rest_timer_duration';
export const REST_TIMER_OPTIONS = [60, 90, 120] as const;
export type RestTimerDuration = (typeof REST_TIMER_OPTIONS)[number];

interface UseRestTimerReturn {
  remaining: number;
  isActive: boolean;
  selectedDuration: RestTimerDuration;
  setSelectedDuration: (d: RestTimerDuration) => void;
  start: (overrideDuration?: RestTimerDuration) => void;
  stop: () => void;
}

export function useRestTimer(): UseRestTimerReturn {
  const [selectedDuration, setSelectedDurationState] = useState<RestTimerDuration>(90);
  const [remaining, setRemaining] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      const parsed = val ? parseInt(val, 10) : null;
      if (parsed && REST_TIMER_OPTIONS.includes(parsed as RestTimerDuration)) {
        setSelectedDurationState(parsed as RestTimerDuration);
      }
    });
  }, []);

  // Countdown tick
  useEffect(() => {
    if (!isActive) return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setIsActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [isActive]);

  const start = useCallback(
    (overrideDuration?: RestTimerDuration) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const duration = overrideDuration ?? selectedDuration;
      setRemaining(duration);
      setIsActive(true);
    },
    [selectedDuration]
  );

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsActive(false);
    setRemaining(0);
  }, []);

  const setSelectedDuration = useCallback((d: RestTimerDuration) => {
    setSelectedDurationState(d);
    AsyncStorage.setItem(STORAGE_KEY, String(d));
  }, []);

  return { remaining, isActive, selectedDuration, setSelectedDuration, start, stop };
}
