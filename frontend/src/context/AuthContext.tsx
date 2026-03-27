'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
  storeToken,
  getToken,
  removeToken,
  isTokenExpired,
} from '@/lib/auth'
import { User } from '@/types'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const fetchMe = useCallback(async (): Promise<User | null> => {
    try {
      const me = await api.get<User>('/api/auth/me')
      return me
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      const token = getToken()
      if (!token || isTokenExpired(token)) {
        removeToken()
        setIsLoading(false)
        return
      }

      const me = await fetchMe()
      if (me) {
        setUser(me)
      } else {
        removeToken()
      }
      setIsLoading(false)
    }

    init()
  }, [fetchMe])

  const login = useCallback(
    async (token: string) => {
      storeToken(token)
      const me = await fetchMe()
      if (me) {
        setUser(me)
      }
    },
    [fetchMe]
  )

  const logout = useCallback(() => {
    removeToken()
    setUser(null)
    router.push('/login')
  }, [router])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
