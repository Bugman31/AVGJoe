import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LibraryExercise } from '@/lib/exerciseLibrary';

const STORAGE_KEY = 'custom_exercises_v1';

export function useCustomExercises() {
  const [customExercises, setCustomExercises] = useState<LibraryExercise[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => {
        if (json) setCustomExercises(JSON.parse(json));
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  const addExercise = useCallback(async (exercise: LibraryExercise) => {
    setCustomExercises((prev) => {
      const updated = [...prev, exercise];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const removeExercise = useCallback(async (name: string) => {
    setCustomExercises((prev) => {
      const updated = prev.filter((e) => e.name !== name);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  return { customExercises, addExercise, removeExercise, isLoaded };
}
