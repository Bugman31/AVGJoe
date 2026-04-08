import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/hooks/useWorkouts', () => ({
  useWorkouts: () => ({ workouts: [], isLoading: false, refetch: jest.fn() }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

import WorkoutsScreen from '@/app/(app)/workouts/index';

describe('WorkoutsScreen empty state', () => {
  it('shows empty state text when no workouts', () => {
    const { getByText } = render(<WorkoutsScreen />);
    expect(getByText('No workouts yet')).toBeTruthy();
  });

  // Feature 20: empty state CTA
  it('shows "Create Your First Workout" CTA in empty state', () => {
    const { getByText } = render(<WorkoutsScreen />);
    expect(getByText('Create Your First Workout')).toBeTruthy();
  });

  it('navigates to new workout screen when CTA is pressed', () => {
    const { getByText } = render(<WorkoutsScreen />);
    fireEvent.press(getByText('Create Your First Workout'));
    expect(mockPush).toHaveBeenCalledWith('/workouts/new');
  });
});
