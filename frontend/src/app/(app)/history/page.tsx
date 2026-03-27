'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Clock } from 'lucide-react'
import { api } from '@/lib/api'
import { WorkoutSession } from '@/types'
import SessionCard from '@/components/history/SessionCard'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import Card from '@/components/ui/Card'

const PAGE_SIZE = 10

export default function HistoryPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const raw = await api.get<{ sessions: WorkoutSession[]; total: number } | WorkoutSession[]>(
          `/api/sessions?limit=${PAGE_SIZE}&offset=0`
        )
        const data = Array.isArray(raw) ? raw : (raw as any).sessions ?? []
        setSessions(data)
        setHasMore(data.length === PAGE_SIZE)
        setOffset(data.length)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history')
      } finally {
        setLoading(false)
      }
    }
    fetchSessions()
  }, [])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const raw = await api.get<{ sessions: WorkoutSession[] } | WorkoutSession[]>(
        `/api/sessions?limit=${PAGE_SIZE}&offset=${offset}`
      )
      const data = Array.isArray(raw) ? raw : (raw as any).sessions ?? []
      setSessions((prev) => [...prev, ...data])
      setHasMore(data.length === PAGE_SIZE)
      setOffset((prev) => prev + data.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more')
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Clock className="w-5 h-5 text-[#a3a3a3]" />
        <h1 className="text-xl font-bold text-[#f5f5f5]">Workout History</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <Card className="text-center py-8">
          <p className="text-danger text-sm">{error}</p>
        </Card>
      ) : sessions.length === 0 ? (
        <Card className="flex flex-col items-center py-16 gap-3">
          <Clock className="w-12 h-12 text-[#2a2a2a]" />
          <p className="text-[#a3a3a3]">No sessions yet.</p>
          <Link href="/workouts" className="text-accent text-sm hover:text-indigo-400">
            Start your first workout
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Link key={session.id} href={`/history/${session.id}`}>
              <SessionCard session={session} />
            </Link>
          ))}

          {hasMore && (
            <Button
              variant="ghost"
              size="md"
              loading={loadingMore}
              onClick={loadMore}
              className="w-full"
            >
              Load more
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
