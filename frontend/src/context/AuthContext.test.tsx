import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { type ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import type { AuthUser } from './AuthContext';

vi.mock('@/config/authSession', () => ({
  hasBearerFallback: vi.fn().mockReturnValue(false),
  setAccessTokenFromLogin: vi.fn(),
  clearAccessToken: vi.fn(),
}));

vi.mock('@/config/loginErrors', () => ({
  userFromLoginPayload: vi.fn((data: { username?: string }) =>
    data?.username
      ? {
          id: 1,
          username: data.username,
          email: '',
          is_staff: false,
          is_superuser: false,
          first_name: '',
          last_name: '',
        }
      : null
  ),
}));

vi.mock('@/config/api', () => ({
  fetchApi: vi.fn(),
  ensureCsrfCookie: vi.fn().mockResolvedValue(undefined),
  hasAuthSessionFlag: vi.fn().mockReturnValue(true),
  hasBearerFallback: vi.fn().mockReturnValue(false),
  hasAccessTokenFallback: vi.fn().mockReturnValue(false),
  markAuthSession: vi.fn(),
  setAccessTokenFromLogin: vi.fn(),
  setAuthTokensFromLogin: vi.fn(),
  clearAuthSession: vi.fn(),
}));

import { clearAuthSession, fetchApi, hasAuthSessionFlag, markAuthSession, setAccessTokenFromLogin } from '@/config/api';

const mockFetchApi = vi.mocked(fetchApi);
const mockHasSession = vi.mocked(hasAuthSessionFlag);
const mockClearSession = vi.mocked(clearAuthSession);
const mockMarkSession = vi.mocked(markAuthSession);
const mockSetAccessToken = vi.mocked(setAccessTokenFromLogin);

function createMockUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    username: 'testuser',
    email: 'test@example.com',
    is_staff: false,
    is_superuser: false,
    first_name: 'Test',
    last_name: 'User',
    id: 1,
    ...overrides,
  };
}

