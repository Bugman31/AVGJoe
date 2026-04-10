import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ─── mock setup (must precede all imports from the app) ────────────────────

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'current-user-id',
      name: 'Test User',
      email: 'test@example.com',
      avatarUrl: null,
    },
  }),
}));

const mockSetCategory = jest.fn();
const mockSetDifficulty = jest.fn();
const mockSetSortBy = jest.fn();
const mockSearch = jest.fn();
const mockRefetch = jest.fn();

// Program names are intentionally distinct from filter pill labels
// so getByText() never matches multiple elements.
const mockPrograms = [
  {
    id: 'prog-1',
    creatorId: 'user-abc',
    creatorName: 'Jane Lifter',
    creatorAvatar: 'https://example.com/avatar1.jpg',
    name: 'Push Pull Legs Power',
    description: 'A classic 6-day PPL program for intermediate lifters.',
    category: 'strength',
    difficulty: 'intermediate',
    durationWeeks: 12,
    daysPerWeek: 6,
    equipment: ['barbell', 'dumbbell'],
    tags: ['ppl', 'strength'],
    workoutPlan: {},
    ratingAverage: 4.7,
    enrollmentCount: 312,
    isPublished: true,
    createdAt: '2025-01-10T12:00:00.000Z',
  },
  {
    id: 'prog-2',
    creatorId: 'user-def',
    creatorName: 'Mark Endure',
    creatorAvatar: null,
    name: '8-Week Shred Circuit',          // renamed: no overlap with pill labels
    description: 'Eight weeks of cardio and conditioning.',
    category: 'fat_loss',
    difficulty: 'intermediate',             // changed: no overlap with 'beginner' pill
    durationWeeks: 8,
    daysPerWeek: 4,
    equipment: ['bodyweight'],
    tags: ['fat loss', 'conditioning'],
    workoutPlan: {},
    ratingAverage: 4.2,
    enrollmentCount: 98,
    isPublished: true,
    createdAt: '2025-03-15T09:30:00.000Z',
  },
];

// Default hook state — individual tests override with jest.mock factory returns
const defaultHookReturn = {
  programs: mockPrograms,
  isLoading: false,
  error: null,
  refetch: mockRefetch,
  search: mockSearch,
  setCategory: mockSetCategory,
  setDifficulty: mockSetDifficulty,
  setSortBy: mockSetSortBy,
};

const mockUseSharedPrograms = jest.fn(() => defaultHookReturn);

jest.mock('@/hooks/useSharedPrograms', () => ({
  useSharedPrograms: (...args: any[]) => mockUseSharedPrograms(...args),
}));

import ProgramBrowseScreen from '@/app/(app)/programs/browse';

// ─── helpers ───────────────────────────────────────────────────────────────

function renderScreen() {
  return render(<ProgramBrowseScreen />);
}

// ─── tests ─────────────────────────────────────────────────────────────────

describe('ProgramBrowseScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSharedPrograms.mockReturnValue(defaultHookReturn);
  });

  // ─── basic render ─────────────────────────────────────────────────────────

  it('renders the screen title "Browse Programs"', () => {
    const { getByText } = renderScreen();
    expect(getByText('Browse Programs')).toBeTruthy();
  });

  it('renders a "Share My Program" button', () => {
    const { getByText } = renderScreen();
    expect(getByText('Share My Program')).toBeTruthy();
  });

  // ─── loading state ────────────────────────────────────────────────────────

  it('shows a loading spinner when isLoading is true', () => {
    mockUseSharedPrograms.mockReturnValue({ ...defaultHookReturn, isLoading: true, programs: [] });
    const { getByTestId } = renderScreen();
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('does not show a loading spinner when isLoading is false', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('loading-indicator')).toBeNull();
  });

  // ─── program cards ────────────────────────────────────────────────────────

  it('renders a card for each loaded program', () => {
    const { getByText } = renderScreen();
    expect(getByText('Push Pull Legs Power')).toBeTruthy();
    expect(getByText('8-Week Shred Circuit')).toBeTruthy();
  });

  it('displays creator name on each program card', () => {
    const { getByText } = renderScreen();
    expect(getByText('Jane Lifter')).toBeTruthy();
    expect(getByText('Mark Endure')).toBeTruthy();
  });

  // ─── empty state ──────────────────────────────────────────────────────────

  it('shows empty state message when no programs match', () => {
    mockUseSharedPrograms.mockReturnValue({ ...defaultHookReturn, programs: [] });
    const { getByText } = renderScreen();
    expect(getByText(/no programs found/i)).toBeTruthy();
  });

  it('does not show empty state when programs are present', () => {
    const { queryByText } = renderScreen();
    expect(queryByText(/no programs found/i)).toBeNull();
  });

  // ─── search input ─────────────────────────────────────────────────────────

  it('calls search with the entered text when search input changes', () => {
    const { getByPlaceholderText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText(/search programs/i), 'push');
    expect(mockSearch).toHaveBeenCalledWith('push');
  });

  it('calls search with empty string when search input is cleared', () => {
    const { getByPlaceholderText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText(/search programs/i), '');
    expect(mockSearch).toHaveBeenCalledWith('');
  });

  // ─── category filter pills ────────────────────────────────────────────────

  it('renders category filter pills including Strength and Fat Loss', () => {
    const { getAllByText } = renderScreen();
    // getAllByText is safe here — pills and any matching card text won't conflict
    // since our mock program names don't contain 'Strength' or 'Fat Loss' verbatim
    expect(getAllByText('Strength').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('Fat Loss').length).toBeGreaterThanOrEqual(1);
  });

  it('calls setCategory with the correct value when a category pill is pressed', () => {
    const { getAllByText } = renderScreen();
    // Press the first element matching 'Strength' (the pill)
    fireEvent.press(getAllByText('Strength')[0]);
    expect(mockSetCategory).toHaveBeenCalledWith('strength');
  });

  // ─── difficulty filter pills ──────────────────────────────────────────────

  it('renders difficulty filter pills: Beginner, Intermediate, Advanced', () => {
    const { getByText } = renderScreen();
    // Mock programs use 'intermediate' difficulty so 'Beginner' only appears as a pill
    expect(getByText('Beginner')).toBeTruthy();
    expect(getByText('Intermediate')).toBeTruthy();
    expect(getByText('Advanced')).toBeTruthy();
  });

  it('calls setDifficulty with "beginner" when Beginner pill is pressed', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Beginner'));
    expect(mockSetDifficulty).toHaveBeenCalledWith('beginner');
  });

  it('calls setDifficulty with "advanced" when Advanced pill is pressed', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Advanced'));
    expect(mockSetDifficulty).toHaveBeenCalledWith('advanced');
  });

  // ─── navigation ───────────────────────────────────────────────────────────

  it('navigates to the program detail screen when a card is tapped', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Push Pull Legs Power'));
    expect(mockPush).toHaveBeenCalledWith('/(app)/programs/prog-1');
  });

  it('navigates to the correct detail route for each card', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('8-Week Shred Circuit'));
    expect(mockPush).toHaveBeenCalledWith('/(app)/programs/prog-2');
  });

  it('navigates to the share-program screen when "Share My Program" is pressed', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Share My Program'));
    expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/programs\/share|share.*program/i));
  });

  // ─── error state ──────────────────────────────────────────────────────────

  it('shows an error message when the hook returns an error', () => {
    mockUseSharedPrograms.mockReturnValue({
      ...defaultHookReturn,
      programs: [],
      error: 'Failed to load programs',
    });
    const { getByText } = renderScreen();
    expect(getByText(/failed to load programs/i)).toBeTruthy();
  });
});
