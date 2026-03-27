'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import { WorkoutTemplate } from '@/types'
import WorkoutPreview from '@/components/ai/WorkoutPreview'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

const EQUIPMENT_OPTIONS = [
  { id: 'barbell', label: 'Barbell' },
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'machines', label: 'Machines' },
  { id: 'bodyweight', label: 'Bodyweight only' },
  { id: 'cables', label: 'Cables' },
]

export default function AIPage() {
  const router = useRouter()
  const [goal, setGoal] = useState('')
  const [fitnessLevel, setFitnessLevel] = useState('Intermediate')
  const [daysPerWeek, setDaysPerWeek] = useState('3')
  const [equipment, setEquipment] = useState<string[]>(['barbell', 'dumbbells'])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<WorkoutTemplate | null>(null)

  const toggleEquipment = (id: string) => {
    setEquipment((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!goal.trim()) {
      setError('Please describe your goal')
      return
    }
    setError('')
    setLoading(true)
    setResult(null)

    try {
      const data = await api.post<WorkoutTemplate>('/api/ai/generate', {
        goal: goal.trim(),
        fitnessLevel,
        daysPerWeek: Number(daysPerWeek),
        equipment,
      })
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI generation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#f5f5f5]">AI Workout Generator</h1>
          <p className="text-xs text-[#a3a3a3]">Powered by Claude</p>
        </div>
      </div>

      {/* Result */}
      {result ? (
        <div className="space-y-4">
          <WorkoutPreview workout={result} />
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              setResult(null)
              setGoal('')
            }}
            className="w-full"
          >
            Generate another
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Goal */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#a3a3a3]">
              What&apos;s your goal? <span className="text-danger">*</span>
            </label>
            <textarea
              placeholder="e.g. Build muscle and improve strength with 3 days per week. I want to focus on compound movements..."
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={4}
              required
              className="bg-[#1f1f1f] border border-[#2a2a2a] text-[#f5f5f5] placeholder:text-[#a3a3a3] focus:border-accent focus:outline-none rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>

          {/* Fitness level */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#a3a3a3]">
              Fitness Level
            </label>
            <select
              value={fitnessLevel}
              onChange={(e) => setFitnessLevel(e.target.value)}
              className="bg-[#1f1f1f] border border-[#2a2a2a] text-[#f5f5f5] focus:border-accent focus:outline-none rounded-lg px-3 py-2 text-sm"
            >
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>

          {/* Days per week */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#a3a3a3]">
              Days per week
            </label>
            <select
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(e.target.value)}
              className="bg-[#1f1f1f] border border-[#2a2a2a] text-[#f5f5f5] focus:border-accent focus:outline-none rounded-lg px-3 py-2 text-sm"
            >
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} days
                </option>
              ))}
            </select>
          </div>

          {/* Equipment */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#a3a3a3]">
              Available Equipment
            </label>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleEquipment(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    equipment.includes(opt.id)
                      ? 'bg-accent/10 border-accent/50 text-accent'
                      : 'border-[#2a2a2a] text-[#a3a3a3] hover:border-[#3a3a3a]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          {loading ? (
            <Card className="text-center py-10">
              <div className="flex flex-col items-center gap-4">
                {/* Skeleton lines */}
                <div className="w-full space-y-2">
                  <div className="h-3 bg-[#2a2a2a] rounded animate-pulse w-3/4 mx-auto" />
                  <div className="h-3 bg-[#2a2a2a] rounded animate-pulse w-1/2 mx-auto" />
                  <div className="h-3 bg-[#2a2a2a] rounded animate-pulse w-2/3 mx-auto" />
                </div>
                <div className="flex items-center gap-2 text-accent text-sm">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  Claude is designing your workout...
                </div>
              </div>
            </Card>
          ) : (
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
            >
              <Sparkles className="w-4 h-4" />
              Generate Workout
            </Button>
          )}
        </form>
      )}
    </div>
  )
}
