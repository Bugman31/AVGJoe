import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/Spinner';

export default function AuthLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <Spinner fullScreen />;

  // Redirect authenticated users away from auth screens
  if (isAuthenticated) {
    if (user?.onboardingCompleted === false) {
      return <Redirect href="/(onboarding)/" />;
    }
    return <Redirect href="/(app)/home" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0a0a0a' },
      }}
    />
  );
}
