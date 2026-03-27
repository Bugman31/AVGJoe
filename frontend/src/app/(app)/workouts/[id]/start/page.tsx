'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, Clock, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { WorkoutTemplate, WorkoutSession, ExerciseSet } from '@/types'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'

interface LoggedSet {
  setId: string
  exerciseId: string
  exerciseName: string
  setNumber: number
  actualReps: number | null
  actualWeight: number | null
  unit: string
  done: boolean
}

function useTimer(startedAt: Date | null) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startedAt) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function StartWorkoutPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [template, setTemplate] = useState<WorkoutTemplate | null>(null)
  const [session, setSession] = useState<WorkoutSession | null>(null)
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>([])
  const [initError, setInitError] = useState('')
  const [initLoading, setInitLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [completingError, setCompletingError] = useState('')

  const startedAtRef = useRef<Date | null>(null)
  const timer = useTimer(startedAtRef.current)

  useEffect(() => {
    const init = async () => {
      try {
        const tmpl = await api.get<WorkoutTemplate>(`/api/workouts/${id}`)
        setTemplate(tmpl)

        const sess = await api.post<WorkoutSession>('/api/sessions/start', {
          templateId: id,
          name: tmpl.name,
        })
        setSession(sess)
        startedAtRef.current = new Date()

        // Initialise the logged sets grid
        const grid: LoggedSet[] = []
        for (const ex of tmpl.exercises) {
          for (const s of ex.sets) {
            grid.push({
              setId: s.id,
              exerciseId: ex.id,
              exerciseName: ex.name,
              setNumber: s.setNumber,
              actualReps: s.targetReps,
              actualWeight: s.targetWeight,
              unit: s.unit,
              done: false,
            })
          }
        }
        setLoggedSets(grid)
      } catch (err) {
        setInitError(err instanceof Error ? err.message : 'Failed to start session')
      } finally {
        setInitLoading(false)
      }
    }
    init()
  }, [id])

  const updateSet = useCallback(
    (exerciseId: string, setNumber: number, field: keyof LoggedSet, value: unknown) => {
      setLoggedSets((prev) =>
        prev.map((s) =>
          s.exerciseId === exerciseId && s.setNumber === setNumber
            ? { ...s, [field]: value }
            : s
        )
      )
    },
    []
  )

  const markDone = useCallback(
    async (exerciseId: string, setNumber: number) => {
      if (!session) return
      const set = loggedSets.find(
        (s) => s.exerciseId === exerciseId && s.setNumber === setNumber
      )
      if (!set || set.done) return

      try {
        await api.post(`/api/sessions/${session.id}/sets`, {
          exerciseId: set.exerciseId,
          exerciseName: set.exerciseName,
          setNumber: set.setNumber,
          actualReps: set.actualReps,
          actualWeight: set.actualWeight,
          unit: set.unit,
        })
        updateSet(exerciseId, setNumber, 'done', true)
      } catch (err) {
        console.error('Failed to log set:', err)
      }
    },
    [session, loggedSets, updateSet]
  )

  const handleComplete = async () => {
    if (!session) return
    setCompleting(true)
    setCompletingError('')
    try {
      await api.patch(`/api/sessions/${session.id}/complete`)
      router.push('/history')
    } catch (err) {
      setCompletingError(
        err instanceof Error ? err.message : 'Failed to complete session'
      )
      setCompleting(false)
    }
  }

  if (initLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (initError || !template || !session) {
    return (
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <p className="text-danger mb-3">{initError || 'Something went wrong'}</p>
        <Link href={`/workouts/${id}`} className="text-accent text-sm">
          Back to workout
        </Link>
      </div>
    )
  }

  const completedCount = loggedSets.filter((s) => s.done).length
  const totalCount = loggedSets.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-32">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          href={`/workouts/${id}`}
          className="text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[#f5f5f5]">{template.name}</h1>
        </div>
        {/* Timer */}
        <div className="flex items-center gap-1.5 text-[#a3a3a3]">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-mono">{timer}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-[#2a2a2a] rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-[#a3a3a3] text-right mb-6">
        {completedCount} / {totalCount} sets done
      </p>

      {/* Exercises */}
      <div className="space-y-6">
        {template.exercises.map((exercise) => {
          const exSets = loggedSets.filter((s) => s.exerciseId === exercise.id)
          return (
            <div key={exercise.id} className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-[#f5f5f5] mb-1">
                {exercise.name}
              </h3>
              {exercise.notes && (
                <p className="text-xs text-[#a3a3a3] mb-3">{exercise.notes}</p>
              )}

              <div className="space-y-3 mt-3">
                {exSets.map((loggedSet) => {
                  // Find template set for target display
                  const templateSet = exercise.sets.find(
                    (s) => s.setNumber === loggedSet.setNumber
                  )

                  return (
                    <div
                      key={`${exercise.id}-${loggedSet.setNumber}`}
                      className={cn(
                        'flex items-center gap-3 rounded-lg p-3 transition-colors',
                        loggedSet.done
                          ? 'bg-success/5 border border-success/20'
                          : 'bg-[#1f1f1f] border border-[#2a2a2a]'
                      )}
                    >
                      {/* Set number */}
                      <span className="text-xs text-[#a3a3a3] w-5 text-center flex-shrink-0">
                        {loggedSet.setNumber}
                      </span>

                      {/* Target label */}
                      <div className="text-xs text-[#a3a3a3] flex-shrink-0 w-20">
                        {templateSet
                          ? `${templateSet.targetReps ?? '?'} × ${
                              templateSet.unit === 'bodyweight'
                                ? 'BW'
                                : `${templateSet.targetWeight ?? '?'} ${templateSet.unit}`
                            }`
                          : '—'}
                      </div>

                      {/* Actual reps */}
                      <input
                        type="number"
                        min={0}
                        placeholder="Reps"
                        disabled={loggedSet.done}
                        value={loggedSet.actualReps ?? ''}
                        onChange={(e) =>
                          updateSet(
                            exercise.id,
                            loggedSet.setNumber,
                            'actualReps',
                            e.target.value === '' ? null : Number(e.target.value)
                          )
                        }
                        className={cn(
                          'flex-1 bg-[#0a0a0a] border border-[#2a2a2a] text-[#f5f5f5] rounded-lg px-2 py-1.5 text-sm focus:border-accent focus:outline-none',
                          loggedSet.done && 'opacity-60 cursor-not-allowed'
                        )}
                      />

                      {/* Actual weight */}
                      {loggedSet.unit !== 'bodyweight' && (
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          placeholder="Weight"
                          disabled={loggedSet.done}
                          value={loggedSet.actualWeight ?? ''}
                          onChange={(e) =>
                            updateSet(
                              exercise.id,
                              loggedSet.setNumber,
                              'actualWeight',
                              e.target.value === '' ? null : Number(e.target.value)
                            )
                          }
                          className={cn(
                            'flex-1 bg-[#0a0a0a] border border-[#2a2a2a] text-[#f5f5f5] rounded-lg px-2 py-1.5 text-sm focus:border-accent focus:outline-none',
                            loggedSet.done && 'opacity-60 cursor-not-allowed'
                          )}
                        />
                      )}

                      {/* Done button */}
                      {loggedSet.done ? (
                        <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0" />
                      ) : (
                        <button
                          onClick={() => markDone(exercise.id, loggedSet.setNumber)}
                          className="w-8 h-8 bg-accent/10 hover:bg-accent text-accent hover:text-white rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
                          title="Mark done"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Complete button (sticky bottom) */}
      <div className="fixed bottom-20 left-0 right-0 md:left-64 md:bottom-0 px-4 py-4 bg-[#0a0a0a] border-t border-[#2a2a2a]">
        {completingError && (
          <p className="text-danger text-xs mb-2 text-center">{completingError}</p>
        )}
        <Button
          variant="primary"
          size="lg"
          loading={completing}
          onClick={handleComplete}
          className="w-full max-w-2xl mx-auto block"
        >
          Complete Workout
        </Button>
      </div>
    </div>
  )
}
