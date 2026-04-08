import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as darkColorsBase } from '@/lib/theme';

const THEME_STORAGE_KEY = 'theme_mode';

export const darkColors = {
  bg: '#0a0a0a',
  surface: '#141414',
  surfaceHover: '#1f1f1f',
  border: '#262626',
  text: '#f5f5f5',
  textSecondary: '#a3a3a3',
  textMuted: '#525252',
  accent: '#6366f1',
  accentHover: '#4f46e5',
  accentLight: 'rgba(99,102,241,0.15)',
  success: '#22c55e',
  successLight: 'rgba(34,197,94,0.15)',
  danger: '#ef4444',
  dangerLight: 'rgba(239,68,68,0.15)',
  warning: '#f59e0b',
  overlay: 'rgba(0,0,0,0.5)',
};

export const lightColors = {
  bg: '#f5f5f5',
  surface: '#ffffff',
  surfaceHover: '#ebebeb',
  border: '#d4d4d4',
  text: '#0a0a0a',
  textSecondary: '#525252',
  textMuted: '#a3a3a3',
  accent: '#6366f1',
  accentHover: '#4f46e5',
  accentLight: 'rgba(99,102,241,0.15)',
  success: '#22c55e',
  successLight: 'rgba(34,197,94,0.15)',
  danger: '#ef4444',
  dangerLight: 'rgba(239,68,68,0.15)',
  warning: '#f59e0b',
  overlay: 'rgba(0,0,0,0.5)',
};

export type ThemeMode = 'dark' | 'light' | 'system';

type ThemeColors = typeof darkColors;

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  isDark: true,
  colors: darkColors,
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        setModeState(saved);
      }
      setIsLoaded(true);
    });
  }, []);

  function setMode(newMode: ThemeMode) {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
  }

  const isDark =
    mode === 'system' ? systemColorScheme !== 'light' : mode === 'dark';

  const colors: ThemeColors = isDark ? darkColors : lightColors;

  if (!isLoaded) {
    // Render with default dark until preference is loaded to avoid flash
    return (
      <ThemeContext.Provider value={{ mode, isDark: true, colors: darkColors, setMode }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
