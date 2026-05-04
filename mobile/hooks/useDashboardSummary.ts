import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import type { DashboardSummary } from '@/types';

export function useDashboardSummary() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<DashboardSummary>('/api/summary/dashboard');
      setSummary(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { summary, isLoading, error, reload: load };
}
