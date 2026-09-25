/**
 * Permisos por módulo de un usuario, en forma de tabla.
 *
 *   Módulo · Ver · Crear · Editar · Eliminar · Alcance
 *
 * Reglas visibles (sin sorpresas al guardar):
 *  - «Ver» hace que el módulo aparezca en su menú. Crear/Editar/Eliminar lo
 *    requieren: marcarlas activa «Ver» y quitar «Ver» las quita.
 *  - «Alcance» (órdenes, proyectos, reportes de mantenimiento, cotizaciones):
 *    solo sus registros o los de todo el equipo.
 *  - Lo que el guardado anula para técnicos se muestra bloqueado.
 *
 * En escritorio es una tabla con encabezado fijo y casillas de columna; en
 * móvil cada módulo es una tarjeta con las casillas etiquetadas.
 */
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookUser,
  Boxes,
  ChartColumn,
  Check,
  ClipboardCheck,
  ClipboardList,
  Cog,
  Contact,
  DollarSign,
  Eye,
  FileText,
  Layers,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Lock,
  Minus,
  Package,
  Satellite,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserCog,
  Users,
  Warehouse,
  Wrench,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { AppModalFooter, AppModalHeader } from '@/components/ui/modal-kit/ModalKit';
import { fetchApi } from '@/config/api';
import { cn } from '@/lib/utils';
import {
  PERM_ACTIONS,
  SCOPED_MODULES,
  applyPermChange,
  displayName,
  errorMessage,
  isAdminUser,
  lockedForTecnico,
  normalizePerms,
  permissionSectionsFor,
  type CrudPerms,
  type ModuleKey,
  type PermAction,
  type PermissionSectionKey,
  type PermissionsPayload,
  type UserAccount,
} from './usuariosModel';
import { InlineAlert } from './usuariosUi';
import { btn, formModalShellClass } from './usuariosStyles';

const MODULE_ICON: Record<ModuleKey, ReactNode> = {
  tareas: <ListChecks aria-hidden />,
  clientes: <Contact aria-hidden />,
  productos: <Package aria-hidden />,
  servicios: <Wrench aria-hidden />,
  cotizaciones: <FileText aria-hidden />,
  ordenes: <ClipboardList aria-hidden />,
  proyectos: <Layers aria-hidden />,
  inventario: <Warehouse aria-hidden />,
  reportes: <ChartColumn aria-hidden />,
  cuentas_antarix: <Satellite aria-hidden />,
  polizas: <ShieldCheck aria-hidden />,
  reportes_mantenimiento: <ClipboardCheck aria-hidden />,
  usuarios: <UserCog aria-hidden />,
};

const SECTION_ICON: Record<PermissionSectionKey, ReactNode> = {
  escritorio: <LayoutDashboard aria-hidden />,
  contactos: <BookUser aria-hidden />,
  productos_servicios: <Boxes aria-hidden />,
  ventas: <TrendingUp aria-hidden />,
  operaciones: <Cog aria-hidden />,
  configuracion: <Settings aria-hidden />,
};

/** Columnas de la tabla (sm+). Móvil: 4 columnas de casillas. */
const ROW_GRID = 'grid grid-cols-4 gap-x-2 sm:grid-cols-[minmax(0,1fr)_repeat(4,4.25rem)_10rem] sm:gap-x-1';

const headCellClass = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]';

/** Filas de la sección "Permisos especiales" (fuera de la matriz CRUD). */
const LIQUIDAR_ROWS: { key: ModuleKey; label: string }[] = [
  { key: 'ordenes', label: 'Puede liquidar Órdenes de trabajo' },
  { key: 'proyectos', label: 'Puede liquidar Proyectos' },
];

const TEMPLATES = [
  { key: 'full', label: 'Acceso total', hint: 'Ver, crear, editar y eliminar en todos los módulos' },
  { key: 'read', label: 'Solo consulta', hint: 'Ver todos los módulos, sin hacer cambios' },
  { key: 'none', label: 'Sin acceso', hint: 'Ocultar todos los módulos' },
] as const;

