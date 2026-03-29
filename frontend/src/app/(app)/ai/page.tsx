'use client'

import { useState, FormEvent } from 'react'
import { Sparkles, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { AiProgram, WorkoutTemplate } from '@/types'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

const EQUIPMENT_OPTIONS = [
  { id: 'barbell', label: 'Barbell' },
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'machines', label: 'Machines' },
  { id: 'bodyweight', label: 'Bodyweight only' },
  { id: 'cables', label: 'Cables' },
]

function WorkoutCard({ workout }: { workout: WorkoutTemplate }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#252525] transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-[#f5f5f5]">{workout.name}</span>
          {workout.dayOfWeek && (
            <Badge variant="default">{workout.dayOfWeek}</Badge>
          )}
          <span className="text-xs text-[#a3a3a3]">
            {workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''}
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-[#a3a3a3]" /> : <ChevronDown className="w-4 h-4 text-[#a3a3a3]" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {workout.description && (
            <p className="text-xs text-[#a3a3a3]">{workout.description}</p>
          )}
          {workout.exercises.map((ex, i) => (
            <div key={ex.id || i} className="bg-[#141414] rounded-lg p-3">
              <p className="text-sm font-semibold text-[#f5f5f5] mb-1">{ex.name}</p>
              {ex.notes && <p className="text-xs text-[#a3a3a3] mb-2">{ex.notes}</p>}
              <div className="flex flex-wrap gap-1.5">
                {ex.sets.map((s, si) => (
                  <span key={s.id || si} className="text-xs bg-[#2a2a2a] text-[#a3a3a3] px-2 py-1 rounded">
                    Set {s.setNumber}: {s.targetReps ?? '?'} reps
                    {s.unit !== 'bodyweight' && s.targetWeight ? ` @ ${s.targetWeight} ${s.unit}` : ''}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProgramPreview({ program }: { program: AiProgram }) {
  // Group workouts by week
  const weeks: Record<number, WorkoutTemplate[]> = {}
  for (const t of program.templates) {
    const w = t.weekNumber ?? 1
    if (!weeks[w]) weeks[w] = []
    weeks[w].push(t)
  }
  const weekNumbers = Object.keys(weeks).map(Number).sort((a, b) => a - b)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="px-4 py-3 bg-success/10 border border-success/30 rounded-xl flex items-center gap-2 text-success text-sm font-medium">
        <Sparkles className="w-4 h-4 flex-shrink-0" />
        {program.templates.length} workouts saved to My Workouts
      </div>

      <Card>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-[#f5f5f5]">{program.programName}</h2>
              <Badge variant="accent">AI · {program.totalWeeks} weeks</Badge>
            </div>
            {program.programDescription && (
              <p className="text-sm text-[#a3a3a3] mt-1">{program.programDescription}</p>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {weekNumbers.map((week) => (
            <div key={week}>
              <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-2">
                Week {week}
              </p>
              <div className="space-y-2">
                {weeks[week]
                  .sort((a, b) => {
                    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
                    return days.indexOf(a.dayOfWeek ?? '') - days.indexOf(b.dayOfWeek ?? '')
                  })
                  .map((w) => (
                    <WorkoutCard key={w.id} workout={w} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Link href="/workouts">
        <Button variant="primary" size="lg" className="w-full">
          View All in My Workouts
        </Button>
      </Link>
    </div>
  )
}

export default function AIPage() {
  const [goal, setGoal] = useState('')
  const [fitnessLevel, setFitnessLevel] = useState('Intermediate')
  const [daysPerWeek, setDaysPerWeek] = useState('3')
  const [equipment, setEquipment] = useState<string[]>(['barbell', 'dumbbells'])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<AiProgram | null>(null)

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
      const raw = await api.post<{ program: AiProgram } | AiProgram>('/api/ai/generate', {
        goal: goal.trim(),
        fitnessLevel,
        daysPerWeek: Number(daysPerWeek),
        equipment: equipment.length ? equipment.join(', ') : undefined,
      })
      const program = (raw as { program: AiProgram }).program ?? (raw as AiProgram)
      setResult(program)
      toast.success(`${program.templates.length} workouts generated!`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI generation failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#f5f5f5]">AI Workout Generator</h1>
          <p className="text-xs text-[#a3a3a3]">Generates a full multi-week program · Powered by Claude</p>
        </div>
      </div>

      {result ? (
        <div className="space-y-4">
          <ProgramPreview program={result} />
          <Button variant="ghost" size="md" onClick={() => { setResult(null); setGoal('') }} className="w-full">
            Generate another program
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
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

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#a3a3a3]">Fitness Level</label>
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

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#a3a3a3]">Days per week</label>
            <select
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(e.target.value)}
              className="bg-[#1f1f1f] border border-[#2a2a2a] text-[#f5f5f5] focus:border-accent focus:outline-none rounded-lg px-3 py-2 text-sm"
            >
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n} days</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#a3a3a3]">Available Equipment</label>
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
                <div className="w-full space-y-2">
                  <div className="h-3 bg-[#2a2a2a] rounded animate-pulse w-3/4 mx-auto" />
                  <div className="h-3 bg-[#2a2a2a] rounded animate-pulse w-1/2 mx-auto" />
                  <div className="h-3 bg-[#2a2a2a] rounded animate-pulse w-2/3 mx-auto" />
                </div>
                <div className="flex items-center gap-2 text-accent text-sm">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  Claude is designing your multi-week program...
                </div>
              </div>
            </Card>
          ) : (
            <Button type="submit" variant="primary" size="lg" className="w-full">
              <Sparkles className="w-4 h-4" />
              Generate Workout Program
            </Button>
          )}
        </form>
      )}
    </div>
  )
}
