'use client'

import { useState, FormEvent, useEffect } from 'react'
import { ExternalLink, User, Key } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { User as UserType } from '@/types'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

export default function ProfilePage() {
  const { user } = useAuth()

  // Profile section
  const [name, setName] = useState(user?.name || '')
  const [profileLoading, setProfileLoading] = useState(false)

  // API key section
  const [apiKey, setApiKey] = useState('')
  const [keyLoading, setKeyLoading] = useState(false)

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

  const handleKeySave = async (e: FormEvent) => {
    e.preventDefault()
    if (!apiKey.trim()) {
      setKeyError('Please enter an API key')
      return
    }
    setKeyLoading(true)

    try {
      await api.put<UserType>('/api/auth/me', {
        anthropicApiKey: apiKey.trim(),
      })
      toast.success('API key saved!')
      setApiKey('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save key')
    } finally {
      setKeyLoading(false)
    }
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-[#f5f5f5] mb-6">Profile</h1>

      {/* User info */}
      <Card className="mb-5">
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

      {/* AI Settings */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
            <Key className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#f5f5f5]">AI Settings</p>
            <p className="text-xs text-[#a3a3a3]">
              Anthropic API key for AI workout generation
            </p>
          </div>
          {user?.hasAnthropicKey ? (
            <Badge variant="success">Using personal key</Badge>
          ) : (
            <Badge variant="default">Using shared key</Badge>
          )}
        </div>

        <p className="text-xs text-[#a3a3a3] mb-4">
          Add your own Anthropic API key to use AI workout generation with your
          own quota. Without a personal key, a shared key will be used (if
          available).
        </p>

        <form onSubmit={handleKeySave} className="space-y-4">
          <Input
            label="Anthropic API Key"
            type="password"
            placeholder="sk-ant-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />

          <a
            href="https://console.anthropic.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-accent hover:text-indigo-400 transition-colors"
          >
            Get your API key at console.anthropic.com
            <ExternalLink className="w-3 h-3" />
          </a>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={keyLoading}
          >
            Save API Key
          </Button>
        </form>
      </Card>
    </div>
  )
}
