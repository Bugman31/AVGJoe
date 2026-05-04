import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import type { ProgressSummary, ProgressRange } from '@/types';

export function useProgressSummary(range: ProgressRange = '1m') {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<ProgressSummary>(`/api/summary/progress?range=${range}`);
      setSummary(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  return { summary, isLoading, error, reload: load };
}
