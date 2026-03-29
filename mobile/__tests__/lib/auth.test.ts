import { storeToken, getToken, removeToken, isTokenExpired } from '@/lib/auth';

// Inline mock so jest.fn() types are correct in this test file
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Re-import after mock is set up
import * as SecureStore from 'expo-secure-store';

describe('auth lib', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('storeToken', () => {
    it('calls SecureStore.setItemAsync with correct key', async () => {
      await storeToken('my-token');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('avgjoe_jwt', 'my-token');
    });
  });

  describe('getToken', () => {
    it('calls SecureStore.getItemAsync with correct key', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('stored-token');
      const result = await getToken();
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('avgjoe_jwt');
      expect(result).toBe('stored-token');
    });

    it('returns null when no token stored', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
      const result = await getToken();
      expect(result).toBeNull();
    });
  });

  describe('removeToken', () => {
    it('calls SecureStore.deleteItemAsync with correct key', async () => {
      await removeToken();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('avgjoe_jwt');
    });
  });

  describe('isTokenExpired', () => {
    function makeToken(expOffset: number): string {
      const now = Math.floor(Date.now() / 1000);
      const payload = { sub: 'user1', exp: now + expOffset };
      const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
      return `header.${encoded}.signature`;
    }

    it('returns false for a valid (non-expired) token', () => {
      const token = makeToken(3600);
      expect(isTokenExpired(token)).toBe(false);
    });

    it('returns true for an expired token', () => {
      const token = makeToken(-1);
      expect(isTokenExpired(token)).toBe(true);
    });

    it('returns true for a malformed token', () => {
      expect(isTokenExpired('not-a-token')).toBe(true);
    });

    it('returns true for an empty string', () => {
      expect(isTokenExpired('')).toBe(true);
    });
  });
});
