import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSharedPrograms } from '@/hooks/useSharedPrograms';
import { api } from '@/lib/api';

jest.mock('@/lib/api');
const mockApi = api as jest.Mocked<typeof api>;

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
    equipment: ['barbell', 'dumbbell', 'cable'],
    tags: ['ppl', 'powerlifting', 'hypertrophy'],
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
    name: 'Beginner Fat Loss Sprint',
    description: 'Eight weeks of cardio and conditioning for fat loss beginners.',
    category: 'fat_loss',
    difficulty: 'beginner',
    durationWeeks: 8,
    daysPerWeek: 4,
    equipment: ['bodyweight', 'resistance bands'],
    tags: ['fat loss', 'beginner', 'cardio'],
    workoutPlan: {},
    ratingAverage: 4.2,
    enrollmentCount: 98,
    isPublished: true,
    createdAt: '2025-03-15T09:30:00.000Z',
  },
  {
    id: 'prog-3',
    creatorId: 'user-ghi',
    creatorName: 'Sam Mobility',
    creatorAvatar: null,
    name: 'Daily Mobility Flow',
    description: 'Improve flexibility and joint health with this daily mobility routine.',
    category: 'mobility',
    difficulty: 'beginner',
    durationWeeks: 4,
    daysPerWeek: 7,
    equipment: ['yoga mat', 'foam roller'],
    tags: ['mobility', 'flexibility', 'recovery'],
    workoutPlan: {},
    ratingAverage: 4.9,
    enrollmentCount: 540,
    isPublished: true,
    createdAt: '2024-11-20T08:00:00.000Z',
  },
];

describe('useSharedPrograms', () => {
  beforeEach(() => jest.clearAllMocks());

  // ─── initial state ──────────────────────────────────────────────────────────

  it('starts with isLoading=true and empty programs array', () => {
    mockApi.get.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useSharedPrograms());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.programs).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  // ─── successful load ────────────────────────────────────────────────────────

  it('loads programs from /api/shared-programs and sets isLoading=false', async () => {
    mockApi.get.mockResolvedValueOnce({ programs: mockPrograms });
    const { result } = renderHook(() => useSharedPrograms());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApi.get).toHaveBeenCalledWith('/api/shared-programs', expect.objectContaining({}));
    expect(result.current.programs).toEqual(mockPrograms);
    expect(result.current.error).toBeNull();
  });

  // ─── category filter ────────────────────────────────────────────────────────

  it('passes category query param when setCategory is called', async () => {
    mockApi.get.mockResolvedValue({ programs: [] });
    const { result } = renderHook(() => useSharedPrograms());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.setCategory('strength');
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApi.get).toHaveBeenLastCalledWith(
      '/api/shared-programs',
      expect.objectContaining({ params: expect.objectContaining({ category: 'strength' }) }),
    );
  });

  it('clears category filter when setCategory is called with null', async () => {
    mockApi.get.mockResolvedValue({ programs: [] });
    const { result } = renderHook(() => useSharedPrograms());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.setCategory('hypertrophy');
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.setCategory(null);
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const lastCall = (mockApi.get as jest.Mock).mock.calls.at(-1);
    expect(lastCall[1]?.params?.category).toBeFalsy();
  });

  // ─── search filter ──────────────────────────────────────────────────────────

  it('passes q query param when search is called', async () => {
    mockApi.get.mockResolvedValue({ programs: [] });
    const { result } = renderHook(() => useSharedPrograms());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.search('push');
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApi.get).toHaveBeenLastCalledWith(
      '/api/shared-programs',
      expect.objectContaining({ params: expect.objectContaining({ q: 'push' }) }),
    );
  });

  // ─── difficulty filter ──────────────────────────────────────────────────────

  it('passes difficulty query param when setDifficulty is called', async () => {
    mockApi.get.mockResolvedValue({ programs: [] });
    const { result } = renderHook(() => useSharedPrograms());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.setDifficulty('advanced');
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApi.get).toHaveBeenLastCalledWith(
      '/api/shared-programs',
      expect.objectContaining({ params: expect.objectContaining({ difficulty: 'advanced' }) }),
    );
  });

  // ─── sort options ───────────────────────────────────────────────────────────

  it('passes sort=newest query param when setSortBy is called with "newest"', async () => {
    mockApi.get.mockResolvedValue({ programs: [] });
    const { result } = renderHook(() => useSharedPrograms());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.setSortBy('newest');
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApi.get).toHaveBeenLastCalledWith(
      '/api/shared-programs',
      expect.objectContaining({ params: expect.objectContaining({ sort: 'newest' }) }),
    );
  });

  it('passes sort=popular query param when setSortBy is called with "popular"', async () => {
    mockApi.get.mockResolvedValue({ programs: [] });
    const { result } = renderHook(() => useSharedPrograms());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.setSortBy('popular');
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApi.get).toHaveBeenLastCalledWith(
      '/api/shared-programs',
      expect.objectContaining({ params: expect.objectContaining({ sort: 'popular' }) }),
    );
  });

  it('passes sort=top_rated query param when setSortBy is called with "top_rated"', async () => {
    mockApi.get.mockResolvedValue({ programs: [] });
    const { result } = renderHook(() => useSharedPrograms());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.setSortBy('top_rated');
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockApi.get).toHaveBeenLastCalledWith(
      '/api/shared-programs',
      expect.objectContaining({ params: expect.objectContaining({ sort: 'top_rated' }) }),
    );
  });

  // ─── error handling ─────────────────────────────────────────────────────────

  it('sets error on API failure and keeps programs empty', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useSharedPrograms());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.programs).toEqual([]);
  });

  it('clears error on successful subsequent fetch', async () => {
    mockApi.get
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ programs: mockPrograms });

    const { result } = renderHook(() => useSharedPrograms());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Network error');

    await act(async () => {
      result.current.refetch();
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.programs).toEqual(mockPrograms);
  });

  // ─── refetch ────────────────────────────────────────────────────────────────

  it('refetch triggers a new API call and updates programs', async () => {
    mockApi.get
      .mockResolvedValueOnce({ programs: mockPrograms })
      .mockResolvedValueOnce({ programs: [mockPrograms[0]] });

    const { result } = renderHook(() => useSharedPrograms());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.programs).toHaveLength(3);

    await act(async () => {
      result.current.refetch();
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.programs).toHaveLength(1);
    expect(mockApi.get).toHaveBeenCalledTimes(2);
  });
});
