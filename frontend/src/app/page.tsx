'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Spinner from '@/components/ui/Spinner'

export default function RootPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/dashboard')
      } else {
        router.replace('/login')
      }
    }
  }, [isAuthenticated, isLoading, router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )
}
