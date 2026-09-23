/**
 * Piezas visuales de Gestión de usuarios.
 *
 * Mismo sistema que Perfil, Cotizaciones y Órdenes: marino + dorado sobre
 * lienzo blanco, azul eléctrico (#1B5CFF) como único acento de acción,
 * líneas de 1 px. En oscuro, la familia slate del contenedor de la app.
 *
 * Movimiento: solo `transform`/`opacity` (clases `cot-*` de modal-kit/motion.css)
 * y transiciones de color; todo se apaga con `prefers-reduced-motion`.
 */
import { useEffect, useId, useState, type CSSProperties, type InputHTMLAttributes, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, Eye, EyeOff, Info, Loader2, X } from 'lucide-react';
import { resolveMediaUrl } from '@/config/api';
import { cn } from '@/lib/utils';
import { initialsOf, isAdminUser, type UserAccount } from './usuariosModel';
import { focusRing, fontSans, hintClass, inputClass, labelClass } from './usuariosStyles';

/* --------------------------------------------------------------------------
   Campos
   -------------------------------------------------------------------------- */

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  onValue: (v: string) => void;
};

export function Field({ label, required, hint, onValue, id, className, ...rest }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={inputId} className={labelClass}>
        {label}
        {required ? (
          <span className="ml-0.5 text-[#C22B2B] dark:text-[#F87171]" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      <input
        id={inputId}
        aria-required={required || undefined}
        aria-describedby={hintId}
        className={inputClass}
        onChange={(e) => onValue(e.target.value)}
        {...rest}
      />
      {hint ? (
        <p id={hintId} className={hintClass}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type PasswordFieldProps = Omit<FieldProps, 'type'> & {
  visible: boolean;
  onToggleVisible: () => void;
};

export function PasswordField({
  label,
  required,
  hint,
  onValue,
  visible,
  onToggleVisible,
  id,
  className,
  ...rest
}: PasswordFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={inputId} className={labelClass}>
        {label}
        {required ? (
          <span className="ml-0.5 text-[#C22B2B] dark:text-[#F87171]" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          spellCheck={false}
          aria-required={required || undefined}
          aria-describedby={hintId}
          className={cn(inputClass, 'pr-12 font-mono tracking-[0.02em] placeholder:font-sans placeholder:tracking-normal')}
          onChange={(e) => onValue(e.target.value)}
          {...rest}
        />
        <button
          type="button"
          onClick={onToggleVisible}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-[10px] text-[#71717A] transition-colors hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1B5CFF]/40 dark:text-[#8EA0B8] dark:hover:text-[#F8FAFC]"
        >
          {visible ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
        </button>
      </div>
      {hint ? (
        <p id={hintId} className={hintClass}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Interruptor
   -------------------------------------------------------------------------- */

type SwitchProps = {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
  busy?: boolean;
  tone?: 'blue' | 'green';
  size?: 'sm' | 'md';
};

export function Switch({ checked, onChange, label, disabled, busy, tone = 'blue', size = 'md' }: SwitchProps) {
  const on =
    tone === 'green' ? 'bg-[#04724D] dark:bg-[#22A06B]' : 'bg-[#1B5CFF] dark:bg-[#4B7CFF]';
  const dims = size === 'sm' ? { track: 'h-6 w-10', knob: 'size-5', x: 'translate-x-4' } : { track: 'h-7 w-12', knob: 'size-6', x: 'translate-x-5' };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      onClick={onChange}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors duration-200',
        dims.track,
        checked ? on : 'bg-[#D4D4D8] dark:bg-[#3A4661]',
        (disabled || busy) && 'cursor-not-allowed',
        disabled && !busy && 'opacity-50',
        focusRing,
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-flex items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(9,9,11,0.25)] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          dims.knob,
          checked ? dims.x : 'translate-x-0',
        )}
      >
        {busy ? <Loader2 className="size-3 animate-spin text-[#71717A]" aria-hidden /> : null}
      </span>
    </button>
  );
}

/* --------------------------------------------------------------------------
   Identidad del usuario
   -------------------------------------------------------------------------- */

export function UserAvatar({ user, size = 'md' }: { user: UserAccount; size?: 'md' | 'lg' }) {
  const [broken, setBroken] = useState(false);
  const src = (user.avatar_url || '').trim() && !broken ? resolveMediaUrl(user.avatar_url as string) : '';
  const admin = isAdminUser(user);
  const active = user.is_active !== false;
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-inset',
        size === 'lg' ? 'size-14 text-[18px]' : 'size-11 text-[14px]',
        admin
          ? 'bg-[#FFF6E6] text-[#9A6B15] ring-[#F0D7A3] dark:bg-[rgba(230,162,60,0.14)] dark:text-[#E6A23C] dark:ring-[rgba(230,162,60,0.28)]'
          : 'bg-[#EEF3FF] text-[#17235B] ring-[#D7E3FF] dark:bg-[#1B2A63] dark:text-[#9BB6FF] dark:ring-[#3A4A6B]',
        !active && 'grayscale',
      )}
      aria-hidden
    >
      {src ? (
        <img src={src} alt="" loading="lazy" decoding="async" className="size-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <span className="font-semibold tracking-[-0.2px]">{initialsOf(user)}</span>
      )}
      {!active ? <span className="absolute inset-0 bg-white/45 dark:bg-black/45" /> : null}
    </span>
  );
}

export function RoleBadge({ admin }: { admin: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold',
        admin
          ? 'bg-[rgba(230,162,60,0.16)] text-[#8A5D0F] dark:text-[#E6A23C]'
          : 'bg-[rgba(23,35,91,0.07)] text-[#17235B] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#9BB6FF]',
      )}
    >
      <span className={cn('size-1.5 rounded-full', admin ? 'bg-[#E6A23C]' : 'bg-[#1B5CFF] dark:bg-[#7EA0FF]')} aria-hidden />
      {admin ? 'Administrador' : 'Técnico'}
    </span>
  );
}

export function StatusPill({ ok, okLabel, offLabel }: { ok: boolean; okLabel: string; offLabel: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold',
        ok
          ? 'bg-[rgba(4,114,77,0.09)] text-[#04724D] dark:bg-[rgba(74,222,128,0.12)] dark:text-[#4ADE80]'
          : 'bg-[#F4F4F5] text-[#71717A] dark:bg-white/[0.06] dark:text-[#8EA0B8]',
      )}
    >
      <span className={cn('size-1.5 rounded-full', ok ? 'bg-current' : 'bg-[#A1A1AA] dark:bg-[#64748B]')} aria-hidden />
      {ok ? okLabel : offLabel}
    </span>
  );
}

/* --------------------------------------------------------------------------
   Avisos
   -------------------------------------------------------------------------- */

export function InlineAlert({ tone = 'error', title, children }: { tone?: 'error' | 'info'; title?: string; children: ReactNode }) {
  const Icon = tone === 'error' ? CircleAlert : Info;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'note'}
      className={cn(
        'cot-fade flex items-start gap-3 rounded-[14px] border px-4 py-3 text-[14px] leading-[20px]',
        tone === 'error'
          ? 'border-[#F6CFCF] bg-[#FEF2F2] text-[#9F1F1F] dark:border-[#7F1D1D] dark:bg-[#3F1518] dark:text-[#FCA5A5]'
          : 'border-[#D7E3FF] bg-[#EEF3FF] text-[#17235B] dark:border-[#3A4A6B] dark:bg-[#1B2A63]/60 dark:text-[#C7D5FF]',
      )}
    >
      <Icon className="mt-0.5 size-[18px] shrink-0" aria-hidden />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={title ? 'mt-0.5' : undefined}>{children}</div>
      </div>
    </div>
  );
}

