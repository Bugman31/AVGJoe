import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Program, WeeklyAnalysis } from '@/types';

export function useProgram() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ programs: Program[] }>('/api/programs');
      setPrograms(res.programs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const generateProgram = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await api.post<{ program: Program }>('/api/ai/generate-program', {});
      setPrograms((prev) => [res.program, ...prev]);
      return res.program;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const archiveProgram = useCallback(async (programId: string) => {
    await api.patch(`/api/programs/${programId}/status`, { status: 'archived' });
    await load();
  }, [load]);

  const getAnalyses = useCallback(async (programId: string): Promise<WeeklyAnalysis[]> => {
    const res = await api.get<{ analyses: WeeklyAnalysis[] }>(`/api/analysis/programs/${programId}`);
    return res.analyses;
  }, []);

  const triggerWeeklyAnalysis = useCallback(async (programId: string, weekNumber: number): Promise<WeeklyAnalysis> => {
    const res = await api.post<{ analysis: WeeklyAnalysis }>(`/api/analysis/programs/${programId}/analyze-week`, { weekNumber });
    return res.analysis;
  }, []);

  return { programs, isLoading, isGenerating, error, reload: load, generateProgram, archiveProgram, getAnalyses, triggerWeeklyAnalysis };
}
