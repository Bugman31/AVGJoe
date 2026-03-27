'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { WorkoutTemplate } from '@/types'

interface UseWorkoutsReturn {
  workouts: WorkoutTemplate[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useWorkouts(): UseWorkoutsReturn {
  const [workouts, setWorkouts] = useState<WorkoutTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkouts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.get<{ templates: WorkoutTemplate[] } | WorkoutTemplate[]>('/api/workouts')
      setWorkouts(Array.isArray(data) ? data : (data as any).templates ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workouts')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkouts()
  }, [fetchWorkouts])

  return { workouts, isLoading, error, refetch: fetchWorkouts }
}
