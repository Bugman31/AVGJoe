import { getToken, removeToken, isTokenExpired } from './auth'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Fired when any request returns 401 — AuthContext listens and logs the user out cleanly
export const AUTH_EXPIRED_EVENT = 'avgjoe:auth-expired'

let authExpiredFired = false

function handleAuthExpired() {
  removeToken()
  if (!authExpiredFired) {
    authExpiredFired = true
    // Use event so all in-flight requests collapse into one logout, not a race of redirects
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    // Reset flag after a tick so subsequent fresh 401s (after re-login) still fire
    setTimeout(() => { authExpiredFired = false }, 2000)
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()

  // Proactively reject expired tokens before making a network call
  if (token && isTokenExpired(token)) {
    handleAuthExpired()
    throw new Error('Session expired. Please sign in again.')
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    if (token) {
      // Only treat as expired session if we actually sent a token
      handleAuthExpired()
      throw new Error('Session expired. Please sign in again.')
    }
    // No token means this is a login/auth failure — pass through the real error
    const err = await res.json().catch(() => ({ error: 'Unauthorized' }))
    throw new Error(err.error || 'Unauthorized')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || 'Request failed')
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
