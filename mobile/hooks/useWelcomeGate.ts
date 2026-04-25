import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getWelcomeDecision, getWelcomeVariant, type WelcomeVariant } from '@/lib/welcome';

interface WelcomeGateState {
  isChecking: boolean;
  shouldShowWelcome: boolean;
  variant: WelcomeVariant;
}

export function useWelcomeGate(): WelcomeGateState {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [state, setState] = useState<WelcomeGateState>({
    isChecking: true,
    shouldShowWelcome: false,
    variant: 'updates',
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (isLoading) {
        if (!cancelled) {
          setState((prev) => ({ ...prev, isChecking: true }));
        }
        return;
      }

      if (!isAuthenticated || !user || user.onboardingCompleted === false) {
        if (!cancelled) {
          setState({
            isChecking: false,
            shouldShowWelcome: false,
            variant: getWelcomeVariant(user),
          });
        }
        return;
      }

      const decision = await getWelcomeDecision(user);
      if (!cancelled) {
        setState({
          isChecking: false,
          shouldShowWelcome: decision.shouldShow,
          variant: decision.variant,
        });
      }
    }

    load().catch(() => {
      if (!cancelled) {
        setState({
          isChecking: false,
          shouldShowWelcome: false,
          variant: getWelcomeVariant(user),
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, user]);

  return state;
}
