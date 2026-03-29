import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SessionCard } from '@/components/history/SessionCard';
import { WorkoutSession } from '@/types';

const mockRouter = { push: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

const completedSession: WorkoutSession = {
  id: 'session-1',
  templateId: 'tmpl-1',
  name: 'Upper Body Push',
  startedAt: '2026-03-01T09:00:00.000Z',
  completedAt: '2026-03-01T10:05:00.000Z',
  notes: 'Felt strong today',
  sets: [
    {
      id: 'ss-1',
      sessionId: 'session-1',
      exerciseId: 'ex-1',
      exerciseName: 'Bench Press',
      setNumber: 1,
      actualReps: 8,
      actualWeight: 80,
      unit: 'kg',
      completedAt: '2026-03-01T09:30:00.000Z',
    },
  ],
};

describe('SessionCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders session name', () => {
    const { getByText } = render(<SessionCard session={completedSession} />);
    expect(getByText('Upper Body Push')).toBeTruthy();
  });

  it('shows Done badge for completed session', () => {
    const { getByText } = render(<SessionCard session={completedSession} />);
    expect(getByText('Done')).toBeTruthy();
  });

  it('shows Active badge for in-progress session', () => {
    const activeSession = { ...completedSession, completedAt: null };
    const { getByText } = render(<SessionCard session={activeSession} />);
    expect(getByText('Active')).toBeTruthy();
  });

  it('renders exercise count', () => {
    const { getByText } = render(<SessionCard session={completedSession} />);
    expect(getByText('1 exercises')).toBeTruthy();
  });

  it('renders set count', () => {
    const { getByText } = render(<SessionCard session={completedSession} />);
    expect(getByText('1 sets')).toBeTruthy();
  });

  it('renders notes when present', () => {
    const { getByText } = render(<SessionCard session={completedSession} />);
    expect(getByText('Felt strong today')).toBeTruthy();
  });

  it('navigates to session detail on press', () => {
    const { getByTestId } = render(
      <SessionCard session={completedSession} testID="scard" />,
    );
    fireEvent.press(getByTestId('scard'));
    expect(mockRouter.push).toHaveBeenCalledWith('/history/session-1');
  });
});
