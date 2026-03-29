import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setAuthExpiredCallback } from '@/lib/api';
import { storeToken, removeToken } from '@/lib/auth';
import { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData?: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    await removeToken();
    setUser(null);
  }, []);

  // Register the auth-expired callback so api.ts can trigger logout
  useEffect(() => {
    setAuthExpiredCallback(logout);
  }, [logout]);

  // On mount, attempt to restore session
  useEffect(() => {
    async function restoreSession() {
      try {
        const response = await api.get<{ user: User }>('/api/auth/me');
        setUser(response.user);
      } catch {
        // Token missing, expired, or invalid — stay logged out
        await removeToken();
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  const login = useCallback(async (token: string, userData?: User) => {
    await storeToken(token);
    if (userData) {
      setUser(userData);
    } else {
      const response = await api.get<{ user: User }>('/api/auth/me');
      setUser(response.user);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
