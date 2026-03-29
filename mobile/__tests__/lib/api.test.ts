import { api, setAuthExpiredCallback } from '@/lib/api';
import * as auth from '@/lib/auth';

jest.mock('@/lib/auth');

const mockAuth = auth as jest.Mocked<typeof auth>;

global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

describe('api lib', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.getToken.mockResolvedValue('valid-token');
    mockAuth.isTokenExpired.mockReturnValue(false);
  });

  describe('GET request', () => {
    it('sends Authorization header with Bearer token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: 'test' }),
      });

      await api.get('/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/test'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-token',
          }),
        }),
      );
    });

    it('throws AUTH_EXPIRED when token is expired', async () => {
      mockAuth.isTokenExpired.mockReturnValue(true);
      await expect(api.get('/api/test')).rejects.toThrow('AUTH_EXPIRED');
    });

    it('calls auth-expired callback when 401 returned', async () => {
      const onExpired = jest.fn();
      setAuthExpiredCallback(onExpired);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => '{}',
      });

      await expect(api.get('/api/test')).rejects.toThrow('AUTH_EXPIRED');
      expect(onExpired).toHaveBeenCalled();
    });

    it('throws error message from response body on non-ok status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: 'Bad Request' }),
      });

      await expect(api.get('/api/test')).rejects.toThrow('Bad Request');
    });

    it('returns parsed JSON on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ user: { id: '1' } }),
      });

      const result = await api.get<{ user: { id: string } }>('/api/test');
      expect(result.user.id).toBe('1');
    });
  });

  describe('POST request', () => {
    it('sends body as JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: async () => JSON.stringify({ ok: true }),
      });

      await api.post('/api/test', { name: 'test' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' }),
        }),
      );
    });
  });

  describe('request without token', () => {
    it('sends no Authorization header when no token stored', async () => {
      mockAuth.getToken.mockResolvedValue(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '{}',
      });

      await api.get('/api/public');

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.Authorization).toBeUndefined();
    });
  });
});
