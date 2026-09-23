import { memo, type CSSProperties } from 'react';
import { Lock, Pencil, ShieldCheck, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { displayName, isAdminUser, isProtectedPrincipalUsername, type UserAccount } from './usuariosModel';
import { RoleBadge, StatusPill, Switch, UserAvatar } from './usuariosUi';
import { iconBtn } from './usuariosStyles';

/** Columnas compartidas por la cabecera de la lista y cada fila (lg+). */
export const USER_GRID_COLS =
  'lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)_auto]';

type UserRowProps = {
  user: UserAccount;
  index: number;
  toggling: boolean;
  onEdit: (u: UserAccount) => void;
  onPerms: (u: UserAccount) => void;
  onDelete: (u: UserAccount) => void;
  onToggleActive: (u: UserAccount) => void;
};

function UserRowImpl({ user: u, index, toggling, onEdit, onPerms, onDelete, onToggleActive }: UserRowProps) {
  const admin = isAdminUser(u);
  const active = u.is_active !== false;
  const isProtected = isProtectedPrincipalUsername(u.username);
  const name = displayName(u);
  const lockActive = isProtected && active;

  return (
    <li
      className={cn(
        'cot-rise group grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-3 px-4 py-4 transition-colors duration-150 hover:bg-[#FAFAFB] dark:hover:bg-[#151E32]/70 sm:px-6 lg:gap-x-5 lg:py-3.5',
        USER_GRID_COLS,
      )}
      style={{ '--cot-i': Math.min(index, 10) } as CSSProperties}
    >
      {/* Identidad */}
      <div className="flex min-w-0 items-center gap-3.5">
        <UserAvatar user={u} />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <p
              className={cn(
                'truncate text-[15px] font-semibold tracking-[-0.2px]',
                active ? 'text-[#09090B] dark:text-[#F8FAFC]' : 'text-[#71717A] dark:text-[#8EA0B8]',
              )}
            >
              {name}
            </p>
            {isProtected ? (
              <span title="Cuenta principal protegida" className="inline-flex text-[#9A6B15] dark:text-[#E6A23C]">
                <Lock className="size-3.5" aria-hidden />
                <span className="sr-only">Cuenta principal protegida</span>
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[13px] text-[#71717A] dark:text-[#8EA0B8]">
            <span className="shrink-0 font-mono text-[12px]">@{u.username}</span>
            {u.email ? (
              <>
                <span className="text-[#D4D4D8] dark:text-[#3A4661]" aria-hidden>
                  ·
                </span>
                <span className="truncate" title={u.email}>
                  {u.email}
                </span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      {/* Acciones (a la derecha en móvil, última columna en escritorio) */}
      <div className="col-start-2 row-start-1 flex items-center justify-end gap-0.5 lg:col-start-5">
        <button type="button" className={iconBtn} onClick={() => onEdit(u)} aria-label={`Editar a ${name}`} title="Editar">
          <Pencil aria-hidden />
        </button>
        <button type="button" className={iconBtn} onClick={() => onPerms(u)} aria-label={`Permisos de ${name}`} title="Permisos">
          <ShieldCheck aria-hidden />
        </button>
        {isProtected ? (
          <span className="hidden size-10 lg:inline-block" aria-hidden />
        ) : (
          <button
            type="button"
            className={cn(
              iconBtn,
              'hover:border-[#F6CFCF] hover:bg-[#FEF2F2] hover:text-[#C22B2B] dark:hover:border-[#7F1D1D] dark:hover:bg-[#3F1518] dark:hover:text-[#F87171]',
            )}
            onClick={() => onDelete(u)}
            aria-label={`Eliminar a ${name}`}
            title="Eliminar"
          >
            <Trash2 aria-hidden />
          </button>
        )}
      </div>

      {/* Rol + correo SMTP: juntos en móvil, columnas propias en escritorio */}
      <div className="col-span-2 flex flex-wrap items-center gap-2 pl-[3.625rem] lg:contents lg:pl-0">
        <div className="lg:col-start-2 lg:row-start-1">
          <RoleBadge admin={admin} />
        </div>
        <div className="lg:col-start-3 lg:row-start-1" title={u.smtp_configured ? u.smtp_email || undefined : undefined}>
          <StatusPill ok={!!u.smtp_configured} okLabel="SMTP listo" offLabel="Sin SMTP" />
        </div>
      </div>

      {/* Acceso */}
      <div className="col-span-2 flex items-center justify-between gap-3 rounded-[12px] border border-[#F0F0F2] bg-[#FAFAFA] px-3.5 py-2.5 dark:border-[#1F2A3C] dark:bg-[#0F172A]/60 lg:col-span-1 lg:col-start-4 lg:row-start-1 lg:justify-start lg:border-0 lg:bg-transparent lg:p-0 lg:dark:bg-transparent">
        <span className="flex min-w-0 items-center gap-2 lg:order-2">
          <span
            className={cn(
              'size-2 shrink-0 rounded-full transition-colors duration-200',
              active ? 'bg-[#22A06B]' : 'bg-[#A1A1AA] dark:bg-[#64748B]',
            )}
            aria-hidden
          />
          <span
            className={cn(
              'text-[13px] font-medium transition-colors duration-200',
              active ? 'text-[#04724D] dark:text-[#4ADE80]' : 'text-[#71717A] dark:text-[#8EA0B8]',
            )}
          >
            {active ? 'Habilitado' : 'Deshabilitado'}
          </span>
        </span>
        <span className="lg:order-1" title={lockActive ? 'Esta cuenta no puede desactivarse' : undefined}>
          <Switch
            tone="green"
            size="sm"
            checked={active}
            busy={toggling}
            disabled={lockActive}
            onChange={() => onToggleActive(u)}
            label={`${active ? 'Deshabilitar' : 'Habilitar'} acceso de ${name}`}
          />
        </span>
      </div>
    </li>
  );
}

export const UserRow = memo(UserRowImpl);

export function UserRowSkeleton({ index }: { index: number }) {
  return (
    <li
      className={cn('grid grid-cols-[1fr_auto] items-center gap-x-5 px-4 py-4 sm:px-6 lg:py-3.5', USER_GRID_COLS)}
      style={{ opacity: 1 - index * 0.14 }}
      aria-hidden
    >
      <div className="flex items-center gap-3.5">
        <span className="size-11 shrink-0 rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
        <div className="w-full space-y-2">
          <span className="block h-3.5 w-40 max-w-[70%] rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
          <span className="block h-3 w-56 max-w-[90%] rounded-full bg-[#F4F4F5] motion-safe:animate-pulse dark:bg-[#151E32]" />
        </div>
      </div>
      <span className="hidden h-6 w-28 rounded-full bg-[#F4F4F5] motion-safe:animate-pulse dark:bg-[#151E32] lg:block" />
      <span className="hidden h-6 w-24 rounded-full bg-[#F4F4F5] motion-safe:animate-pulse dark:bg-[#151E32] lg:block" />
      <span className="hidden h-6 w-32 rounded-full bg-[#F4F4F5] motion-safe:animate-pulse dark:bg-[#151E32] lg:block" />
      <span className="h-8 w-24 rounded-lg bg-[#F4F4F5] motion-safe:animate-pulse dark:bg-[#151E32]" />
    </li>
  );
}
