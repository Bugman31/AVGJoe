'use client'

import Link from 'next/link'
import { CheckCircle2, Dumbbell, ArrowRight } from 'lucide-react'
import { WorkoutTemplate } from '@/types'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

interface WorkoutPreviewProps {
  workout: WorkoutTemplate
}

export default function WorkoutPreview({ workout }: WorkoutPreviewProps) {
  return (
    <div className="space-y-4">
      {/* Saved banner */}
      <div className="flex items-center gap-2 px-4 py-3 bg-success/10 border border-success/30 rounded-xl text-success text-sm font-medium">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        Saved to My Workouts
      </div>

      {/* Workout card */}
      <Card>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Dumbbell className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-[#f5f5f5]">
                {workout.name}
              </h2>
              <Badge variant="accent">AI</Badge>
            </div>
            {workout.description && (
              <p className="text-sm text-[#a3a3a3] mt-1">{workout.description}</p>
            )}
            {workout.aiGoal && (
              <p className="text-xs text-[#a3a3a3] mt-1 italic">
                Goal: {workout.aiGoal}
              </p>
            )}
          </div>
        </div>

        {/* Exercises */}
        <div className="space-y-3">
          {workout.exercises.map((exercise, i) => (
            <div
              key={exercise.id || i}
              className="bg-[#1f1f1f] rounded-lg p-3"
            >
              <p className="text-sm font-semibold text-[#f5f5f5] mb-1">
                {exercise.name}
              </p>
              {exercise.notes && (
                <p className="text-xs text-[#a3a3a3] mb-2">{exercise.notes}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {exercise.sets.map((set, si) => (
                  <span
                    key={set.id || si}
                    className="text-xs bg-[#2a2a2a] text-[#a3a3a3] px-2 py-1 rounded"
                  >
                    Set {set.setNumber}:{' '}
                    {set.targetReps ?? '?'} reps
                    {set.unit !== 'bodyweight' && set.targetWeight
                      ? ` @ ${set.targetWeight} ${set.unit}`
                      : ''}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* CTA */}
      <Link href="/workouts">
        <Button variant="primary" size="lg" className="w-full">
          View in My Workouts
          <ArrowRight className="w-4 h-4" />
        </Button>
      </Link>
    </div>
  )
}
