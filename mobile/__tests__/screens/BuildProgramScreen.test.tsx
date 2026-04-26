import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    back: jest.fn(),
  }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'u1',
      name: 'Tester',
      email: 'tester@avgjoe.com',
      onboardingCompleted: true,
      serverHasAiKey: true,
    },
  }),
}));

jest.mock('@/hooks/useActiveProgram', () => ({
  useActiveProgram: () => ({ program: null }),
}));

jest.mock('@/components/workouts/ExercisePickerModal', () => ({
  ExercisePickerModal: ({ visible, onSelect }: any) => {
    if (!visible) return null;
    const ReactNative = require('react-native');
    return (
      <ReactNative.TouchableOpacity
        onPress={() => onSelect({ name: 'Goblet Squat', defaultSets: 3, defaultReps: 10, isCustom: false })}
      >
        <ReactNative.Text>Select</ReactNative.Text>
      </ReactNative.TouchableOpacity>
    );
  },
}));

jest.mock('react-native-draggable-flatlist', () => {
  const React = require('react');
  const ReactNative = require('react-native');

  function MockDraggableFlatList({ data, renderItem, onDragEnd }: any) {
    return (
      <>
        {data.map((item: any, index: number) => (
          <React.Fragment key={item.id ?? index}>
            {renderItem({
              item,
              getIndex: () => index,
              drag: jest.fn(),
              isActive: false,
            })}
          </React.Fragment>
        ))}
        <ReactNative.TouchableOpacity
          testID="mock-reorder"
          onPress={() => onDragEnd?.({ data: [...data].reverse() })}
        >
          <ReactNative.Text>Reorder</ReactNative.Text>
        </ReactNative.TouchableOpacity>
      </>
    );
  }

  return {
    __esModule: true,
    default: MockDraggableFlatList,
    ScaleDecorator: ({ children }: any) => children,
  };
});

const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('@/lib/api', () => ({
  api: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
  },
}));

import BuildProgramScreen from '@/app/(app)/workouts/build-program';

const preview = {
  programName: 'AI Hypertrophy Program',
  totalWeeks: 1,
  workouts: [
    {
      weekNumber: 1,
      dayOfWeek: 'Monday',
      name: 'Push Day',
      focus: 'Chest / Shoulders / Triceps',
      exercises: [
        {
          name: 'Barbell Bench Press',
          orderIndex: 0,
          notes: '',
          sets: [
            { setNumber: 1, targetReps: 8, targetWeight: 135, unit: 'lbs' },
            { setNumber: 2, targetReps: 8, targetWeight: 135, unit: 'lbs' },
            { setNumber: 3, targetReps: 8, targetWeight: 135, unit: 'lbs' },
          ],
        },
        {
          name: 'Overhead Press',
          orderIndex: 1,
          notes: '',
          sets: [
            { setNumber: 1, targetReps: 10, targetWeight: 75, unit: 'lbs' },
            { setNumber: 2, targetReps: 10, targetWeight: 75, unit: 'lbs' },
            { setNumber: 3, targetReps: 10, targetWeight: 75, unit: 'lbs' },
          ],
        },
      ],
    },
  ],
};

describe('BuildProgramScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({
      profile: {
        onboardingCompleted: true,
        primaryGoal: 'build_muscle',
        experienceLevel: 'beginner',
        daysPerWeek: 3,
        sessionDurationMins: 60,
        preferredSplit: 'push_pull_legs',
        workoutEnvironment: 'commercial_gym',
      },
    });
    mockPost.mockImplementation((url: string) => {
      if (url === '/api/ai/preview-program') {
        return Promise.resolve({ preview });
      }
      if (url === '/api/programs/custom') {
        return Promise.resolve({ program: { id: 'program-1' } });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });
  });

  it('lets you open the picker and save after loading an AI program', async () => {
    const { getByText, getByTestId } = render(<BuildProgramScreen />);

    fireEvent.press(getByText('Generate with AI'));

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/api/profile/me');
    });

    fireEvent.press(getByTestId('ai-weeks-increment'));

    fireEvent.press(getByText('Generate & Edit'));

    await waitFor(() => {
      expect(getByTestId('build-program-save-btn')).toBeTruthy();
    });
    expect(mockPost).toHaveBeenCalledWith(
      '/api/ai/preview-program',
      expect.objectContaining({ totalWeeks: 5 })
    );

    fireEvent.press(getByText('Monday'));

    await waitFor(() => {
      expect(getByText('Barbell Bench Press')).toBeTruthy();
    });

    fireEvent.press(getByText('Barbell Bench Press'));

    await waitFor(() => {
      expect(getByText('Select')).toBeTruthy();
    });

    fireEvent.press(getByText('Select'));

    await waitFor(() => {
      expect(getByText('Goblet Squat')).toBeTruthy();
    });

    fireEvent.press(getByTestId('mock-reorder'));

    fireEvent.press(getByTestId('build-program-save-btn'));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/programs/custom', expect.objectContaining({
        name: 'AI Hypertrophy Program',
        totalWeeks: 1,
      }));
      const saveCall = mockPost.mock.calls.find((call) => call[0] === '/api/programs/custom');
      expect(saveCall?.[1]?.weeks?.[0]?.workouts?.[0]?.exercises?.map((exercise: any) => exercise.name))
        .toEqual(['Overhead Press', 'Goblet Squat']);
      expect(mockReplace).toHaveBeenCalledWith('/(app)/program');
    });
  });
});
