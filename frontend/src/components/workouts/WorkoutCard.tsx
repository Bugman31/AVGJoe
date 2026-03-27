'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Play, Dumbbell } from 'lucide-react'
import { WorkoutTemplate } from '@/types'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

interface WorkoutCardProps {
  workout: WorkoutTemplate
}

export default function WorkoutCard({ workout }: WorkoutCardProps) {
  const router = useRouter()

  const handleStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    router.push(`/workouts/${workout.id}/start`)
  }

  return (
    <Link href={`/workouts/${workout.id}`}>
      <Card className="flex flex-col gap-3 hover:bg-[#1f1f1f] transition-colors cursor-pointer h-full">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-[#f5f5f5] truncate">
                {workout.name}
              </h3>
              {workout.isAiGenerated && (
                <Badge variant="accent">AI</Badge>
              )}
            </div>
            {workout.description && (
              <p className="text-xs text-[#a3a3a3] mt-0.5 line-clamp-2">
                {workout.description}
              </p>
            )}
          </div>
          <div className="w-9 h-9 bg-[#1f1f1f] rounded-lg flex items-center justify-center flex-shrink-0">
            <Dumbbell className="w-4 h-4 text-[#a3a3a3]" />
          </div>
        </div>

        {/* Exercise count */}
        <p className="text-xs text-[#a3a3a3]">
          {workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''}
        </p>

        {/* Start button */}
        <Button
          variant="primary"
          size="sm"
          onClick={handleStart}
          className="w-full mt-auto"
        >
          <Play className="w-3.5 h-3.5" />
          Start
        </Button>
      </Card>
    </Link>
  )
}
