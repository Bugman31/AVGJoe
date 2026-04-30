import * as SecureStore from 'expo-secure-store';
import type { User } from '@/types';

export type WelcomeVariant = 'intro' | 'updates' | 'reviewer';

export const WELCOME_RELEASE_ID = '2026-04-30.mobile.welcome-v2';
export const WELCOME_RELEASED_AT = '2026-04-30T00:00:00.000Z';
export const REVIEWER_EMAILS = ['reviewer@avgjoe.com'] as const;
export const REVIEWER_EMAIL = REVIEWER_EMAILS[0];

const sessionDismissedUsers = new Set<string>();

function buildSeenKey(userId: string) {
  return `avgjoe_welcome_seen:${WELCOME_RELEASE_ID}:${userId}`;
}

export function getWelcomeVariant(user: User | null | undefined): WelcomeVariant {
  if (user?.email && REVIEWER_EMAILS.some((email) => email === user.email.toLowerCase())) {
    return 'reviewer';
  }

  if (user?.createdAt) {
    const createdAt = Date.parse(user.createdAt);
    const releaseAt = Date.parse(WELCOME_RELEASED_AT);
    if (!Number.isNaN(createdAt) && createdAt >= releaseAt) {
      return 'intro';
    }
  }

  return 'updates';
}

export async function getWelcomeDecision(user: User | null | undefined): Promise<{
  shouldShow: boolean;
  variant: WelcomeVariant;
}> {
  const variant = getWelcomeVariant(user);

  if (!user?.id || user.onboardingCompleted === false) {
    return { shouldShow: false, variant };
  }

  if (__DEV__) {
    return { shouldShow: !sessionDismissedUsers.has(user.id), variant };
  }

  const stored = await SecureStore.getItemAsync(buildSeenKey(user.id));
  return { shouldShow: stored !== WELCOME_RELEASE_ID, variant };
}

export async function markWelcomeSeen(user: User | null | undefined): Promise<void> {
  if (!user?.id) return;

  sessionDismissedUsers.add(user.id);
  try {
    await SecureStore.setItemAsync(buildSeenKey(user.id), WELCOME_RELEASE_ID);
  } catch {
    // We still dismiss the welcome for this app session even if persistence fails.
  }
}

export function resetWelcomeSession(user: User | null | undefined): void {
  if (!user?.id) return;
  sessionDismissedUsers.delete(user.id);
}
