import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { AuthProvider } from '@/context/AuthContext';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';

function InnerLayout() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
      <Toast />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <OnboardingProvider>
            <InnerLayout />
          </OnboardingProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
