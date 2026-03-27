'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Navbar from '@/components/layout/Navbar'
import Spinner from '@/components/ui/Spinner'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <>
      <Navbar />
      <main className="md:ml-64 pb-20 md:pb-0 min-h-screen bg-[#0a0a0a]">
        {children}
      </main>
    </>
  )
}
