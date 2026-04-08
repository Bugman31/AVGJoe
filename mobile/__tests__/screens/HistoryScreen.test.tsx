import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mock dependencies before importing the screen
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn().mockResolvedValue({ sessions: [], total: 0 }) },
}));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

import HistoryScreen from '@/app/(app)/history/index';

describe('HistoryScreen empty state', () => {
  it('shows empty state text when no sessions', async () => {
    const { findByText } = render(<HistoryScreen />);
    expect(await findByText('No sessions yet')).toBeTruthy();
  });

  // Feature 20: empty state CTA
  it('shows "Start a Workout" CTA button in empty state', async () => {
    const { findByText } = render(<HistoryScreen />);
    expect(await findByText('Start a Workout')).toBeTruthy();
  });

  it('navigates to workouts screen when CTA is pressed', async () => {
    const { findByText } = render(<HistoryScreen />);
    const cta = await findByText('Start a Workout');
    fireEvent.press(cta);
    expect(mockPush).toHaveBeenCalledWith('/(app)/workouts');
  });
});
