import { StyleSheet } from 'react-native';

export const colors = {
  // Backgrounds
  bg: '#0a0a0a',
  surface: '#141414',
  surfaceHover: '#1f1f1f',
  border: '#262626',

  // Text
  text: '#f5f5f5',
  textSecondary: '#a3a3a3',
  textMuted: '#525252',

  // Brand
  accent: '#6366f1',
  accentHover: '#4f46e5',
  accentLight: 'rgba(99,102,241,0.15)',

  // Status
  success: '#22c55e',
  successLight: 'rgba(34,197,94,0.15)',
  danger: '#ef4444',
  dangerLight: 'rgba(239,68,68,0.15)',
  warning: '#f59e0b',

  // Transparent
  overlay: 'rgba(0,0,0,0.6)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const typography = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
};

// Convenience alias — components can import `theme` or `colors` interchangeably
export const theme = {
  colors: {
    ...colors,
    primary: colors.accent,
    primaryHover: colors.accentHover,
    primaryLight: colors.accentLight,
  },
  spacing,
  radii,
  typography,
};

export const shadows = StyleSheet.create({
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});
