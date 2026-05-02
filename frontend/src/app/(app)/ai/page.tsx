'use client'

import { Smartphone } from 'lucide-react'
import Card from '@/components/ui/Card'

export default function AiPage() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-[#f5f5f5] mb-6">AI Workout Generator</h1>
      <Card>
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="w-14 h-14 bg-accent/10 rounded-full flex items-center justify-center">
            <Smartphone className="w-7 h-7 text-accent" />
          </div>
          <p className="text-[#f5f5f5] font-semibold">Available on iOS</p>
          <p className="text-sm text-[#a3a3a3] max-w-xs">
            AI workout generation uses Apple Intelligence and is available in the Average Joe&apos;s iOS app on iPhone 15 Pro or later running iOS 18.1+.
          </p>
        </div>
      </Card>
    </div>
  )
}
