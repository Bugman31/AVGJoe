'use client'

import { useState, FormEvent, useEffect } from 'react'
import { User } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { User as UserType } from '@/types'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

export default function ProfilePage() {
  const { user } = useAuth()

  const [name, setName] = useState(user?.name || '')
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    if (user?.name) setName(user.name)
  }, [user])

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault()
    setProfileLoading(true)

    try {
      await api.put<UserType>('/api/auth/me', { name: name.trim() || null })
      toast.success('Profile saved!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setProfileLoading(false)
    }
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-[#f5f5f5] mb-6">Profile</h1>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#f5f5f5]">
              {user?.name || 'Anonymous'}
            </p>
            <p className="text-xs text-[#a3a3a3]">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-4">
          <Input
            label="Display Name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            value={user?.email || ''}
            readOnly
            className="opacity-60 cursor-not-allowed"
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={profileLoading}
          >
            Save Profile
          </Button>
        </form>
      </Card>
    </div>
  )
}
