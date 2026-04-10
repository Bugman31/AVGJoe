import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { SharedProgram } from '@/types';

interface UseSharedProgramsReturn {
  programs: SharedProgram[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  search: (q: string) => void;
  setCategory: (cat: string | null) => void;
  setDifficulty: (d: string | null) => void;
  setSortBy: (sort: string) => void;
}

export function useSharedPrograms(): UseSharedProgramsReturn {
  const [programs, setPrograms] = useState<SharedProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Use a counter to trigger manual refetches
  const [fetchCount, setFetchCount] = useState(0);

  const fetchPrograms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string | undefined> = {
        category: category || undefined,
        q: searchQuery || undefined,
        difficulty: difficulty || undefined,
        sort: sortBy || undefined,
      };
      const data = await api.get<{ programs: SharedProgram[] }>('/api/shared-programs', { params });
      setPrograms(data.programs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPrograms([]);
    } finally {
      setIsLoading(false);
    }
  }, [category, difficulty, sortBy, searchQuery, fetchCount]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const refetch = useCallback(() => {
    setFetchCount((c) => c + 1);
  }, []);

  const search = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  const handleSetCategory = useCallback((cat: string | null) => {
    setCategory(cat);
  }, []);

  const handleSetDifficulty = useCallback((d: string | null) => {
    setDifficulty(d);
  }, []);

  const handleSetSortBy = useCallback((sort: string) => {
    setSortBy(sort);
  }, []);

  return {
    programs,
    isLoading,
    error,
    refetch,
    search,
    setCategory: handleSetCategory,
    setDifficulty: handleSetDifficulty,
    setSortBy: handleSetSortBy,
  };
}
