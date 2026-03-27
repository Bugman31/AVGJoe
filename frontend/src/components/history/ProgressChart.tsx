'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from 'recharts'
import { api } from '@/lib/api'
import { ProgressDataPoint } from '@/types'
import { formatDate } from '@/lib/utils'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'

interface ProgressChartProps {
  exerciseId: string
  exerciseName: string
}

interface TooltipPayload {
  payload?: {
    maxWeight: number
    isPR: boolean
    date: string
  }
}

function CustomDot(props: {
  cx?: number
  cy?: number
  payload?: { isPR: boolean }
}) {
  const { cx, cy, payload } = props
  if (cx === undefined || cy === undefined) return null
  if (payload?.isPR) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill="#ef4444"
        stroke="#0a0a0a"
        strokeWidth={2}
      />
    )
  }
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="#6366f1"
      stroke="#0a0a0a"
      strokeWidth={2}
    />
  )
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.[0]?.payload) return null
  const data = payload[0].payload
  return (
    <div className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs">
      <p className="text-[#a3a3a3]">{formatDate(data.date)}</p>
      <p className="text-[#f5f5f5] font-medium">{data.maxWeight} lbs</p>
      {data.isPR && (
        <p className="text-danger font-semibold">Personal Record!</p>
      )}
    </div>
  )
}

export default function ProgressChart({
  exerciseId,
  exerciseName,
}: ProgressChartProps) {
  const [data, setData] = useState<ProgressDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetch = async () => {
      try {
        const raw = await api.get<{ progress: ProgressDataPoint[] } | ProgressDataPoint[]>(
          `/api/sessions/progress/${exerciseId}`
        )
        const points = Array.isArray(raw) ? raw : (raw as any).progress ?? []
        setData(points)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load progress')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [exerciseId])

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner size="sm" />
      </div>
    )
  }

  if (error || data.length < 2) {
    return null // Not enough data to show chart
  }

  const chartData = data.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    fullDate: d.date,
  }))

  const prCount = data.filter((d) => d.isPR).length

  return (
    <Card padding={false} className="p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-[#a3a3a3]">
          {exerciseName} Progress
        </p>
        {prCount > 0 && (
          <span className="text-xs text-danger font-medium">
            {prCount} PR{prCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#2a2a2a"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: '#a3a3a3', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#a3a3a3', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="maxWeight"
            stroke="#6366f1"
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 6, fill: '#6366f1' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
