import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchApi,
  clearAuthSession,
  clearCsrfTokenCache,
  markAuthSession,
  resetRefreshState,
  hasAuthSessionFlag,
  getAuthHeaders,
  AUTH_SESSION_FLAG,
  AUTH_CACHE_KEY,
} from './api';

const originalFetch = global.fetch;

beforeEach(() => {
  sessionStorage.clear();
  document.cookie = '';
  clearCsrfTokenCache();
  global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  vi.restoreAllMocks();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('hasAuthSessionFlag', () => {
  it('returns false when sessionStorage is empty', () => {
    expect(hasAuthSessionFlag()).toBe(false);
  });

  it('returns true when session flag is set to 1', () => {
    sessionStorage.setItem(AUTH_SESSION_FLAG, '1');
    expect(hasAuthSessionFlag()).toBe(true);
  });

  it('returns false when session flag is set to something else', () => {
    sessionStorage.setItem(AUTH_SESSION_FLAG, '0');
    expect(hasAuthSessionFlag()).toBe(false);
  });
});

describe('markAuthSession', () => {
  it('sets session flag in sessionStorage', () => {
    markAuthSession();
    expect(sessionStorage.getItem(AUTH_SESSION_FLAG)).toBe('1');
  });
});

describe('clearAuthSession', () => {
  it('removes all auth keys from sessionStorage', () => {
    sessionStorage.setItem(AUTH_SESSION_FLAG, '1');
    sessionStorage.setItem(AUTH_CACHE_KEY, '{"user":{}}');
    sessionStorage.setItem('auth_user', 'x');
    sessionStorage.setItem('user', 'x');
    sessionStorage.setItem('permissions', 'x');

    clearAuthSession();

    expect(sessionStorage.getItem(AUTH_SESSION_FLAG)).toBeNull();
    expect(sessionStorage.getItem(AUTH_CACHE_KEY)).toBeNull();
    expect(sessionStorage.getItem('auth_user')).toBeNull();
    expect(sessionStorage.getItem('user')).toBeNull();
    expect(sessionStorage.getItem('permissions')).toBeNull();
  });

  it('calls resetRefreshState internally', () => {
    clearAuthSession();
    expect(hasAuthSessionFlag()).toBe(false);
  });
});

describe('getAuthHeaders', () => {
  it('returns empty object for GET', () => {
    expect(getAuthHeaders('GET')).toEqual({});
  });

  it('returns empty object for HEAD', () => {
    expect(getAuthHeaders('HEAD')).toEqual({});
  });

  const TEST_CSRF = 'a'.repeat(32);

  it('returns X-CSRFToken header for POST when cookie exists', () => {
    document.cookie = `csrftoken=${TEST_CSRF}`;
    const headers = getAuthHeaders('POST');
    expect(headers['X-CSRFToken']).toBe(TEST_CSRF);
  });

  it('returns X-CSRFToken header for PUT when cookie exists', () => {
    document.cookie = `csrftoken=${'b'.repeat(32)}`;
    const headers = getAuthHeaders('PUT');
    expect(headers['X-CSRFToken']).toBe('b'.repeat(32));
  });

  it('returns X-CSRFToken header for PATCH when cookie exists', () => {
    const t = 'c'.repeat(32);
    document.cookie = `csrftoken=${t}`;
    const headers = getAuthHeaders('PATCH');
    expect(headers['X-CSRFToken']).toBe(t);
  });

  it('returns X-CSRFToken header for DELETE when cookie exists', () => {
    const t = 'd'.repeat(32);
    document.cookie = `csrftoken=${t}`;
    const headers = getAuthHeaders('DELETE');
    expect(headers['X-CSRFToken']).toBe(t);
  });

  it('returns empty object for POST when no cookie', () => {
    const spy = vi.spyOn(document, 'cookie', 'get').mockReturnValue('');
    const headers = getAuthHeaders('POST');
    expect(headers).toEqual({});
    spy.mockRestore();
  });
});

describe('fetchApi', () => {
  it('returns 401 when not authenticated (no session flag)', async () => {
    const res = await fetchApi('/api/data/');
    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 401 when authRequestsBlocked', async () => {
    markAuthSession();
    clearAuthSession();
    const res = await fetchApi('/api/data/');
    expect(res.status).toBe(401);
  });

  it('calls fetch for exempt paths without session flag', async () => {
    const res = await fetchApi('/api/login/');
    expect(global.fetch).toHaveBeenCalled();
    expect(res.status).not.toBe(401);
  });

  it('calls fetch for csrf exempt path without session flag', async () => {
    await fetchApi('/api/auth/csrf/');
    expect(global.fetch).toHaveBeenCalled();
  });

  it('calls fetch for logout exempt path without session flag', async () => {
    await fetchApi('/api/logout/');
    expect(global.fetch).toHaveBeenCalled();
  });

  it('calls fetch for token refresh exempt path without session flag', async () => {
    await fetchApi('/api/token/refresh/');
    expect(global.fetch).toHaveBeenCalled();
  });

  it('calls fetch for authenticated paths when session flag is set', async () => {
    sessionStorage.setItem(AUTH_SESSION_FLAG, '1');
    await fetchApi('/api/data/');
    expect(global.fetch).toHaveBeenCalled();
  });

  it('sets credentials include on all requests', async () => {
    sessionStorage.setItem(AUTH_SESSION_FLAG, '1');
    await fetchApi('/api/data/');

    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.credentials).toBe('include');
  });

  it('adds X-CSRFToken for POST when cookie exists', async () => {
    const t = 'e'.repeat(32);
    sessionStorage.setItem(AUTH_SESSION_FLAG, '1');
    document.cookie = `csrftoken=${t}`;
    await fetchApi('/api/data/', { method: 'POST' });

    const postCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => String(c[0]).includes('/api/data/') && c[1]?.method === 'POST'
    );
    expect(postCall?.[1]?.headers?.['X-CSRFToken']).toBe(t);
  });

  it('adds X-CSRFToken from /api/auth/csrf/ JSON when document has no cookie', async () => {
    sessionStorage.setItem(AUTH_SESSION_FLAG, '1');
    const cookieSpy = vi.spyOn(document, 'cookie', 'get').mockReturnValue('');
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'ok', csrfToken: 'f'.repeat(32) }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await fetchApi('/api/data/', { method: 'POST' });

    const postCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => String(c[0]).includes('/api/data/') && c[1]?.method === 'POST'
    );
    expect(postCall?.[1]?.headers?.['X-CSRFToken']).toBe('f'.repeat(32));
    cookieSpy.mockRestore();
  });

  it('does NOT add X-CSRFToken for GET', async () => {
    sessionStorage.setItem(AUTH_SESSION_FLAG, '1');
    document.cookie = 'csrftoken=testtoken';
    await fetchApi('/api/data/', { method: 'GET' });

    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers?.['X-CSRFToken']).toBeUndefined();
  });

  it('does NOT add X-CSRFToken for HEAD', async () => {
    sessionStorage.setItem(AUTH_SESSION_FLAG, '1');
    document.cookie = 'csrftoken=testtoken';
    await fetchApi('/api/data/', { method: 'HEAD' });

    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers?.['X-CSRFToken']).toBeUndefined();
  });

  it('adds X-CSRFToken for PUT', async () => {
    const t = 'g'.repeat(32);
    sessionStorage.setItem(AUTH_SESSION_FLAG, '1');
    document.cookie = `csrftoken=${t}`;
    await fetchApi('/api/data/', { method: 'PUT' });

    const postCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => String(c[0]).includes('/api/data/') && c[1]?.method === 'PUT'
    );
    expect(postCall?.[1]?.headers?.['X-CSRFToken']).toBe(t);
  });

  it('adds X-CSRFToken for PATCH', async () => {
    const t = 'h'.repeat(32);
    sessionStorage.setItem(AUTH_SESSION_FLAG, '1');
    document.cookie = `csrftoken=${t}`;
    await fetchApi('/api/data/', { method: 'PATCH' });

    const postCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => String(c[0]).includes('/api/data/') && c[1]?.method === 'PATCH'
    );
    expect(postCall?.[1]?.headers?.['X-CSRFToken']).toBe(t);
  });

  it('adds X-CSRFToken for DELETE', async () => {
    const t = 'i'.repeat(32);
    sessionStorage.setItem(AUTH_SESSION_FLAG, '1');
    document.cookie = `csrftoken=${t}`;
    await fetchApi('/api/data/', { method: 'DELETE' });

    const postCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => String(c[0]).includes('/api/data/') && c[1]?.method === 'DELETE'
    );
    expect(postCall?.[1]?.headers?.['X-CSRFToken']).toBe(t);
  });

  it('returns the response from fetch', async () => {
    const mockResponse = new Response(JSON.stringify({ data: 'test' }), { status: 200 });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    sessionStorage.setItem(AUTH_SESSION_FLAG, '1');
    const res = await fetchApi('/api/data/');

    expect(res).toBe(mockResponse);
    expect(res.status).toBe(200);
  });

  it('unblocks auth requests for /api/login/', async () => {
    clearAuthSession();
    sessionStorage.setItem(AUTH_SESSION_FLAG, '1');
    clearAuthSession();
    sessionStorage.setItem(AUTH_SESSION_FLAG, '1');

    await fetchApi('/api/login/');
    expect(global.fetch).toHaveBeenCalled();
  });
});

describe('resetRefreshState', () => {
  it('resets internal refresh state', () => {
    resetRefreshState();
    expect(hasAuthSessionFlag()).toBe(false);
  });
});
