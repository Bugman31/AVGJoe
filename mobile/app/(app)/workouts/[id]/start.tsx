import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api';
import { useSession } from '@/hooks/useSession';
import type { WorkoutTemplate } from '@/types';

export default function StartWorkoutRedirectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { startSession } = useSession();

  useEffect(() => {
    let cancelled = false;

    async function redirectToActiveWorkout() {
      if (!id) {
        router.replace('/(app)/home');
        return;
      }

      try {
        const res = await api.get<{ template: WorkoutTemplate }>(`/api/workouts/${id}`);
        const session = await startSession(id, res.template.name);
        if (!cancelled) {
          router.replace(`/(app)/workouts/active/${session.id}`);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to start session';
          Toast.show({ type: 'error', text1: 'Failed to start session', text2: message });
          router.replace('/(app)/home');
        }
      }
    }

    void redirectToActiveWorkout();

    return () => {
      cancelled = true;
    };
  }, [id, router, startSession]);

  return <Spinner fullScreen />;
}
