import { CheckCircle2, Clock, ChevronRight } from 'lucide-react'
import { WorkoutSession } from '@/types'
import { formatDate, formatDuration } from '@/lib/utils'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

interface SessionCardProps {
  session: WorkoutSession
}

export default function SessionCard({ session }: SessionCardProps) {
  const uniqueExercises = new Set(session.sets.map((s) => s.exerciseName))

  return (
    <Card className="flex items-center justify-between hover:bg-[#1f1f1f] transition-colors cursor-pointer">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="text-sm font-semibold text-[#f5f5f5] truncate">
            {session.name}
          </p>
          {session.completedAt ? (
            <Badge variant="success">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Done
            </Badge>
          ) : (
            <Badge variant="default">In Progress</Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-[#a3a3a3]">
          <span>{formatDate(session.startedAt)}</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(session.startedAt, session.completedAt)}
          </span>
        </div>

        <p className="text-xs text-[#a3a3a3] mt-1">
          {session.sets.length} sets · {uniqueExercises.size} exercise
          {uniqueExercises.size !== 1 ? 's' : ''}
        </p>
      </div>

      <ChevronRight className="w-4 h-4 text-[#a3a3a3] flex-shrink-0 ml-2" />
    </Card>
  )
}
