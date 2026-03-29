import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSession } from '@/hooks/useSession';
import { api } from '@/lib/api';

jest.mock('@/lib/api');
const mockApi = api as jest.Mocked<typeof api>;

const mockSession = {
  id: 'session-1',
  templateId: 'tmpl-1',
  name: 'Upper Body',
  startedAt: new Date().toISOString(),
  completedAt: null,
  notes: null,
  sets: [],
};

describe('useSession', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts with null session', () => {
    const { result } = renderHook(() => useSession());
    expect(result.current.session).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  describe('startSession', () => {
    it('creates session and sets state', async () => {
      mockApi.post.mockResolvedValueOnce({ session: mockSession });
      const { result } = renderHook(() => useSession());

      let session: typeof mockSession;
      await act(async () => {
        session = await result.current.startSession('tmpl-1', 'Upper Body');
      });

      expect(session!.id).toBe('session-1');
      expect(result.current.session).toEqual(mockSession);
      expect(mockApi.post).toHaveBeenCalledWith('/api/sessions/start', {
        templateId: 'tmpl-1',
        name: 'Upper Body',
      });
    });

    it('sets error and rethrows on failure', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Server error'));
      const { result } = renderHook(() => useSession());

      await act(async () => {
        await expect(result.current.startSession('tmpl-1', 'Test')).rejects.toThrow('Server error');
      });

      expect(result.current.error).toBe('Server error');
    });
  });

  describe('logSet', () => {
    it('calls the correct endpoint', async () => {
      mockApi.post.mockResolvedValueOnce({ set: {} });
      const { result } = renderHook(() => useSession());

      await act(async () => {
        await result.current.logSet('session-1', {
          exerciseId: 'ex-1',
          exerciseName: 'Bench Press',
          setNumber: 1,
          actualReps: 10,
          actualWeight: 100,
          unit: 'kg',
        });
      });

      expect(mockApi.post).toHaveBeenCalledWith('/api/sessions/session-1/sets', expect.objectContaining({
        exerciseName: 'Bench Press',
        setNumber: 1,
      }));
    });
  });

  describe('completeSession', () => {
    it('patches session with completed status', async () => {
      const completedSession = { ...mockSession, completedAt: new Date().toISOString() };
      mockApi.patch.mockResolvedValueOnce({ session: completedSession });
      const { result } = renderHook(() => useSession());

      await act(async () => {
        await result.current.completeSession('session-1', 'Great workout!');
      });

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/api/sessions/session-1/complete',
        { notes: 'Great workout!' },
      );
      expect(result.current.session?.completedAt).toBeTruthy();
    });
  });
});