function createOkResponse(data: unknown) {
  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function createUnauthorizedResponse() {
  return new Response(JSON.stringify({ detail: 'Not authenticated' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
}

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockHasSession.mockReturnValue(true);
  sessionStorage.clear();
  mockFetchApi.mockImplementation(async (path: string) => {
    if (path === '/api/me/') {
      return createOkResponse(createMockUser());
    }
    if (path === '/api/me/permissions/') {
      return createOkResponse({ permissions: {} });
    }
    return createOkResponse({});
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AuthProvider', () => {
  it('renders children', () => {
    renderHook(() => useAuth(), { wrapper });
  });

  it('starts with loading=true', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.loading).toBe(true);
  });

  it('calls /api/me/ and /api/me/permissions/ on mount', async () => {
    renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(mockFetchApi).toHaveBeenCalledWith('/api/me/');
      expect(mockFetchApi).toHaveBeenCalledWith('/api/me/permissions/');
    });
  });

  it('sets user when /api/me/ returns 200', async () => {
    const user = createMockUser({ username: 'alice' });
    mockFetchApi.mockImplementation(async (path: string) => {
      if (path === '/api/me/') return createOkResponse(user);
      if (path === '/api/me/permissions/') return createOkResponse({ permissions: {} });
      return createOkResponse({});
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(user);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('sets permissions from /api/me/permissions/', async () => {
    const perms = { dashboard: { view: true, create: false } };
    mockFetchApi.mockImplementation(async (path: string) => {
      if (path === '/api/me/') return createOkResponse(createMockUser());
      if (path === '/api/me/permissions/') return createOkResponse({ permissions: perms });
      return createOkResponse({});
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.permissions).toEqual(perms);
  });

  it('sets user=null when /api/me/ returns 401', async () => {
    mockFetchApi.mockImplementation(async (path: string) => {
      if (path === '/api/me/') return createUnauthorizedResponse();
      if (path === '/api/me/permissions/') return createUnauthorizedResponse();
      return createUnauthorizedResponse();
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('sets user=null when /api/me/ returns body without username', async () => {
    mockFetchApi.mockImplementation(async (path: string) => {
      if (path === '/api/me/') return createOkResponse({ noUsername: true });
      if (path === '/api/me/permissions/') return createOkResponse({ permissions: {} });
      return createOkResponse({});
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
  });

  it('isAdmin is true when user is_superuser', async () => {
    mockFetchApi.mockImplementation(async (path: string) => {
      if (path === '/api/me/') return createOkResponse(createMockUser({ is_superuser: true }));
      if (path === '/api/me/permissions/') return createOkResponse({ permissions: {} });
      return createOkResponse({});
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
  });

  it('isAdmin is true when user is_staff', async () => {
    mockFetchApi.mockImplementation(async (path: string) => {
      if (path === '/api/me/') return createOkResponse(createMockUser({ is_staff: true }));
      if (path === '/api/me/permissions/') return createOkResponse({ permissions: {} });
      return createOkResponse({});
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
  });

  it('isAdmin is false for regular user', async () => {
    mockFetchApi.mockImplementation(async (path: string) => {
      if (path === '/api/me/') return createOkResponse(createMockUser({ is_staff: false, is_superuser: false }));
      if (path === '/api/me/permissions/') return createOkResponse({ permissions: {} });
      return createOkResponse({});
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
  });

  it('isAuthenticated is true when user has username', async () => {
    mockFetchApi.mockImplementation(async (path: string) => {
      if (path === '/api/me/') return createOkResponse(createMockUser({ username: 'bob' }));
      if (path === '/api/me/permissions/') return createOkResponse({ permissions: {} });
      return createOkResponse({});
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
  });

  it('isAuthenticated is false when user is null', async () => {
    mockFetchApi.mockImplementation(async (path: string) => {
      if (path === '/api/me/') return createUnauthorizedResponse();
      if (path === '/api/me/permissions/') return createUnauthorizedResponse();
      return createUnauthorizedResponse();
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
  });

  it('refresh re-fetches from /api/me/', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const user = createMockUser({ username: 'refreshed' });
    mockFetchApi.mockImplementation(async (path: string) => {
      if (path === '/api/me/') return createOkResponse(user);
      if (path === '/api/me/permissions/') return createOkResponse({ permissions: { admin: { view: true } } });
      return createOkResponse({});
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockFetchApi).toHaveBeenCalledWith('/api/me/');
    expect(result.current.user?.username).toBe('refreshed');
  });

  it('signOut clears user and permissions', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeTruthy();

    act(() => {
      result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.permissions).toEqual({});
    expect(mockClearSession).toHaveBeenCalled();
  });

  it('revives cookie session when no local session flag exists', async () => {
    mockHasSession.mockReturnValue(false);
    sessionStorage.clear();
    mockFetchApi.mockImplementation(async (path: string) => {
      if (path === '/api/token/refresh/') return createOkResponse({ access: 'new-access-token' });
      if (path === '/api/me/') return createOkResponse(createMockUser({ username: 'cookie-user' }));
      if (path === '/api/me/permissions/') return createOkResponse({ permissions: { ventas: { view: true } } });
      return createOkResponse({});
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetchApi).toHaveBeenCalledWith('/api/token/refresh/', { method: 'POST' });
    expect(mockSetAccessToken).toHaveBeenCalledWith('new-access-token');
    expect(mockMarkSession).toHaveBeenCalled();
    expect(result.current.user?.username).toBe('cookie-user');
  });

  it('stays unauthenticated when cookie session cannot be revived', async () => {
    mockHasSession.mockReturnValue(false);
    sessionStorage.clear();
    mockFetchApi.mockImplementation(async (path: string) => {
      if (path === '/api/token/refresh/') return createUnauthorizedResponse();
      return createOkResponse({});
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(mockFetchApi).toHaveBeenCalledWith('/api/token/refresh/', { method: 'POST' });
    expect(mockFetchApi).not.toHaveBeenCalledWith('/api/me/');
  });
});
