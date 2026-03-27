'use client'

import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SetData {
  id?: string
  setNumber: number
  targetReps?: number | null
  targetWeight?: number | null
  actualReps?: number | null
  actualWeight?: number | null
  unit: string
}

interface SetRowProps {
  set: SetData
  onChange: (updated: SetData) => void
  onDelete: () => void
  mode?: 'edit' | 'log'
  completed?: boolean
}

export default function SetRow({
  set,
  onChange,
  onDelete,
  mode = 'edit',
  completed = false,
}: SetRowProps) {
  const inputClass = cn(
    'w-full bg-[#0a0a0a] border border-[#2a2a2a] text-[#f5f5f5] rounded-lg px-2 py-1.5 text-sm',
    'focus:border-accent focus:outline-none transition-colors',
    completed && 'opacity-60 cursor-not-allowed'
  )

  return (
    <div className={cn('flex items-center gap-2', completed && 'opacity-70')}>
      {/* Set number */}
      <span className="text-xs text-[#a3a3a3] w-6 text-center flex-shrink-0">
        {set.setNumber}
      </span>

      {/* Reps */}
      <div className="flex-1">
        <input
          type="number"
          min={0}
          placeholder="Reps"
          disabled={completed}
          value={
            mode === 'log'
              ? (set.actualReps ?? '')
              : (set.targetReps ?? '')
          }
          onChange={(e) => {
            const val = e.target.value === '' ? null : Number(e.target.value)
            if (mode === 'log') {
              onChange({ ...set, actualReps: val })
            } else {
              onChange({ ...set, targetReps: val })
            }
          }}
          className={inputClass}
        />
      </div>

      {/* Weight */}
      {set.unit !== 'bodyweight' && (
        <div className="flex-1">
          <input
            type="number"
            min={0}
            step={0.5}
            placeholder="Weight"
            disabled={completed}
            value={
              mode === 'log'
                ? (set.actualWeight ?? '')
                : (set.targetWeight ?? '')
            }
            onChange={(e) => {
              const val = e.target.value === '' ? null : Number(e.target.value)
              if (mode === 'log') {
                onChange({ ...set, actualWeight: val })
              } else {
                onChange({ ...set, targetWeight: val })
              }
            }}
            className={inputClass}
          />
        </div>
      )}

      {/* Unit */}
      <select
        value={set.unit}
        disabled={completed}
        onChange={(e) => onChange({ ...set, unit: e.target.value })}
        className={cn(
          'bg-[#0a0a0a] border border-[#2a2a2a] text-[#a3a3a3] rounded-lg px-2 py-1.5 text-xs',
          'focus:border-accent focus:outline-none transition-colors',
          completed && 'opacity-60 cursor-not-allowed'
        )}
      >
        <option value="lbs">lbs</option>
        <option value="kg">kg</option>
        <option value="bodyweight">BW</option>
      </select>

      {/* Delete */}
      {!completed && (
        <button
          type="button"
          onClick={onDelete}
          className="text-[#a3a3a3] hover:text-danger transition-colors flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
