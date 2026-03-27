'use client'

import { GripVertical, Trash2, Plus } from 'lucide-react'
import SetRow, { SetData } from './SetRow'
import Button from '@/components/ui/Button'

export interface ExerciseData {
  id?: string
  name: string
  notes: string
  orderIndex: number
  sets: SetData[]
}

interface ExerciseEditorProps {
  exercise: ExerciseData
  onChange: (updated: ExerciseData) => void
  onDelete: () => void
}

export default function ExerciseEditor({
  exercise,
  onChange,
  onDelete,
}: ExerciseEditorProps) {
  const addSet = () => {
    const lastSet = exercise.sets[exercise.sets.length - 1]
    const newSet: SetData = {
      setNumber: exercise.sets.length + 1,
      targetReps: lastSet?.targetReps ?? null,
      targetWeight: lastSet?.targetWeight ?? null,
      unit: lastSet?.unit ?? 'lbs',
    }
    onChange({ ...exercise, sets: [...exercise.sets, newSet] })
  }

  const updateSet = (index: number, updated: SetData) => {
    const sets = exercise.sets.map((s, i) => (i === index ? updated : s))
    onChange({ ...exercise, sets })
  }

  const deleteSet = (index: number) => {
    const sets = exercise.sets
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, setNumber: i + 1 }))
    onChange({ ...exercise, sets })
  }

  return (
    <div className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-xl p-4">
      {/* Exercise header */}
      <div className="flex items-start gap-2 mb-3">
        <GripVertical className="w-5 h-5 text-[#a3a3a3] mt-2 flex-shrink-0 cursor-grab" />
        <div className="flex-1 space-y-2">
          <input
            type="text"
            placeholder="Exercise name"
            value={exercise.name}
            onChange={(e) => onChange({ ...exercise, name: e.target.value })}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-[#f5f5f5] placeholder:text-[#a3a3a3] rounded-lg px-3 py-2 text-sm font-medium focus:border-accent focus:outline-none"
          />
          <input
            type="text"
            placeholder="Notes (optional)"
            value={exercise.notes}
            onChange={(e) => onChange({ ...exercise, notes: e.target.value })}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-[#f5f5f5] placeholder:text-[#a3a3a3] rounded-lg px-3 py-2 text-xs focus:border-accent focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="text-[#a3a3a3] hover:text-danger transition-colors mt-2 flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Set header labels */}
      {exercise.sets.length > 0 && (
        <div className="flex items-center gap-2 mb-2 px-0">
          <span className="w-6" />
          <span className="flex-1 text-xs text-[#a3a3a3] text-center">Reps</span>
          <span className="flex-1 text-xs text-[#a3a3a3] text-center">Weight</span>
          <span className="w-16 text-xs text-[#a3a3a3] text-center">Unit</span>
          <span className="w-4" />
        </div>
      )}

      {/* Sets */}
      <div className="space-y-2 mb-3">
        {exercise.sets.map((set, index) => (
          <SetRow
            key={index}
            set={set}
            onChange={(updated) => updateSet(index, updated)}
            onDelete={() => deleteSet(index)}
            mode="edit"
          />
        ))}
      </div>

      {/* Add set */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addSet}
        className="w-full"
      >
        <Plus className="w-4 h-4" />
        Add Set
      </Button>
    </div>
  )
}
