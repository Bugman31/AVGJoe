'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { WorkoutSession, SessionSet } from '@/types'
import { formatDate, formatDuration } from '@/lib/utils'
import ProgressChart from '@/components/history/ProgressChart'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'

// Group session sets by exercise name
function groupByExercise(sets: SessionSet[]): Record<string, SessionSet[]> {
  return sets.reduce<Record<string, SessionSet[]>>((acc, s) => {
    if (!acc[s.exerciseName]) acc[s.exerciseName] = []
    acc[s.exerciseName].push(s)
    return acc
  }, {})
}

export default function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [session, setSession] = useState<WorkoutSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.get<WorkoutSession>(`/api/sessions/${sessionId}`)
        setSession(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <p className="text-danger">{error || 'Session not found'}</p>
        <Link href="/history" className="text-accent text-sm mt-2 inline-block">
          Back to history
        </Link>
      </div>
    )
  }

  const exerciseGroups = groupByExercise(session.sets)
  const exerciseNames = Object.keys(exerciseGroups)

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/history"
          className="text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[#f5f5f5]">{session.name}</h1>
          <p className="text-xs text-[#a3a3a3] mt-0.5">
            {formatDate(session.startedAt)} ·{' '}
            {formatDuration(session.startedAt, session.completedAt)}
          </p>
        </div>
        {session.completedAt ? (
          <Badge variant="success">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Done
          </Badge>
        ) : (
          <Badge variant="default">In Progress</Badge>
        )}
      </div>

      {session.notes && (
        <Card className="mb-6">
          <p className="text-sm text-[#a3a3a3]">{session.notes}</p>
        </Card>
      )}

      {/* Exercise sections */}
      <div className="space-y-6">
        {exerciseNames.map((exerciseName) => {
          const sets = exerciseGroups[exerciseName]
          const exerciseId = sets[0].exerciseId

          return (
            <div key={exerciseName}>
              <h2 className="text-sm font-semibold text-[#f5f5f5] mb-3">
                {exerciseName}
              </h2>

              {/* Sets */}
              <Card className="mb-3">
                <div className="grid grid-cols-4 gap-2 text-xs text-[#a3a3a3] mb-2">
                  <span>Set</span>
                  <span>Reps</span>
                  <span>Weight</span>
                  <span>Unit</span>
                </div>
                <div className="space-y-1.5">
                  {sets.map((s) => (
                    <div
                      key={s.id}
                      className="grid grid-cols-4 gap-2 text-sm text-[#f5f5f5] bg-[#1f1f1f] rounded-lg px-3 py-2"
                    >
                      <span className="text-[#a3a3a3]">{s.setNumber}</span>
                      <span>{s.actualReps ?? '—'}</span>
                      <span>{s.actualWeight ?? '—'}</span>
                      <span className="text-[#a3a3a3]">{s.unit}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Progress Chart */}
              <ProgressChart exerciseId={exerciseId} exerciseName={exerciseName} />
            </div>
          )
        })}

        {exerciseNames.length === 0 && (
          <Card className="text-center py-8">
            <p className="text-[#a3a3a3] text-sm">No sets logged in this session.</p>
          </Card>
        )}
      </div>
    </div>
  )
}
