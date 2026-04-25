import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/Spinner';
import { useTheme } from '@/context/ThemeContext';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { useWelcomeGate } from '@/hooks/useWelcomeGate';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused }: { name: IoniconsName; focused: boolean }) {
  const { colors } = useTheme();
  return (
    <Ionicons
      name={focused ? name : (`${name}-outline` as IoniconsName)}
      size={24}
      color={focused ? colors.accent : colors.textSecondary}
    />
  );
}

function FloatingTabBarBackground() {
  const { isDark } = useTheme();
  return (
    <BlurView
      intensity={75}
      tint={isDark ? 'dark' : 'light'}
      style={StyleSheet.absoluteFill}
    />
  );
}

export default function AppLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { colors, isDark } = useTheme();
  const { isChecking, shouldShowWelcome } = useWelcomeGate();

  if (isLoading || isChecking) return <Spinner fullScreen />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (user?.onboardingCompleted === false) return <Redirect href="/(onboarding)/" />;
  if (shouldShowWelcome) return <Redirect href="/welcome" />;

  // Semi-transparent fallback for Android (BlurView less reliable there)
  const tabBarBg = Platform.OS === 'android'
    ? (isDark ? 'rgba(18,18,18,0.92)' : 'rgba(255,255,255,0.92)')
    : 'transparent';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 24,
          left: 20,
          right: 20,
          height: 70,
          borderRadius: 32,
          backgroundColor: tabBarBg,
          borderTopWidth: 0,
          // iOS shadow / glow
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.5 : 0.18,
          shadowRadius: 16,
          // Android elevation
          elevation: 20,
          overflow: 'hidden',
        },
        tabBarBackground: Platform.OS === 'ios' ? () => <FloatingTabBarBackground /> : undefined,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
        tabBarItemStyle: { paddingTop: 6, paddingBottom: 6 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
          headerShown: true,
          header: () => <BrandHeader />,
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Workout',
          tabBarIcon: ({ focused }) => <TabIcon name="barbell" focused={focused} />,
          headerShown: true,
          header: () => <BrandHeader />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ focused }) => <TabIcon name="trending-up" focused={focused} />,
          headerShown: true,
          header: () => <BrandHeader />,
        }}
      />
      <Tabs.Screen
        name="program"
        options={{
          title: 'Program',
          tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} />,
          headerShown: true,
          header: () => <BrandHeader />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} />,
          headerShown: true,
          header: () => <BrandHeader />,
        }}
      />
      {/* Hidden routes — accessible from within screens, not tab bar */}
      <Tabs.Screen name="programs" options={{ href: null }} />
      <Tabs.Screen name="library" options={{ href: null }} />
      <Tabs.Screen name="exercise" options={{ href: null }} />
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      <Tabs.Screen name="ai" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="body" options={{ href: null }} />
    </Tabs>
  );
}
