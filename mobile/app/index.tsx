import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/Spinner';
import { useWelcomeGate } from '@/hooks/useWelcomeGate';

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { isChecking, shouldShowWelcome } = useWelcomeGate();

  if (isLoading || isChecking) return <Spinner fullScreen />;

  if (isAuthenticated) {
    if (user?.onboardingCompleted === false) {
      return <Redirect href="/(onboarding)/" />;
    }
    if (shouldShowWelcome) {
      return <Redirect href="/welcome" />;
    }
    return <Redirect href="/(app)/home" />;
  }

  return <Redirect href="/(auth)/login" />;
}
