import { getToken, isTokenExpired, removeToken } from './auth';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

// Callback set by AuthContext to trigger logout on 401
let onAuthExpired: (() => void) | null = null;
export function setAuthExpiredCallback(cb: () => void) {
  onAuthExpired = cb;
}

async function buildHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  const token = await getToken();
  if (token) {
    if (isTokenExpired(token)) {
      await removeToken();
      onAuthExpired?.();
      throw new Error('AUTH_EXPIRED');
    }
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

const REQUEST_TIMEOUT_MS = 15_000;

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: { params?: Record<string, string | undefined> },
): Promise<T> {
  const headers = await buildHeaders();

  // Build query string from params, filtering out undefined/empty values
  let url = `${API_BASE}${path}`;
  if (options?.params) {
    const qs = Object.entries(options.params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`)
      .join('&');
    if (qs) url = `${url}?${qs}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out. Check your connection and try again.');
    }
    throw err;
  }
  clearTimeout(timeoutId);

  if (response.status === 401) {
    await removeToken();
    onAuthExpired?.();
    throw new Error('AUTH_EXPIRED');
  }

  const text = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    const fieldErrors = (data as { fieldErrors?: Record<string, string[] | undefined> })?.fieldErrors;
    const validationDetails = fieldErrors
      ? Object.values(fieldErrors)
          .flat()
          .filter((value): value is string => !!value)
          .join(' ')
      : '';
    const msg =
      (data as { error?: string; message?: string })?.error ||
      (data as { error?: string; message?: string })?.message ||
      `Request failed: ${response.status}`;
    throw new Error(validationDetails ? `${msg} ${validationDetails}`.trim() : msg);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: { params?: Record<string, string | undefined> }) =>
    request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
