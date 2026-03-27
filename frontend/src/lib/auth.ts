const KEY = 'avgjoe_jwt'

export function storeToken(token: string) {
  localStorage.setItem(KEY, token)
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(KEY)
}

export function removeToken() {
  localStorage.removeItem(KEY)
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}
