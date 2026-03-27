'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useWorkouts } from '@/hooks/useWorkouts'
import WorkoutCard from '@/components/workouts/WorkoutCard'
import Spinner from '@/components/ui/Spinner'
import Card from '@/components/ui/Card'

export default function WorkoutsPage() {
  const { workouts, isLoading, error } = useWorkouts()

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#f5f5f5]">My Workouts</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <Card className="text-center py-8">
          <p className="text-danger text-sm">{error}</p>
        </Card>
      ) : workouts.length === 0 ? (
        <Card className="flex flex-col items-center py-16 gap-3">
          <p className="text-[#a3a3a3]">No workout templates yet.</p>
          <Link
            href="/workouts/new"
            className="text-accent hover:text-indigo-400 text-sm transition-colors"
          >
            Create your first workout
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </div>
      )}

      {/* Floating + button */}
      <Link
        href="/workouts/new"
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 w-12 h-12 bg-accent hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg transition-colors z-40"
        aria-label="New workout"
      >
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  )
}
