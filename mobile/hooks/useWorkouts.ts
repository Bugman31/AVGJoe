import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { WorkoutTemplate } from '@/types';

interface UseWorkoutsResult {
  workouts: WorkoutTemplate[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useWorkouts(): UseWorkoutsResult {
  const [workouts, setWorkouts] = useState<WorkoutTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<{ templates: WorkoutTemplate[] }>('/api/workouts');
      setWorkouts(response.templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workouts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { workouts, isLoading, error, refetch: fetch };
}
