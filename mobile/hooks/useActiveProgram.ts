import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Program, PlannedWorkout } from '@/types';

const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function useActiveProgram() {
  const [program, setProgram] = useState<Program | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ program: Program | null }>('/api/programs/active');
      setProgram(res.program);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const todayWorkout = (): PlannedWorkout | null => {
    if (!program) return null;
    const todayName = DAY_ORDER[new Date().getDay()];
    return (
      program.plannedWorkouts.find(
        (pw) =>
          pw.weekNumber === program.currentWeek &&
          pw.dayOfWeek === todayName &&
          !pw.isCompleted
      ) ?? null
    );
  };

  const currentWeekWorkouts = (): PlannedWorkout[] => {
    if (!program) return [];
    return program.plannedWorkouts.filter((pw) => pw.weekNumber === program.currentWeek);
  };

  const weekAdherence = (): { completed: number; total: number } => {
    const week = currentWeekWorkouts();
    return { completed: week.filter((pw) => pw.isCompleted).length, total: week.length };
  };

  return { program, isLoading, error, reload: load, todayWorkout, currentWeekWorkouts, weekAdherence };
}
