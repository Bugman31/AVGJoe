import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { WorkoutSession, LogSetInput, PlannedWorkout } from '@/types';

interface CompleteSessionPayload {
  notes?: string;
  postEnergyLevel?: number;
  sorenessLevel?: number;
}

interface UseSessionResult {
  session: WorkoutSession | null;
  isLoading: boolean;
  error: string | null;
  startSession: (templateId: string, name: string) => Promise<WorkoutSession>;
  startProgramWorkout: (plannedWorkout: PlannedWorkout, programId: string) => Promise<WorkoutSession>;
  logSet: (sessionId: string, payload: LogSetInput) => Promise<void>;
  completeSession: (sessionId: string, notesOrPayload?: string | CompleteSessionPayload) => Promise<WorkoutSession>;
}

export function useSession(): UseSessionResult {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSession = useCallback(async (templateId: string, name: string): Promise<WorkoutSession> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<{ session: WorkoutSession }>('/api/sessions/start', { templateId, name });
      setSession(response.session);
      return response.session;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start session';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start a session tied to a specific PlannedWorkout from an enrolled program
  const startProgramWorkout = useCallback(async (
    plannedWorkout: PlannedWorkout,
    programId: string,
  ): Promise<WorkoutSession> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<{ session: WorkoutSession }>('/api/sessions/start', {
        name: plannedWorkout.name,
        plannedWorkoutId: plannedWorkout.id,
        programId,
      });
      setSession(response.session);
      return response.session;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start workout';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logSet = useCallback(async (sessionId: string, payload: LogSetInput): Promise<void> => {
    try {
      await api.post(`/api/sessions/${sessionId}/sets`, payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to log set';
      setError(msg);
      throw err;
    }
  }, []);

  const completeSession = useCallback(async (
    sessionId: string,
    notesOrPayload?: string | CompleteSessionPayload
  ): Promise<WorkoutSession> => {
    setIsLoading(true);
    setError(null);
    const payload: CompleteSessionPayload =
      typeof notesOrPayload === 'string'
        ? { notes: notesOrPayload }
        : notesOrPayload ?? {};
    try {
      const response = await api.patch<{ session: WorkoutSession }>(
        `/api/sessions/${sessionId}/complete`,
        payload
      );
      setSession(response.session);
      return response.session;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to complete session';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { session, isLoading, error, startSession, startProgramWorkout, logSet, completeSession };
}
