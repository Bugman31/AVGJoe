'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { WorkoutTemplate } from '@/types'
import ExerciseEditor, { ExerciseData } from '@/components/workouts/ExerciseEditor'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

let exerciseCounter = 0

function createExercise(orderIndex: number): ExerciseData {
  return {
    id: `new-${++exerciseCounter}`,
    name: '',
    notes: '',
    orderIndex,
    sets: [{ setNumber: 1, targetReps: null, targetWeight: null, unit: 'lbs' }],
  }
}

export default function NewWorkoutPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [exercises, setExercises] = useState<ExerciseData[]>([
    createExercise(0),
  ])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const addExercise = () => {
    setExercises((prev) => [...prev, createExercise(prev.length)])
  }

  const updateExercise = (index: number, updated: ExerciseData) => {
    setExercises((prev) => prev.map((e, i) => (i === index ? updated : e)))
  }

  const deleteExercise = (index: number) => {
    setExercises((prev) =>
      prev.filter((_, i) => i !== index).map((e, i) => ({ ...e, orderIndex: i }))
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Workout name is required')
      return
    }
    if (exercises.some((ex) => !ex.name.trim())) {
      setError('All exercises must have a name')
      return
    }

    setError('')
    setLoading(true)

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        exercises: exercises.map((ex, i) => ({
          name: ex.name.trim(),
          orderIndex: i,
          notes: ex.notes.trim() || null,
          sets: ex.sets.map((s) => ({
            setNumber: s.setNumber,
            targetReps: s.targetReps,
            targetWeight: s.targetWeight,
            unit: s.unit,
          })),
        })),
      }

      await api.post<WorkoutTemplate>('/api/workouts', payload)
      router.push('/workouts')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workout')
    } finally {
      setLoading(false)
    }
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
        <h1 className="text-xl font-bold text-[#f5f5f5]">New Workout</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Template info */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4 space-y-4">
          <Input
            label="Workout Name"
            placeholder="e.g. Push Day, Upper Body"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#a3a3a3]">
              Description (optional)
            </label>
            <textarea
              placeholder="Brief description of this workout..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="bg-[#1f1f1f] border border-[#2a2a2a] text-[#f5f5f5] placeholder:text-[#a3a3a3] focus:border-accent focus:outline-none rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>
        </div>

        {/* Exercises */}
        <div>
          <h2 className="text-sm font-semibold text-[#f5f5f5] mb-3">Exercises</h2>
          <div className="space-y-3">
            {exercises.map((exercise, index) => (
              <ExerciseEditor
                key={exercise.id || index}
                exercise={exercise}
                onChange={(updated) => updateExercise(index, updated)}
                onDelete={() => deleteExercise(index)}
              />
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={addExercise}
            className="w-full mt-3"
          >
            <Plus className="w-4 h-4" />
            Add Exercise
          </Button>
        </div>

        {error && (
          <p className="text-danger text-sm px-1">{error}</p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          className="w-full"
        >
          Save Workout
        </Button>
      </form>
    </div>
  )
}
