'use client'

import { useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { WorkoutSession, SessionSet } from '@/types'

interface LogSetPayload {
  exerciseId: string
  exerciseName: string
  setNumber: number
  actualReps: number | null
  actualWeight: number | null
  unit: string
}

interface UseSessionReturn {
  session: WorkoutSession | null
  isLoading: boolean
  error: string | null
  startSession: (templateId: string, name: string) => Promise<WorkoutSession>
  logSet: (sessionId: string, payload: LogSetPayload) => Promise<SessionSet>
  completeSession: (sessionId: string, notes?: string) => Promise<WorkoutSession>
}

export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<WorkoutSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startSession = useCallback(
    async (templateId: string, name: string): Promise<WorkoutSession> => {
      setIsLoading(true)
      setError(null)
      try {
        const newSession = await api.post<WorkoutSession>('/api/sessions/start', {
          templateId,
          name,
        })
        setSession(newSession)
        return newSession
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to start session'
        setError(msg)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const logSet = useCallback(
    async (sessionId: string, payload: LogSetPayload): Promise<SessionSet> => {
      try {
        const newSet = await api.post<SessionSet>(
          `/api/sessions/${sessionId}/sets`,
          payload
        )
        setSession((prev) => {
          if (!prev) return prev
          return { ...prev, sets: [...prev.sets, newSet] }
        })
        return newSet
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to log set'
        setError(msg)
        throw err
      }
    },
    []
  )

  const completeSession = useCallback(
    async (sessionId: string, notes?: string): Promise<WorkoutSession> => {
      setIsLoading(true)
      setError(null)
      try {
        const completed = await api.patch<WorkoutSession>(
          `/api/sessions/${sessionId}/complete`,
          notes ? { notes } : undefined
        )
        setSession(completed)
        return completed
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to complete session'
        setError(msg)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  return { session, isLoading, error, startSession, logSet, completeSession }
}
