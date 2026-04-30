import * as SecureStore from 'expo-secure-store';
import {
  REVIEWER_EMAIL,
  WELCOME_RELEASE_ID,
  getWelcomeDecision,
  getWelcomeVariant,
  markWelcomeSeen,
  resetWelcomeSession,
} from '@/lib/welcome';

const originalDev = (global as any).__DEV__;

describe('welcome helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).__DEV__ = false;
  });

  afterAll(() => {
    (global as any).__DEV__ = originalDev;
  });

  it('classifies the reviewer account correctly', () => {
    expect(getWelcomeVariant({ id: 'u1', email: REVIEWER_EMAIL, name: 'Reviewer', onboardingCompleted: true })).toBe('reviewer');
  });

  it('classifies users created on or after April 30, 2026 as first-time users', () => {
    expect(getWelcomeVariant({
      id: 'u2',
      email: 'new@avgjoe.com',
      name: 'New User',
      onboardingCompleted: true,
      createdAt: '2026-04-30T12:00:00.000Z',
    })).toBe('intro');
  });

  it('classifies older users as update viewers', () => {
    expect(getWelcomeVariant({
      id: 'u3',
      email: 'existing@avgjoe.com',
      name: 'Existing User',
      onboardingCompleted: true,
      createdAt: '2026-04-01T12:00:00.000Z',
    })).toBe('updates');
  });

  it('shows the welcome in production until the current release is marked seen', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

    const first = await getWelcomeDecision({
      id: 'u4',
      email: 'existing@avgjoe.com',
      name: 'Existing User',
      onboardingCompleted: true,
      createdAt: '2026-04-01T12:00:00.000Z',
    });

    expect(first.shouldShow).toBe(true);

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(WELCOME_RELEASE_ID);

    const second = await getWelcomeDecision({
      id: 'u4',
      email: 'existing@avgjoe.com',
      name: 'Existing User',
      onboardingCompleted: true,
      createdAt: '2026-04-01T12:00:00.000Z',
    });

    expect(second.shouldShow).toBe(false);
  });

  it('shows only once per dev session and reuses the same user-specific session gate', async () => {
    (global as any).__DEV__ = true;
    const user = {
      id: 'u5',
      email: 'dev@avgjoe.com',
      name: 'Dev User',
      onboardingCompleted: true,
      createdAt: '2026-04-01T12:00:00.000Z',
    };

    resetWelcomeSession(user);

    const beforeDismiss = await getWelcomeDecision(user);
    expect(beforeDismiss.shouldShow).toBe(true);

    await markWelcomeSeen(user);
    expect(SecureStore.setItemAsync).toHaveBeenCalled();

    const afterDismiss = await getWelcomeDecision(user);
    expect(afterDismiss.shouldShow).toBe(false);
  });
});
