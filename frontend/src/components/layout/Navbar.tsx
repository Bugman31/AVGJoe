'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Dumbbell,
  Sparkles,
  Clock,
  User,
  LogOut,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/workouts', label: 'Workouts', icon: Dumbbell },
  { href: '/ai', label: 'AI', icon: Sparkles },
  { href: '/history', label: 'History', icon: Clock },
  { href: '/profile', label: 'Profile', icon: User },
]

export default function Navbar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      {/* Mobile bottom navbar */}
      <nav className="fixed bottom-0 left-0 right-0 w-full bg-[#141414] border-t border-[#2a2a2a] flex justify-around py-2 z-50 md:hidden">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors',
              isActive(href) ? 'text-accent' : 'text-[#a3a3a3]'
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs">{label}</span>
          </Link>
        ))}
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-[#141414] border-r border-[#2a2a2a] flex-col z-50">
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5 border-b border-[#2a2a2a]">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-[#f5f5f5]">AVGJoe</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium',
                isActive(href)
                  ? 'bg-accent/10 text-accent'
                  : 'text-[#a3a3a3] hover:bg-[#1f1f1f] hover:text-[#f5f5f5]'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
        </nav>

        {/* User + logout */}
        <div className="px-3 py-4 border-t border-[#2a2a2a]">
          {user && (
            <div className="px-3 py-2 mb-1">
              <p className="text-sm font-medium text-[#f5f5f5] truncate">
                {user.name || user.email}
              </p>
              <p className="text-xs text-[#a3a3a3] truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-[#a3a3a3] hover:bg-[#1f1f1f] hover:text-danger transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
