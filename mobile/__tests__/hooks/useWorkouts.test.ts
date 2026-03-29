import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useWorkouts } from '@/hooks/useWorkouts';
import { api } from '@/lib/api';

jest.mock('@/lib/api');
const mockApi = api as jest.Mocked<typeof api>;

const mockTemplates = [
  {
    id: 'tmpl-1',
    name: 'Upper Body',
    description: null,
    isAiGenerated: false,
    aiGoal: null,
    programId: null,
    weekNumber: null,
    dayOfWeek: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    exercises: [],
  },
];

describe('useWorkouts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts with isLoading=true', () => {
    mockApi.get.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useWorkouts());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.workouts).toEqual([]);
  });

  it('loads workouts successfully', async () => {
    mockApi.get.mockResolvedValueOnce({ templates: mockTemplates });
    const { result } = renderHook(() => useWorkouts());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.workouts).toEqual(mockTemplates);
    expect(result.current.error).toBeNull();
  });

  it('sets error on API failure', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useWorkouts());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.workouts).toEqual([]);
  });

  it('refetch reloads data', async () => {
    mockApi.get
      .mockResolvedValueOnce({ templates: mockTemplates })
      .mockResolvedValueOnce({ templates: [] });

    const { result } = renderHook(() => useWorkouts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.workouts).toHaveLength(1);

    await act(async () => {
      result.current.refetch();
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.workouts).toHaveLength(0);
  });
});
