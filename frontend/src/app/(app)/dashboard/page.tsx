'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Sparkles, Clock, ChevronRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useWorkouts } from '@/hooks/useWorkouts'
import { api } from '@/lib/api'
import { WorkoutSession } from '@/types'
import { formatDate, formatDuration } from '@/lib/utils'
import WorkoutCard from '@/components/workouts/WorkoutCard'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { workouts, isLoading: workoutsLoading } = useWorkouts()
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await api.get<{ sessions: WorkoutSession[] } | WorkoutSession[]>('/api/sessions?limit=5')
        setSessions(Array.isArray(data) ? data : (data as any).sessions ?? [])
      } catch {
        // ignore
      } finally {
        setSessionsLoading(false)
      }
    }
    fetchSessions()
  }, [])

  const displayName = user?.name || user?.email?.split('@')[0] || 'there'

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[#a3a3a3] text-sm">{getGreeting()},</p>
        <h1 className="text-2xl font-bold text-[#f5f5f5] mt-0.5">{displayName}</h1>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <Link href="/workouts/new">
          <Card className="flex flex-col items-center gap-2 py-4 cursor-pointer hover:bg-[#1f1f1f] transition-colors text-center">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-accent" />
            </div>
            <span className="text-xs font-medium text-[#f5f5f5]">New Workout</span>
          </Card>
        </Link>
        <Link href="/ai">
          <Card className="flex flex-col items-center gap-2 py-4 cursor-pointer hover:bg-[#1f1f1f] transition-colors text-center">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent" />
            </div>
            <span className="text-xs font-medium text-[#f5f5f5]">AI Generate</span>
          </Card>
        </Link>
        <Link href="/history">
          <Card className="flex flex-col items-center gap-2 py-4 cursor-pointer hover:bg-[#1f1f1f] transition-colors text-center">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-accent" />
            </div>
            <span className="text-xs font-medium text-[#f5f5f5]">View History</span>
          </Card>
        </Link>
      </div>

      {/* Recent Sessions */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-[#f5f5f5]">Recent Sessions</h2>
          <Link href="/history" className="text-sm text-accent hover:text-indigo-400 flex items-center gap-0.5">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {sessionsLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : sessions.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-[#a3a3a3] text-sm">No sessions yet. Start your first workout!</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <Link key={session.id} href={`/history/${session.id}`}>
                <Card className="flex items-center justify-between hover:bg-[#1f1f1f] transition-colors cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-[#f5f5f5]">{session.name}</p>
                    <p className="text-xs text-[#a3a3a3] mt-0.5">
                      {formatDate(session.startedAt)} · {formatDuration(session.startedAt, session.completedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#a3a3a3]">
                      {session.sets.length} sets
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#a3a3a3]" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* My Workouts */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-[#f5f5f5]">My Workouts</h2>
          <Link href="/workouts" className="text-sm text-accent hover:text-indigo-400 flex items-center gap-0.5">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {workoutsLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : workouts.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-[#a3a3a3] text-sm">No workouts yet.</p>
            <Link href="/workouts/new" className="text-accent text-sm hover:text-indigo-400 mt-1 inline-block">
              Create your first workout
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {workouts.slice(0, 4).map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