export type ToastState = { id: number; tone: 'success' | 'error'; message: string } | null;

/** Aviso flotante (abajo a la derecha). Se cierra solo; el error dura más. `onDismiss` debe ser estable. */
export function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(onDismiss, toast.tone === 'error' ? 6000 : 4000);
    return () => window.clearTimeout(id);
  }, [toast, onDismiss]);

  return (
    <div
      className={cn(fontSans, 'pointer-events-none fixed inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[100000] flex justify-center sm:inset-x-auto sm:right-6 sm:justify-end')}
      aria-live={toast?.tone === 'error' ? 'assertive' : 'polite'}
      role="status"
    >
      {toast ? (
        <div
          key={toast.id}
          className={cn(
            'cot-pop pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[14px] border bg-white py-3 pl-4 pr-2 shadow-[0_18px_40px_-18px_rgba(9,9,11,0.45)] dark:bg-[#151E32]',
            toast.tone === 'error' ? 'border-[#F6CFCF] dark:border-[#7F1D1D]' : 'border-[#BFE6D4] dark:border-[#1E5A42]',
          )}
          style={{ transformOrigin: 'bottom center' } as CSSProperties}
        >
          {toast.tone === 'error' ? (
            <CircleAlert className="mt-0.5 size-5 shrink-0 text-[#C22B2B] dark:text-[#F87171]" aria-hidden />
          ) : (
            <CircleCheck className="cot-tick mt-0.5 size-5 shrink-0 text-[#04724D] dark:text-[#4ADE80]" aria-hidden />
          )}
          <p className="min-w-0 flex-1 pt-px text-[14px] font-medium leading-[20px] text-[#09090B] dark:text-[#F8FAFC]">
            {toast.message}
          </p>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Cerrar aviso"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[#A1A1AA] transition-colors hover:bg-[#F4F4F5] hover:text-[#3F3F46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:hover:bg-[#1B2539] dark:hover:text-[#D6DEEA]"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
