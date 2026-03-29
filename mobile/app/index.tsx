import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/Spinner';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Spinner fullScreen />;
  if (isAuthenticated) return <Redirect href="/(app)/dashboard" />;
  return <Redirect href="/(auth)/login" />;
}
