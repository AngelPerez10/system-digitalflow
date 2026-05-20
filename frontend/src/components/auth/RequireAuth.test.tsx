import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import RequireAuth from './RequireAuth';
import * as authContext from '@/context/AuthContext';

const { mockedNavigate } = vi.hoisted(() => ({
  mockedNavigate: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to, replace }: { to: string; replace?: boolean }) => {
      mockedNavigate(to, { replace });
      return null;
    },
    useLocation: () => ({ pathname: '/dashboard', search: '', hash: '', state: null, key: 'test-key' }),
  };
});

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockUseAuth = vi.mocked(authContext.useAuth);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RequireAuth', () => {
  it('shows loading message while checking auth', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      permissions: {},
      isAdmin: false,
      isAuthenticated: false,
      loading: true,
      refresh: vi.fn(),
      applyLoginSession: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>
    );

    expect(screen.getByText('Verificando sesión...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to /signin when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      permissions: {},
      isAdmin: false,
      isAuthenticated: false,
      loading: false,
      refresh: vi.fn(),
      applyLoginSession: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(mockedNavigate).toHaveBeenCalledWith('/signin', { replace: true });
  });

  it('shows children when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: {
        username: 'alice',
        email: 'alice@test.com',
        is_staff: false,
        is_superuser: false,
        first_name: 'Alice',
        last_name: 'Smith',
        id: 1,
      },
      permissions: {},
      isAdmin: false,
      isAuthenticated: true,
      loading: false,
      refresh: vi.fn(),
      applyLoginSession: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('does not show loading or redirect when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: {
        username: 'bob',
        email: 'bob@test.com',
        is_staff: true,
        is_superuser: false,
        first_name: 'Bob',
        last_name: 'Jones',
        id: 2,
      },
      permissions: { dashboard: { view: true } },
      isAdmin: true,
      isAuthenticated: true,
      loading: false,
      refresh: vi.fn(),
      applyLoginSession: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <RequireAuth>
        <div>Secret Admin Panel</div>
      </RequireAuth>
    );

    expect(screen.queryByText('Verificando sesión...')).not.toBeInTheDocument();
    expect(mockedNavigate).not.toHaveBeenCalled();
    expect(screen.getByText('Secret Admin Panel')).toBeInTheDocument();
  });
});
