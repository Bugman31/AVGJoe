import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WorkoutCard } from '@/components/workouts/WorkoutCard';
import { WorkoutTemplate } from '@/types';

const mockRouter = { push: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

const baseTemplate: WorkoutTemplate = {
  id: 'tmpl-1',
  name: 'Upper Body Push',
  description: 'Chest, shoulders, triceps',
  isAiGenerated: false,
  aiGoal: null,
  programId: null,
  weekNumber: null,
  dayOfWeek: 'Monday',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  exercises: [
    {
      id: 'ex-1',
      templateId: 'tmpl-1',
      name: 'Bench Press',
      orderIndex: 0,
      notes: null,
      sets: [
        { id: 's-1', exerciseId: 'ex-1', setNumber: 1, targetReps: 8, targetWeight: 80, unit: 'kg' },
        { id: 's-2', exerciseId: 'ex-1', setNumber: 2, targetReps: 8, targetWeight: 80, unit: 'kg' },
      ],
    },
  ],
};

describe('WorkoutCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders workout name', () => {
    const { getByText } = render(<WorkoutCard workout={baseTemplate} />);
    expect(getByText('Upper Body Push')).toBeTruthy();
  });

  it('renders description', () => {
    const { getByText } = render(<WorkoutCard workout={baseTemplate} />);
    expect(getByText('Chest, shoulders, triceps')).toBeTruthy();
  });

  it('renders exercise count', () => {
    const { getByText } = render(<WorkoutCard workout={baseTemplate} />);
    expect(getByText('1 exercise')).toBeTruthy();
  });

  it('renders set count', () => {
    const { getByText } = render(<WorkoutCard workout={baseTemplate} />);
    expect(getByText('2 sets')).toBeTruthy();
  });

  it('renders day of week', () => {
    const { getByText } = render(<WorkoutCard workout={baseTemplate} />);
    expect(getByText('Monday')).toBeTruthy();
  });

  it('shows AI badge for AI-generated workouts', () => {
    const aiTemplate = { ...baseTemplate, isAiGenerated: true };
    const { getByText } = render(<WorkoutCard workout={aiTemplate} />);
    expect(getByText('AI')).toBeTruthy();
  });

  it('does not show AI badge for manual workouts', () => {
    const { queryByText } = render(<WorkoutCard workout={baseTemplate} />);
    expect(queryByText('AI')).toBeNull();
  });

  it('navigates to workout detail on press', () => {
    const { getByTestId } = render(
      <WorkoutCard workout={baseTemplate} testID="wcard" />,
    );
    fireEvent.press(getByTestId('wcard'));
    expect(mockRouter.push).toHaveBeenCalledWith('/workouts/tmpl-1');
  });
});
