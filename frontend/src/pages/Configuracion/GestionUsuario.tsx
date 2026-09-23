/**
 * Configuración › Gestión de usuarios.
 *
 * Misma estructura y tipografía que Productos: banda marina solo con la
 * identidad de la vista, búsqueda + acción principal debajo, y una tarjeta de
 * resultados con el botón «Filtrado» (menú desplegable) y los filtros activos
 * como fichas que se quitan con un clic. La lista es tabla en escritorio y
 * tarjetas en móvil. La lógica de datos y los diálogos viven en `./usuarios/`.
 *
 * Movimiento: entrada escalonada de filas (`cot-rise`), menú con `cot-pop`.
 * Solo `transform`/`opacity`; nada con `prefers-reduced-motion`.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check, CircleAlert, ListFilter, RefreshCw, Search, Trash2, UserPlus, Users, X } from 'lucide-react';
import PageMeta from '@/components/common/PageMeta';
import { AppConfirmDialog, AppModalContext } from '@/components/ui/modal-kit/ModalKit';
import '@/components/ui/modal-kit/motion.css';
import { fetchApi } from '@/config/api';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  PERMISSION_DELEGATION_USERNAMES,
  displayName,
  errorMessage,
  isAdminUser,
  isProtectedPrincipalUsername,
  type Role,
  type UserAccount,
} from './usuarios/usuariosModel';
import { Toast, type ToastState } from './usuarios/usuariosUi';
import {
  btn,
  btnSm,
  cardDescClass,
  cardShellClass,
  cardTitleClass,
  focusRing,
  fontSans,
  heroBodyClass,
  heroEyebrowClass,
  heroHeadingClass,
  sansStyle,
  searchInputClass,
} from './usuarios/usuariosStyles';
import { USER_GRID_COLS, UserRow, UserRowSkeleton } from './usuarios/UserRow';
import UserFormModal from './usuarios/UserFormModal';
import UserPermissionsModal from './usuarios/UserPermissionsModal';

type RoleFilter = 'all' | Role;
type StatusFilter = 'all' | 'active' | 'inactive';
type FormSession = { key: number; mode: 'create' | 'edit'; user: UserAccount | null; open: boolean };
type PermsSession = { key: number; user: UserAccount | null; open: boolean };

const ROLE_LABEL: Record<RoleFilter, string> = { all: 'Todos los roles', admin: 'Administradores', tecnico: 'Técnicos' };
const STATUS_LABEL: Record<StatusFilter, string> = { all: 'Todos', active: 'Con acceso', inactive: 'Sin acceso' };

const matchesQuery = (u: UserAccount, q: string) =>
  !q ||
  u.username.toLowerCase().includes(q) ||
  (u.email || '').toLowerCase().includes(q) ||
  `${u.first_name || ''} ${u.last_name || ''}`.trim().toLowerCase().includes(q);

export default function UserProfiles() {
  const { user: authUser } = useAuth();
  const canDelegatePerms = useMemo(
    () => PERMISSION_DELEGATION_USERNAMES.has((authUser?.username || '').trim().toLowerCase()),
    [authUser?.username],
  );

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const searchRef = useRef<HTMLInputElement | null>(null);

  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserAccount | null>(null);
  const [formSession, setFormSession] = useState<FormSession>({ key: 0, mode: 'create', user: null, open: false });
  const [permsSession, setPermsSession] = useState<PermsSession>({ key: 0, user: null, open: false });

  const notify = useCallback((tone: 'success' | 'error', message: string) => {
    setToast({ id: Date.now(), tone, message });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetchApi('/api/users/accounts/', { method: 'GET', cache: 'no-store' as RequestCache });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || 'Error al cargar usuarios');
      setUsers(Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []);
    } catch (e) {
      setLoadError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    void loadUsers();
  }, [loadUsers]);

  const counts = useMemo(() => {
    let admins = 0;
    let active = 0;
    for (const u of users) {
      if (isAdminUser(u)) admins++;
      if (u.is_active !== false) active++;
    }
    return {
      role: { all: users.length, admin: admins, tecnico: users.length - admins } as Record<RoleFilter, number>,
      status: { all: users.length, active, inactive: users.length - active } as Record<StatusFilter, number>,
    };
  }, [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => {
        const admin = isAdminUser(u);
        if (roleFilter === 'admin' && !admin) return false;
        if (roleFilter === 'tecnico' && admin) return false;
        const active = u.is_active !== false;
        if (statusFilter === 'active' && !active) return false;
        if (statusFilter === 'inactive' && active) return false;
        return matchesQuery(u, q);
      })
      .sort((a, b) => {
        const aAdmin = isAdminUser(a);
        const bAdmin = isAdminUser(b);
        if (aAdmin !== bAdmin) return aAdmin ? -1 : 1;
        return displayName(a).toLowerCase().localeCompare(displayName(b).toLowerCase());
      });
  }, [users, query, roleFilter, statusFilter]);

  const activeFilterCount = (roleFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);
  const hasAnyFilter = activeFilterCount > 0 || !!query.trim();
  const clearFilters = () => {
    setQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
  };

  /* ---------------------------------------------------------------------- */

  const openCreate = () => setFormSession((s) => ({ key: s.key + 1, mode: 'create', user: null, open: true }));
  const openEdit = useCallback(
    (u: UserAccount) => setFormSession((s) => ({ key: s.key + 1, mode: 'edit', user: u, open: true })),
    [],
  );
  const closeForm = useCallback(() => setFormSession((s) => ({ ...s, open: false })), []);
  const openPerms = useCallback((u: UserAccount) => setPermsSession((s) => ({ key: s.key + 1, user: u, open: true })), []);
  const closePerms = useCallback(() => setPermsSession((s) => ({ ...s, open: false })), []);

  const onFormSaved = useCallback(
    (saved: UserAccount, message: string) => {
      setUsers((prev) => (prev.some((u) => u.id === saved.id) ? prev.map((u) => (u.id === saved.id ? saved : u)) : [saved, ...prev]));
      closeForm();
      notify('success', message);
    },
    [closeForm, notify],
  );

  const onFormPatched = useCallback(
    (id: number, patch: Partial<UserAccount>, message: string) => {
      if (Object.keys(patch).length) setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
      notify('success', message);
    },
    [notify],
  );

  const onPermsSaved = useCallback(
    (message: string) => {
      closePerms();
      notify('success', message);
    },
    [closePerms, notify],
  );

  const toggleActive = useCallback(
    async (u: UserAccount) => {
      const currentlyActive = u.is_active !== false;
      if (isProtectedPrincipalUsername(u.username) && currentlyActive) {
        notify('error', 'Este usuario no puede desactivarse desde aquí.');
        return;
      }
      const next = !currentlyActive;
      setTogglingId(u.id);
      try {
        const res = await fetchApi(`/api/users/accounts/${u.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: next }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.detail || 'No se pudo actualizar el estado');
        setUsers((prev) => prev.map((row) => (row.id === u.id ? { ...row, ...(data as UserAccount) } : row)));
        notify('success', next ? 'Usuario activado' : 'Usuario desactivado');
      } catch (e) {
        notify('error', errorMessage(e));
      } finally {
        setTogglingId(null);
      }
    },
    [notify],
  );

  const doDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    try {
      const res = await fetchApi(`/api/users/accounts/${id}/`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || 'Error al eliminar usuario');
      setUsers((prev) => prev.filter((u) => u.id !== id));
      notify('success', 'Usuario eliminado');
    } catch (e) {
      notify('error', errorMessage(e));
    }
  };

  /* ---------------------------------------------------------------------- */

  const resultsDesc = loading
    ? 'Cargando el equipo…'
    : loadError
      ? 'No se pudo cargar la lista.'
      : hasAnyFilter
        ? `${filtered.length} de ${users.length} usuario${users.length === 1 ? '' : 's'} coinciden.`
        : `${users.length} usuario${users.length === 1 ? '' : 's'} registrado${users.length === 1 ? '' : 's'}.`;

  return (
    <>
      <PageMeta
        title="Gestión de usuarios | Sistema Grupo Intrax GPS"
        description="Administración de cuentas, roles, permisos y firma digital"
      />
      <div className="min-h-[calc(100dvh-5rem)] overflow-x-hidden">
        <div
          className="mx-auto w-full max-w-[min(100%,1920px)] space-y-6 px-3 pb-10 pt-6 text-sm sm:space-y-7 sm:px-5 sm:pb-12 sm:pt-7 sm:text-base md:px-6 lg:px-8 xl:px-10 2xl:max-w-[min(100%,2200px)]"
          style={sansStyle}
        >
          <nav
            className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]"
            aria-label="Migas de pan"
          >
            <Link
              to="/"
              className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-black/[0.04] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC]"
            >
              Inicio
            </Link>
            <span className="text-[#D3D3D8] dark:text-[#3D3D4A]" aria-hidden>
              /
            </span>
            <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]" aria-current="page">
              Usuarios
            </span>
          </nav>

          <div className="flex flex-col gap-4">
            {/* Banda marina: solo identidad de la vista (mismo corte que Productos). */}
            <header className="cot-rise relative overflow-hidden rounded-[24px] bg-[#17235B] px-5 py-6 dark:bg-[#1B2A63] sm:px-8 sm:py-8">
              <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#E6A23C]/15 blur-3xl" aria-hidden />
              <div className="relative flex min-w-0 items-start gap-4">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]">
                  <Users className="size-5" strokeWidth={1.6} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className={heroEyebrowClass}>Configuración</p>
                  <h1 className={cn('mt-1', heroHeadingClass)}>Gestión de usuarios</h1>
                  <p className={cn('mt-1.5 max-w-[60ch]', heroBodyClass)}>
                    Crea cuentas, asigna roles, define qué puede ver y hacer cada persona, y administra su correo de envío y firma.
                  </p>
                </div>
              </div>
            </header>

            {/* Búsqueda + acción principal */}
            <div className="cot-rise grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:gap-4" style={{ '--cot-i': 1 } as CSSProperties}>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6E6E77] dark:text-[#64748B] sm:left-3.5"
                  aria-hidden
                />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' && query) {
                      e.preventDefault();
                      setQuery('');
                    }
                  }}
                  placeholder="Buscar por nombre, usuario o correo…"
                  aria-label="Buscar usuarios"
                  className={cn(searchInputClass, '[&::-webkit-search-cancel-button]:hidden')}
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      searchRef.current?.focus();
                    }}
                    aria-label="Limpiar búsqueda"
                    className={cn(
                      'absolute inset-y-0 right-0 my-1 mr-1 inline-flex w-10 items-center justify-center rounded-lg text-[#6E6E77] transition-colors hover:bg-[#E7E7EA]/60 hover:text-[#52525B] dark:text-[#8EA0B8] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC]',
                      focusRing,
                    )}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                ) : null}
              </div>
              <button type="button" onClick={openCreate} className={cn(btn.primary, 'w-full px-6 sm:w-auto')}>
                <UserPlus aria-hidden />
                Nuevo usuario
              </button>
            </div>

            {/* Resultados */}
            <section
              className={cn(cardShellClass, 'cot-rise mt-1')}
              style={{ '--cot-i': 2 } as CSSProperties}
              aria-labelledby="usuarios-resultados"
            >
              <div className="flex items-start justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
                <div className="min-w-0">
                  <h2 id="usuarios-resultados" className={cardTitleClass}>
                    Usuarios
                  </h2>
                  <p className={cardDescClass} aria-live="polite">
                    {resultsDesc}
                  </p>
                </div>
                <FilterMenu
                  role={roleFilter}
                  status={statusFilter}
                  counts={counts}
                  activeCount={activeFilterCount}
                  onRole={setRoleFilter}
                  onStatus={setStatusFilter}
                  onClear={() => {
                    setRoleFilter('all');
                    setStatusFilter('all');
                  }}
                />
              </div>

              {hasAnyFilter ? (
                <div className="cot-fade flex flex-wrap items-center gap-2 px-4 pb-4 sm:px-6" aria-label="Filtros activos">
                  {query.trim() ? <FilterChip label={`Búsqueda: «${query.trim()}»`} onRemove={() => setQuery('')} /> : null}
                  {roleFilter !== 'all' ? <FilterChip label={`Rol: ${ROLE_LABEL[roleFilter]}`} onRemove={() => setRoleFilter('all')} /> : null}
                  {statusFilter !== 'all' ? (
                    <FilterChip label={`Acceso: ${STATUS_LABEL[statusFilter]}`} onRemove={() => setStatusFilter('all')} />
                  ) : null}
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-md px-1.5 py-1 text-[13px] font-medium text-[#1B5CFF] transition-colors hover:text-[#1244D1] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:text-[#7EA0FF]"
                  >
                    Limpiar todo
                  </button>
                </div>
              ) : null}

              <div className="overflow-hidden rounded-b-[24px] border-t border-[#F0F0F2] dark:border-[#1F2A3C]">
                {/* Cabecera de columnas (solo escritorio) */}
                <div
                  className={cn(
                    'hidden border-b border-[#F0F0F2] bg-[#FAFAFA] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:border-[#1F2A3C] dark:bg-[#0F172A]/60 dark:text-[#8EA0B8] lg:grid lg:gap-x-5',
                    USER_GRID_COLS,
                  )}
                  aria-hidden
                >
                  <span>Usuario</span>
                  <span>Rol</span>
                  <span>Correo de envío</span>
                  <span>Acceso al sistema</span>
                  <span className="w-[7.75rem] text-right">Acciones</span>
                </div>

                {loading ? (
                  <ul className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]" aria-busy="true" aria-label="Cargando usuarios">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <UserRowSkeleton key={i} index={i} />
                    ))}
                  </ul>
                ) : loadError ? (
                  <EmptyState
                    tone="error"
                    icon={<CircleAlert aria-hidden />}
                    title="No pudimos cargar a los usuarios"
                    text={loadError}
                    action={
                      <button type="button" onClick={() => void loadUsers()} className={btn.secondary}>
                        <RefreshCw aria-hidden />
                        Reintentar
                      </button>
                    }
                  />
                ) : filtered.length ? (
                  <ul className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]">
                    {filtered.map((u, i) => (
                      <UserRow
                        key={u.id}
                        user={u}
                        index={i}
                        toggling={togglingId === u.id}
                        onEdit={openEdit}
                        onPerms={openPerms}
                        onDelete={setDeleteTarget}
                        onToggleActive={toggleActive}
                      />
                    ))}
                  </ul>
                ) : users.length ? (
                  <EmptyState
                    icon={<Search aria-hidden />}
                    title="No encontramos coincidencias"
                    text="Prueba con otra búsqueda o limpia los filtros."
                    action={
                      <button type="button" onClick={clearFilters} className={btn.secondary}>
                        Limpiar filtros
                      </button>
                    }
                  />
                ) : (
                  <EmptyState
                    icon={<Users aria-hidden />}
                    title="Aún no hay usuarios"
                    text="Crea la primera cuenta para que tu equipo pueda iniciar sesión."
                    action={
                      <button type="button" onClick={openCreate} className={btn.primary}>
                        <UserPlus aria-hidden />
                        Nuevo usuario
                      </button>
                    }
                  />
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      <UserFormModal
        key={`form-${formSession.key}`}
        open={formSession.open}
        mode={formSession.mode}
        user={formSession.user}
        canDelegatePerms={canDelegatePerms}
        onClose={closeForm}
        onSaved={onFormSaved}
        onPatched={onFormPatched}
      />

      <UserPermissionsModal
        key={`perms-${permsSession.key}`}
        open={permsSession.open}
        user={permsSession.user}
        canDelegatePerms={canDelegatePerms}
        authUserId={typeof authUser?.id === 'number' ? authUser.id : null}
        onClose={closePerms}
        onSaved={onPermsSaved}
      />

      <AppConfirmDialog
        className={fontSans}
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        tone="danger"
        icon={<Trash2 className="size-5" />}
        title="Eliminar usuario"
        description="Perderá el acceso de inmediato. Esta acción no se puede deshacer."
        detail={
          deleteTarget ? (
            <AppModalContext
              rows={[
                { label: 'Nombre', value: displayName(deleteTarget), strong: true },
                { label: 'Usuario', value: `@${deleteTarget.username}` },
                { label: 'Rol', value: isAdminUser(deleteTarget) ? 'Administrador' : 'Técnico' },
              ]}
            />
          ) : null
        }
        confirmLabel="Eliminar usuario"
        busyLabel="Eliminando…"
      />

      <Toast toast={toast} onDismiss={dismissToast} />
    </>
  );
}

/* --------------------------------------------------------------------------
   Filtrado (mismo patrón que Productos: botón + menú desplegable)
   -------------------------------------------------------------------------- */

function FilterMenu({
  role,
  status,
  counts,
  activeCount,
  onRole,
  onStatus,
  onClear,
}: {
  role: RoleFilter;
  status: StatusFilter;
  counts: { role: Record<RoleFilter, number>; status: Record<StatusFilter, number> };
  activeCount: number;
  onRole: (v: RoleFilter) => void;
  onStatus: (v: StatusFilter) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={menuId}
        className={cn(btn.secondary, btnSm, open && 'border-[#D3D3D8] bg-[#FAFAFA] dark:bg-[#243048]')}
      >
        <ListFilter aria-hidden />
        Filtrado
        {activeCount ? (
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#1B5CFF] text-[11px] font-semibold tabular-nums text-white dark:bg-[#4B7CFF]">
            {activeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={menuId}
          className="cot-pop absolute right-0 z-[120] mt-2 w-[min(20rem,calc(100vw-2.5rem))] origin-top-right rounded-[16px] border border-[#E7E7EA] bg-white p-4 shadow-[0_12px_32px_-12px_rgba(9,9,11,0.25)] dark:border-[#273244] dark:bg-[#151E32]"
        >
          <FilterGroup
            label="Rol"
            value={role}
            onChange={onRole}
            options={(['all', 'admin', 'tecnico'] as RoleFilter[]).map((v) => ({ value: v, label: ROLE_LABEL[v], count: counts.role[v] }))}
          />
          <div className="my-4 h-px bg-[#F0F0F2] dark:bg-[#273244]" />
          <FilterGroup
            label="Acceso al sistema"
            value={status}
            onChange={onStatus}
            options={(['all', 'active', 'inactive'] as StatusFilter[]).map((v) => ({
              value: v,
              label: STATUS_LABEL[v],
              count: counts.status[v],
            }))}
          />
          <div className="mt-4 flex items-center gap-2">
            <button type="button" onClick={onClear} disabled={!activeCount} className={cn(btn.secondary, 'h-10 flex-1 px-3 text-[13px]')}>
              Limpiar filtros
            </button>
            <button type="button" onClick={() => setOpen(false)} className={cn(btn.primary, 'h-10 flex-1 px-3 text-[13px]')}>
              Listo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count: number }[];
}) {
  const labelId = useId();
  return (
    <div>
      <p id={labelId} className="mb-2 text-[13px] font-medium text-[#52525B] dark:text-[#B7C1D1]">
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="space-y-1">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              className={cn(
                'flex h-10 w-full items-center gap-2.5 rounded-[10px] px-3 text-left text-[14px] transition-colors duration-150',
                on
                  ? 'bg-[rgba(27,92,255,0.08)] font-medium text-[#1244D1] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#9BB6FF]'
                  : 'text-[#3F3F46] hover:bg-[#FAFAFA] dark:text-[#D6DEEA] dark:hover:bg-[#1B2539]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40',
              )}
            >
              <span className="inline-flex size-4 shrink-0 items-center justify-center" aria-hidden>
                {on ? <Check className="cot-tick size-4" strokeWidth={2.5} /> : null}
              </span>
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
              <span className="text-[12px] tabular-nums text-[#6E6E77] dark:text-[#8EA0B8]">{o.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="cot-pop inline-flex max-w-full items-center gap-1 rounded-full border border-[rgba(27,92,255,0.28)] bg-[rgba(27,92,255,0.07)] py-1 pl-3 pr-1 text-[13px] font-medium text-[#1B5CFF] dark:border-[#4B7CFF]/35 dark:bg-[rgba(75,124,255,0.14)] dark:text-[#9BB6FF]">
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar filtro ${label}`}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[rgba(27,92,255,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}

function EmptyState({
  icon,
  title,
  text,
  action,
  tone = 'neutral',
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
  tone?: 'neutral' | 'error';
}) {
  return (
    <div className="cot-fade flex flex-col items-center px-6 py-14 text-center" role={tone === 'error' ? 'alert' : undefined}>
      <span
        className={cn(
          'inline-flex size-12 items-center justify-center rounded-[14px] [&_svg]:size-6',
          tone === 'error'
            ? 'bg-[#FEF2F2] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]'
            : 'bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]',
        )}
      >
        {icon}
      </span>
      <p className="mt-3 text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] leading-[19px] text-[#6E6E77] dark:text-[#8EA0B8]">{text}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
