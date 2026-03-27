'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Play, Trash2, Dumbbell, Pencil, Check, X } from 'lucide-react'
import { api } from '@/lib/api'
import { WorkoutTemplate } from '@/types'
import { formatDate } from '@/lib/utils'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'

export default function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [workout, setWorkout] = useState<WorkoutTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.get<{ template: WorkoutTemplate } | WorkoutTemplate>(`/api/workouts/${id}`)
        setWorkout((data as { template: WorkoutTemplate }).template ?? (data as WorkoutTemplate))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workout')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id])

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }
    setDeleting(true)
    try {
      await api.delete(`/api/workouts/${id}`)
      router.push('/workouts')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workout')
      setDeleting(false)
      setDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !workout) {
    return (
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <p className="text-danger">{error || 'Workout not found'}</p>
        <Link href="/workouts" className="text-accent text-sm mt-2 inline-block">
          Back to workouts
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/workouts"
          className="text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-[#f5f5f5]">{workout.name}</h1>
            {workout.isAiGenerated && <Badge variant="accent">AI</Badge>}
          </div>
          <p className="text-xs text-[#a3a3a3] mt-0.5">
            Created {formatDate(workout.createdAt)}
          </p>
        </div>
      </div>

      {workout.description && (
        <p className="text-sm text-[#a3a3a3] mb-6">{workout.description}</p>
      )}

      {/* Start button */}
      <Link href={`/workouts/${id}/start`}>
        <Button variant="primary" size="lg" className="w-full mb-6">
          <Play className="w-4 h-4" />
          Start Workout
        </Button>
      </Link>

      {/* Exercises */}
      <div className="space-y-4 mb-8">
        <h2 className="text-sm font-semibold text-[#f5f5f5]">
          {workout.exercises.length} Exercise{workout.exercises.length !== 1 ? 's' : ''}
        </h2>
        {workout.exercises.map((exercise) => (
          <Card key={exercise.id}>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 bg-[#2a2a2a] rounded-lg flex items-center justify-center flex-shrink-0">
                <Dumbbell className="w-4 h-4 text-[#a3a3a3]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#f5f5f5]">
                  {exercise.name}
                </h3>
                {exercise.notes && (
                  <p className="text-xs text-[#a3a3a3] mt-0.5">{exercise.notes}</p>
                )}
              </div>
            </div>

            {/* Sets table */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-4 gap-2 text-xs text-[#a3a3a3] px-1">
                <span>Set</span>
                <span>Reps</span>
                <span>Weight</span>
                <span>Unit</span>
              </div>
              {exercise.sets.map((set) => (
                <div
                  key={set.id}
                  className="grid grid-cols-4 gap-2 text-sm text-[#f5f5f5] bg-[#1f1f1f] rounded-lg px-3 py-2"
                >
                  <span className="text-[#a3a3a3]">{set.setNumber}</span>
                  <span>{set.targetReps ?? '—'}</span>
                  <span>{set.targetWeight ?? '—'}</span>
                  <span className="text-[#a3a3a3]">{set.unit}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Danger zone */}
      <div className="border border-danger/20 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-danger mb-3">Danger Zone</h3>
        {error && <p className="text-danger text-xs mb-2">{error}</p>}
        {deleteConfirm ? (
          <div className="flex items-center gap-2">
            <p className="text-sm text-[#a3a3a3] flex-1">
              Are you sure? This cannot be undone.
            </p>
            <Button
              variant="danger"
              size="sm"
              loading={deleting}
              onClick={handleDelete}
            >
              <Check className="w-4 h-4" />
              Confirm
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteConfirm(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
            Delete Workout
          </Button>
        )}
      </div>
    </div>
  )
}
