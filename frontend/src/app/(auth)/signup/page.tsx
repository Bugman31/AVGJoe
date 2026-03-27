'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

interface SignupResponse {
  token: string
}

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { token } = await api.post<SignupResponse>('/api/auth/signup', {
        name: name || undefined,
        email,
        password,
      })
      await login(token)
      router.replace('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="Average Joe's Gym" width={72} height={72} className="rounded-2xl mb-3" />
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Average Joe&apos;s</h1>
          <p className="text-[#a3a3a3] text-sm mt-0.5">Workout Tracker</p>
          <p className="text-[#a3a3a3] text-sm mt-2">Create your account</p>
        </div>

        {/* Card */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6">
          {error && (
            <div className="mb-4 px-3 py-2.5 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Name (optional)"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="Min 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
            >
              Create account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-[#a3a3a3] mt-4">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-accent hover:text-indigo-400 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
