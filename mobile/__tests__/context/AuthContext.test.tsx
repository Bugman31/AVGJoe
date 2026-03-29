import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import * as authLib from '@/lib/auth';
import * as apiLib from '@/lib/api';

jest.mock('@/lib/auth');
jest.mock('@/lib/api');

const mockAuthLib = authLib as jest.Mocked<typeof authLib>;
const mockApiLib = apiLib as jest.Mocked<typeof apiLib>;

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  hasAnthropicKey: false,
  createdAt: new Date().toISOString(),
};

// Consumer component that exposes auth state for testing
function TestConsumer() {
  const { user, isAuthenticated, isLoading } = useAuth();
  return (
    <>
      <Text testID="loading">{String(isLoading)}</Text>
      <Text testID="authenticated">{String(isAuthenticated)}</Text>
      <Text testID="user">{user?.email ?? 'none'}</Text>
    </>
  );
}

describe('AuthContext', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts in loading state', () => {
    // api.get never resolves during this test
    (mockApiLib.api.get as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    expect(getByTestId('loading').props.children).toBe('true');
  });

  it('sets user when /me returns successfully', async () => {
    (mockApiLib.api.get as jest.Mock).mockResolvedValueOnce({ user: mockUser });

    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));
    expect(getByTestId('authenticated').props.children).toBe('true');
    expect(getByTestId('user').props.children).toBe(mockUser.email);
  });

  it('stays logged out when /me fails', async () => {
    (mockApiLib.api.get as jest.Mock).mockRejectedValueOnce(new Error('401'));

    const { getByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));
    expect(getByTestId('authenticated').props.children).toBe('false');
    expect(getByTestId('user').props.children).toBe('none');
    expect(mockAuthLib.removeToken).toHaveBeenCalled();
  });

  it('login() stores token and sets user when userData provided', async () => {
    // restoreSession fails (no existing session)
    (mockApiLib.api.get as jest.Mock).mockRejectedValueOnce(new Error('no session'));

    let loginFn: (token: string, userData?: typeof mockUser) => Promise<void>;
    function LoginConsumer() {
      const { login } = useAuth();
      loginFn = login;
      return <TestConsumer />;
    }

    const { getByTestId } = render(
      <AuthProvider>
        <LoginConsumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    await act(async () => {
      await loginFn!('new-token', mockUser);
    });

    expect(mockAuthLib.storeToken).toHaveBeenCalledWith('new-token');
    expect(getByTestId('authenticated').props.children).toBe('true');
    expect(getByTestId('user').props.children).toBe(mockUser.email);
    // Should NOT have called /me again — user was passed directly
    expect(mockApiLib.api.get).toHaveBeenCalledTimes(1);
  });

  it('login() falls back to /me when userData not provided', async () => {
    // First call: restoreSession fails; second call: /me after login succeeds
    (mockApiLib.api.get as jest.Mock)
      .mockRejectedValueOnce(new Error('no session'))
      .mockResolvedValueOnce({ user: mockUser });

    let loginFn: (token: string, userData?: typeof mockUser) => Promise<void>;
    function LoginConsumer() {
      const { login } = useAuth();
      loginFn = login;
      return <TestConsumer />;
    }

    const { getByTestId } = render(
      <AuthProvider>
        <LoginConsumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(getByTestId('loading').props.children).toBe('false'));

    await act(async () => {
      await loginFn!('new-token');
    });

    expect(mockAuthLib.storeToken).toHaveBeenCalledWith('new-token');
    expect(getByTestId('authenticated').props.children).toBe('true');
    expect(mockApiLib.api.get).toHaveBeenCalledTimes(2);
  });

  it('logout() clears token and user', async () => {
    (mockApiLib.api.get as jest.Mock).mockResolvedValueOnce({ user: mockUser });

    let logoutFn: () => Promise<void>;
    function LogoutConsumer() {
      const { logout } = useAuth();
      logoutFn = logout;
      return <TestConsumer />;
    }

    const { getByTestId } = render(
      <AuthProvider>
        <LogoutConsumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(getByTestId('authenticated').props.children).toBe('true'));

    await act(async () => {
      await logoutFn!();
    });

    expect(mockAuthLib.removeToken).toHaveBeenCalled();
    expect(getByTestId('authenticated').props.children).toBe('false');
  });
});