type Props = {
  open: boolean;
  user: UserAccount | null;
  canDelegatePerms: boolean;
  authUserId: number | null;
  onClose: () => void;
  onSaved: (message: string) => void;
};

export default function UserPermissionsModal({ open, user, canDelegatePerms, authUserId, onClose, onSaved }: Props) {
  const navigate = useNavigate();
  const titleId = useId();
  const descId = useId();

  /* La carga normaliza con el rol visible; edición y guardado con is_staff/is_superuser (igual que antes). */
  const staffAdmin = !!(user?.is_superuser || user?.is_staff);
  const [perms, setPerms] = useState<PermissionsPayload>({});
  const [initial, setInitial] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    let alive = true;
    const settle = (p: PermissionsPayload) => {
      const n = normalizePerms(p, { isAdmin: isAdminUser(user) });
      setInitial(JSON.stringify(normalizePerms(n, { isAdmin: staffAdmin })));
      setPerms(n);
    };
    fetchApi(`/api/users/accounts/${user.id}/permissions/`, { method: 'GET', cache: 'no-store' as RequestCache })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.detail || 'No se pudieron cargar los permisos');
        if (alive) settle(data?.permissions || {});
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(errorMessage(e));
        settle({});
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // Solo al abrir: el componente se re-monta (key) en cada apertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sections = useMemo(() => permissionSectionsFor(staffAdmin), [staffAdmin]);
  const current = useMemo(() => normalizePerms(perms, { isAdmin: staffAdmin }), [perms, staffAdmin]);
  const allKeys = useMemo(() => sections.flatMap((s) => s.modules.map((m) => m.key)), [sections]);
  const visibleCount = allKeys.filter((k) => (current[k] as CrudPerms).view).length;
  const dirty = !loading && !!initial && JSON.stringify(current) !== initial;
  const readOnly = !canDelegatePerms;

  const isLocked = (key: ModuleKey, action: PermAction) => !staffAdmin && lockedForTecnico(key, action);

  /** Aplica varios cambios (con sus dependencias) en una sola actualización. */
  const change = (items: { key: ModuleKey; action: PermAction; value: boolean }[]) => {
    if (readOnly) return;
    setPerms((prev) => {
      const next = normalizePerms(prev, { isAdmin: staffAdmin });
      for (const it of items) {
        if (isLocked(it.key, it.action)) continue;
        next[it.key] = applyPermChange(next[it.key] as CrudPerms, it.action, it.value);
      }
      return next;
    });
  };

  const setScope = (key: ModuleKey, ownOnly: boolean) => {
    if (readOnly) return;
    setPerms((prev) => {
      const next = normalizePerms(prev, { isAdmin: staffAdmin });
      next[key] = { ...next[key], own_only: ownOnly };
      return next;
    });
  };

  const setLiquidar = (key: ModuleKey, value: boolean) => {
    if (readOnly) return;
    setPerms((prev) => {
      const next = normalizePerms(prev, { isAdmin: staffAdmin });
      next[key] = { ...next[key], liquidar: value };
      return next;
    });
  };

  const applyTemplate = (t: (typeof TEMPLATES)[number]['key']) =>
    change(
      allKeys.flatMap((key): { key: ModuleKey; action: PermAction; value: boolean }[] =>
        t === 'none'
          ? [{ key, action: 'view', value: false }]
          : [
              { key, action: 'view', value: true },
              ...(['create', 'edit', 'delete'] as const).map((action) => ({ key, action, value: t === 'full' })),
            ],
      ),
    );

  const columnState = (action: PermAction) => {
    const keys = allKeys.filter((k) => !isLocked(k, action));
    const on = keys.filter((k) => (current[k] as CrudPerms)[action]).length;
    return { checked: on > 0 && on === keys.length, indeterminate: on > 0 && on < keys.length, keys };
  };

  const save = async () => {
    if (!user) return;
    if (!canDelegatePerms) {
      setError('Solo Angel Pérez e Ivan Cruz pueden modificar permisos de usuarios.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const merged = normalizePerms(perms, { isAdmin: staffAdmin });
      const payloadPerms = staffAdmin
        ? perms
        : {
            ...perms,
            // Cotizaciones: los técnicos pueden tener permisos granulares (ver/crear/editar/eliminar)
            cotizaciones: merged.cotizaciones,
            productos: merged.productos,
            servicios: merged.servicios,
            cuentas_antarix: merged.cuentas_antarix,
            usuarios: { view: false, create: false, edit: false, delete: false },
            reportes: { ...merged.reportes, delete: false },
          };

      const res = await fetchApi(`/api/users/accounts/${user.id}/permissions/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: payloadPerms }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || 'No se pudieron guardar los permisos');

      if (authUserId != null && authUserId === user.id) {
        window.dispatchEvent(new Event('permissions:updated'));
        const effective = staffAdmin ? merged.usuarios : (payloadPerms as PermissionsPayload).usuarios;
        if (effective && effective.view === false) {
          navigate('/', { replace: true });
          return;
        }
      }
      onSaved('Permisos actualizados');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const legendStrong = 'font-semibold text-[#09090B] dark:text-[#F8FAFC]';
  const legendIcon = 'mt-px size-4 shrink-0 text-[#1B5CFF] dark:text-[#7EA0FF]';

  return (
    <Modal
      mobileBottomSheet
      isOpen={open}
      onClose={() => !saving && onClose()}
      closeOnBackdropClick={false}
      closeOnEscape={!saving}
      showCloseButton={false}
      className={cn(formModalShellClass, 'sm:max-w-4xl')}
      ariaLabelledBy={titleId}
      ariaDescribedBy={descId}
    >
      <AppModalHeader
        tone="info"
        icon={<ShieldCheck className="size-5" />}
        eyebrow="Permisos"
        title={user ? displayName(user) : 'Usuario'}
        titleId={titleId}
        description={user ? `@${user.username} · ${isAdminUser(user) ? 'Administrador' : 'Técnico'}` : undefined}
        descriptionId={descId}
        onClose={onClose}
        closeDisabled={saving}
      />

      {/* Cómo leer la tabla + plantillas */}
      <div className="shrink-0 space-y-3 border-y border-[#F0F0F2] bg-[#FAFAFA] px-5 py-4 dark:border-[#1F2A3C] dark:bg-[#0F172A]/60 sm:px-6">
        <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-[13px] leading-[18px] text-[#52525B] dark:text-[#B7C1D1] md:grid-cols-3">
          <li className="flex gap-2">
            <Eye className={legendIcon} aria-hidden />
            <span>
              <b className={legendStrong}>Ver</b> muestra el módulo en su menú.
            </span>
          </li>
          <li className="flex gap-2">
            <Check className={legendIcon} aria-hidden />
            <span>
              <b className={legendStrong}>Crear, Editar y Eliminar</b> requieren Ver.
            </span>
          </li>
          <li className="flex gap-2">
            <Users className={legendIcon} aria-hidden />
            <span>
              <b className={legendStrong}>Alcance</b>: solo sus registros o los del equipo.
            </span>
          </li>
        </ul>
        {!readOnly ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="shrink-0 text-[13px] font-medium text-[#52525B] dark:text-[#B7C1D1]">Plantilla rápida:</span>
            <div className="grid grid-cols-3 gap-1.5 sm:flex">
              {TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  title={t.hint}
                  disabled={loading}
                  onClick={() => applyTemplate(t.key)}
                  className={cn(btn.secondary, 'h-9 px-3 text-[13px]')}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {readOnly && !loading ? (
          <div className="px-5 pt-4 sm:px-6">
            <InlineAlert tone="info" title="Solo lectura">
              Solo Angel Pérez e Ivan Cruz pueden cambiar permisos de otros usuarios, incluidos administradores.
            </InlineAlert>
          </div>
        ) : null}
        {error ? (
          <div className="px-5 pt-4 sm:px-6">
            <InlineAlert title="No se pudo completar">{error}</InlineAlert>
          </div>
        ) : null}

        {/* Encabezado fijo de columnas (sm+) con casilla de columna completa */}
        <div
          className={cn(
            ROW_GRID,
            'sticky top-0 z-10 hidden items-end border-b border-[#F0F0F2] bg-white/95 px-6 py-2.5 backdrop-blur-sm dark:border-[#1F2A3C] dark:bg-[#111827]/95 sm:grid',
          )}
        >
          <span className={cn(headCellClass, 'pb-0.5')}>Módulo</span>
          {PERM_ACTIONS.map((a) => {
            const st = columnState(a.key);
            return (
              <div key={a.key} className="flex flex-col items-center gap-1.5">
                <span className={headCellClass}>{a.label}</span>
                <Checkbox
                  checked={st.checked}
                  indeterminate={st.indeterminate}
                  disabled={readOnly || loading}
                  onChange={(v) => change(st.keys.map((key) => ({ key, action: a.key, value: v })))}
                  label={`${st.checked ? 'Quitar' : 'Marcar'} «${a.label}» en todos los módulos`}
                  danger={a.key === 'delete'}
                />
              </div>
            );
          })}
          <span className={cn(headCellClass, 'pb-0.5 pl-2')}>Alcance</span>
        </div>

        {loading ? (
          <div className="space-y-2 px-5 py-5 sm:px-6" aria-busy="true" aria-label="Cargando permisos">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2" style={{ opacity: 1 - i * 0.13 }}>
                <span className="size-8 shrink-0 rounded-[9px] bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
                <span className="h-3.5 w-40 rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
                <span className="ml-auto hidden h-5 w-72 rounded-md bg-[#F4F4F5] motion-safe:animate-pulse dark:bg-[#151E32] sm:block" />
              </div>
            ))}
          </div>
        ) : (
          <div className="pb-2">
            {sections.map((sec, si) => (
              <section key={sec.key} aria-labelledby={`${titleId}-${sec.key}`} className="cot-rise" style={{ '--cot-i': si } as CSSProperties}>
                <h3
                  id={`${titleId}-${sec.key}`}
                  className="flex items-center gap-2 border-b border-[#F0F0F2] bg-[#FAFAFA] px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#17235B] dark:border-[#1F2A3C] dark:bg-[#0F172A]/40 dark:text-[#9BB6FF] sm:px-6 [&_svg]:size-4"
                >
                  {SECTION_ICON[sec.key]}
                  Menú {sec.menu}
                </h3>
                <ul className="divide-y divide-[#F0F0F2] border-b border-[#F0F0F2] dark:divide-[#1F2A3C] dark:border-[#1F2A3C]">
                  {sec.modules.map((m) => (
                    <ModuleRow
                      key={m.key}
                      moduleKey={m.key}
                      label={m.label}
                      perms={current[m.key] as CrudPerms}
                      readOnly={readOnly}
                      isLocked={(a) => isLocked(m.key, a)}
                      onToggle={(action, value) => change([{ key: m.key, action, value }])}
                      onScope={(ownOnly) => setScope(m.key, ownOnly)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {!loading ? (
          <div className="border-t border-[#F0F0F2] bg-[#FAFAFA] px-5 py-4 dark:border-[#1F2A3C] dark:bg-[#0F172A]/40 sm:px-6">
            <h3 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#17235B] dark:text-[#9BB6FF] [&_svg]:size-4">
              <DollarSign aria-hidden />
              Permisos especiales
            </h3>
            <p className="mt-1 text-[13px] leading-[18px] text-[#52525B] dark:text-[#B7C1D1]">
              Marca/desmarca «Liquidado» en órdenes resueltas o proyectos cerrados. Es independiente de Editar: quien
              tenga esto activo no puede cambiar nada más del registro.
            </p>
            <ul className="mt-3 space-y-1">
              {LIQUIDAR_ROWS.map((row) => {
                const rowPerms = current[row.key] as CrudPerms;
                const disabled = readOnly || !rowPerms.view;
                return (
                  <li key={row.key}>
                    <label
                      title={!rowPerms.view ? `Actívale «Ver» en ${row.label.replace('Puede liquidar ', '')} primero` : undefined}
                      className={cn(
                        'flex min-h-11 items-center gap-3 rounded-[10px] px-2 py-1.5',
                        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                      )}
                    >
                      <Checkbox
                        checked={rowPerms.liquidar === true}
                        disabled={disabled}
                        onChange={(v) => setLiquidar(row.key, v)}
                        label={row.label}
                      />
                      <span className={cn('text-[14px]', rowPerms.view ? 'text-[#09090B] dark:text-[#F8FAFC]' : 'text-[#A1A1AA] dark:text-[#64748B]')}>
                        {row.label}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      <AppModalFooter
        note={
          loading ? null : (
            <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="tabular-nums">
                {visibleCount} de {allKeys.length} módulos visibles
              </span>
              {dirty ? (
                <span className="cot-fade inline-flex items-center gap-1.5 font-medium text-[#9A6B15] dark:text-[#E6A23C]">
                  <span className="size-1.5 rounded-full bg-current" aria-hidden />
                  Cambios sin guardar
                </span>
              ) : null}
            </span>
          )
        }
      >
        <button type="button" onClick={onClose} disabled={saving} className={btn.secondary}>
          {readOnly ? 'Cerrar' : 'Cancelar'}
        </button>
        {!readOnly ? (
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || loading || !user || !dirty}
            aria-busy={saving}
            className={btn.primary}
          >
            {saving ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {saving ? 'Guardando…' : 'Guardar permisos'}
          </button>
        ) : null}
      </AppModalFooter>
    </Modal>
  );
}

function ModuleRow({
  moduleKey,
  label,
  perms,
  readOnly,
  isLocked,
  onToggle,
  onScope,
}: {
  moduleKey: ModuleKey;
  label: string;
  perms: CrudPerms;
  readOnly: boolean;
  isLocked: (a: PermAction) => boolean;
  onToggle: (action: PermAction, value: boolean) => void;
  onScope: (ownOnly: boolean) => void;
}) {
  const scoped = SCOPED_MODULES.has(moduleKey);
  const summary = !perms.view
    ? 'Oculto en su menú'
    : (['create', 'edit', 'delete'] as const).some((k) => perms[k])
      ? 'Puede hacer cambios'
      : 'Solo consulta';

  return (
    <li
      className={cn(
        ROW_GRID,
        'items-center gap-y-3 px-5 py-3.5 transition-colors duration-200 sm:gap-y-0 sm:px-6 sm:py-2.5',
        !perms.view && 'bg-[#FCFCFD] dark:bg-transparent',
      )}
    >
      {/* Módulo */}
      <div className="col-span-4 flex min-w-0 items-center gap-3 sm:col-span-1">
        <span
          className={cn(
            'inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] transition-colors duration-200 [&_svg]:size-4',
            perms.view
              ? 'bg-[rgba(27,92,255,0.08)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.14)] dark:text-[#9BB6FF]'
              : 'bg-[#F4F4F5] text-[#A1A1AA] dark:bg-[#151E32] dark:text-[#64748B]',
          )}
        >
          {MODULE_ICON[moduleKey]}
        </span>
        <div className="min-w-0">
          <p className={cn('truncate text-[14px] font-medium', perms.view ? 'text-[#09090B] dark:text-[#F8FAFC]' : 'text-[#6E6E77] dark:text-[#8EA0B8]')}>
            {label}
          </p>
          <p className="truncate text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">{summary}</p>
        </div>
      </div>

      {/* Casillas: en móvil llevan su nombre debajo; en escritorio lo da la cabecera */}
      {PERM_ACTIONS.map((a) => {
        const locked = isLocked(a.key);
        return (
          <label
            key={a.key}
            title={locked ? 'Los técnicos no pueden eliminar reportes semanales' : undefined}
            className={cn(
              'flex min-h-11 flex-col items-center justify-center gap-1 rounded-[10px] border border-[#F0F0F2] py-1.5 dark:border-[#1F2A3C] sm:border-0 sm:py-0',
              readOnly || locked ? 'cursor-not-allowed' : 'cursor-pointer',
            )}
          >
            {locked ? (
              <span className="inline-flex size-5 items-center justify-center text-[#A1A1AA] dark:text-[#64748B]">
                <Lock className="size-3.5" aria-hidden />
                <span className="sr-only">
                  {a.label} en {label}: no disponible para técnicos
                </span>
              </span>
            ) : (
              <Checkbox
                checked={!!perms[a.key]}
                disabled={readOnly}
                danger={a.key === 'delete'}
                onChange={(v) => onToggle(a.key, v)}
                label={`${a.label} en ${label}`}
              />
            )}
            <span className="text-[11px] font-medium text-[#6E6E77] dark:text-[#8EA0B8] sm:hidden" aria-hidden>
              {a.label}
            </span>
          </label>
        );
      })}

      {/* Alcance */}
      <div className={cn('col-span-4 sm:col-span-1 sm:pl-2', !scoped && 'hidden sm:block')}>
        {scoped ? (
          <label className="flex items-center gap-3 sm:block">
            <span className="shrink-0 text-[12px] font-medium text-[#6E6E77] dark:text-[#8EA0B8] sm:sr-only">Alcance</span>
            <select
              value={perms.own_only ? 'own' : 'team'}
              onChange={(e) => onScope(e.target.value === 'own')}
              disabled={readOnly || !perms.view}
              aria-label={`Alcance en ${label}`}
              className="h-10 w-full cursor-pointer rounded-[8px] border border-[#E7E7EA] bg-white px-2.5 text-[13px] text-[#09090B] outline-none transition-colors hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] sm:h-9"
            >
              <option value="own">Solo lo suyo</option>
              <option value="team">Todo el equipo</option>
            </select>
          </label>
        ) : (
          <span className="block pl-2.5 text-[13px] text-[#D4D4D8] dark:text-[#3A4661]" aria-hidden>
            —
          </span>
        )}
      </div>
    </li>
  );
}

/** Casilla nativa (accesible, admite estado mixto) con la apariencia del sistema. */
function Checkbox({
  checked,
  indeterminate = false,
  disabled,
  danger,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  danger?: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  const onClass = danger
    ? 'checked:border-[#C22B2B] checked:bg-[#C22B2B] dark:checked:border-[#DC3E3E] dark:checked:bg-[#DC3E3E]'
    : 'checked:border-[#1B5CFF] checked:bg-[#1B5CFF] dark:checked:border-[#4B7CFF] dark:checked:bg-[#4B7CFF]';
  return (
    <span className="relative inline-flex size-5 shrink-0">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(e.target.checked)}
        className={cn(
          'peer size-5 cursor-pointer appearance-none rounded-[6px] border-[1.5px] border-[#D4D4D8] bg-white transition-colors duration-150 hover:border-[#A1A1AA] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.22)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#3A4661] dark:bg-[#0F172A]',
          onClass,
          'indeterminate:border-[#1B5CFF] indeterminate:bg-[#1B5CFF] dark:indeterminate:border-[#4B7CFF] dark:indeterminate:bg-[#4B7CFF]',
        )}
      />
      <Check
        className="pointer-events-none absolute inset-0 m-auto size-3.5 text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
        strokeWidth={3.5}
        aria-hidden
      />
      <Minus
        className={cn(
          'pointer-events-none absolute inset-0 m-auto size-3.5 text-white opacity-0 transition-opacity duration-150',
          indeterminate && !checked && 'opacity-100',
        )}
        strokeWidth={3.5}
        aria-hidden
      />
    </span>
  );
}
