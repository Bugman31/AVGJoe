import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/Spinner';

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <Spinner fullScreen />;

  if (isAuthenticated) {
    if (user?.onboardingCompleted === false) {
      return <Redirect href="/(onboarding)/" />;
    }
    return <Redirect href="/(app)/home" />;
  }

  return <Redirect href="/(auth)/login" />;
}
