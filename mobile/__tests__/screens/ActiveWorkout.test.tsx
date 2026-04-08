/**
 * Tests for Feature 6: Done button guard.
 * Verifies that tapping Done without entering reps shows an error Toast
 * and does NOT call the log-set API.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────
// jest.mock factories are hoisted above imports, so variables declared in the
// test file are NOT yet initialised inside the factory. Use jest.fn() directly
// inside each factory; grab references via require() after all mocks are wired.

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ sessionId: 'sess-1' }),
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
}));

// Toast.show must be on the *default* export so Babel's interop (import Toast from …)
// resolves it correctly.
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));

jest.mock('@/lib/healthkit', () => ({
  saveWorkout: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('@/hooks/useSetCompleteSound', () => ({
  useSetCompleteSound: () => ({ play: jest.fn() }),
  SOUND_PREF_KEY: 'sound_on_set_complete',
}));

jest.mock('@/hooks/useRestTimer', () => ({
  useRestTimer: () => ({
    isActive: false,
    remaining: 0,
    selectedDuration: 90,
    setSelectedDuration: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  }),
  REST_TIMER_OPTIONS: [60, 90, 120],
}));

// ─── Resolve mock refs after all factories are registered ────────────────────
import ActiveWorkoutScreen from '@/app/(app)/workouts/active/[sessionId]';
import Toast from 'react-native-toast-message';
import { api } from '@/lib/api';

const mockGet  = api.get  as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockToastShow = Toast.show as jest.Mock;

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const mockSession = {
  id: 'sess-1',
  name: 'Push Day',
  templateId: null,
  plannedWorkoutId: 'pw-1',
  programId: 'prog-1',
  startedAt: new Date().toISOString(),
  completedAt: null,
  notes: null,
  sets: [],
};

const mockPlannedWorkout = {
  id: 'pw-1',
  name: 'Push Day',
  programId: 'prog-1',
  weekNumber: 1,
  dayOfWeek: 'Monday',
  scheduledDate: null,
  focus: null,
  warmup: [],
  exercises: [
    {
      name: 'Bench Press',
      orderIndex: 0,
      notes: null,
      sets: [{ setNumber: 1, targetReps: 8, targetWeight: 80, unit: 'kg' }],
    },
  ],
  conditioning: null,
  coachNotes: null,
  estimatedDuration: null,
  isCompleted: false,
  createdAt: new Date().toISOString(),
};

// ─── Setup ────────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockImplementation((url: string) => {
    if (url.includes('/api/sessions/sess-1')) {
      return Promise.resolve({ session: mockSession });
    }
    if (url.includes('/api/programs/active')) {
      return Promise.resolve({ program: { plannedWorkouts: [mockPlannedWorkout] } });
    }
    if (url.includes('last-exercise')) {
      return Promise.resolve({ sets: [{ setNumber: 1, actualReps: 10, actualWeight: 80, unit: 'kg' }] });
    }
    return Promise.reject(new Error(`Unexpected GET: ${url}`));
  });
});

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('ActiveWorkout — Notes FAB (Feature 9)', () => {
  it('renders the floating notes button', async () => {
    const { findByTestId } = render(<ActiveWorkoutScreen />);
    expect(await findByTestId('notes-fab')).toBeTruthy();
  });
});

describe('ActiveWorkout — Previous session data (Feature 7)', () => {
  it('fetches last-exercise data for each exercise on load', async () => {
    const { findByTestId } = render(<ActiveWorkoutScreen />);
    await findByTestId('done-btn-0-1'); // wait for load
    // Should have called last-exercise endpoint
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('last-exercise/Bench%20Press')
    );
  });
});

describe('ActiveWorkout — Done button guard (Feature 6)', () => {
  it('shows error Toast and does NOT post to API when Done pressed with no reps', async () => {
    const { findByTestId } = render(<ActiveWorkoutScreen />);

    const doneBtn = await findByTestId('done-btn-0-1');
    await act(async () => { fireEvent.press(doneBtn); });

    await waitFor(() =>
      expect(mockToastShow).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: expect.stringContaining('reps') })
      )
    );
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('posts to API when Done is pressed after entering reps', async () => {
    mockPost.mockResolvedValue({});
    const { findByTestId } = render(<ActiveWorkoutScreen />);

    const repsInput = await findByTestId('reps-input-0-1');
    await act(async () => { fireEvent.changeText(repsInput, '8'); });

    const doneBtn = await findByTestId('done-btn-0-1');
    await act(async () => { fireEvent.press(doneBtn); });

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        '/api/sessions/sess-1/sets',
        expect.objectContaining({ exerciseName: 'Bench Press', setNumber: 1 })
      )
    );
  });
});
