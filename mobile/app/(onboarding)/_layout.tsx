import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/Spinner';

export default function OnboardingLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <Spinner fullScreen />;

  // If not authenticated, send to login
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  // If onboarding already complete, send to home
  if (user?.onboardingCompleted) return <Redirect href="/(app)/home" />;

  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
