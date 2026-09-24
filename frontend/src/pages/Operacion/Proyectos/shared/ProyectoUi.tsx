/**
 * Primitivas visuales de Proyectos. Presentacionales: sin fetch ni estado global.
 */
import { memo, useEffect, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { resolveMediaUrl } from "@/config/api";
import {
  divider,
  fieldError,
  fieldHint,
  fieldLabel,
  requiredMark,
  toneForEstado,
} from "./proyectoTokens";

/* --------------------------------------------------------------------------
   Estado
   -------------------------------------------------------------------------- */

/**
 * Píldora de estado. Reenvía props del <span> (onClick, role, tabIndex, aria-*)
 * para poder envolverla con `StatusChangedByChip` y abrir «Status colocado por».
 */
export function EstadoPill({
  estado,
  size = "md",
  className = "",
  ...rest
}: {
  estado: string | null | undefined;
  size?: "sm" | "md";
  className?: string;
} & Omit<HTMLAttributes<HTMLSpanElement>, "children">) {
  const tone = toneForEstado(estado);
  const interactive = Boolean(rest.onClick);
  return (
    <span
      {...rest}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset ${tone.pill} ${
        size === "sm" ? "h-5 px-2 text-[11px]" : "h-6 px-2.5 text-[12px]"
      } ${
        interactive
          ? "cot-press cursor-pointer hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/50"
          : ""
      } ${className}`}
    >
      <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden />
      {tone.label}
    </span>
  );
}

/* --------------------------------------------------------------------------
   Progreso (escala en X: sin reflow)
   -------------------------------------------------------------------------- */

export function ProgressBar({
  value,
  barClass = "bg-[#1B5CFF] dark:bg-[#4B7CFF]",
  label,
  size = "md",
  className = "",
}: {
  /** 0–100 */
  value: number;
  barClass?: string;
  /** Nombre accesible; si falta, la barra es decorativa. */
  label?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
  return (
    <div
      className={`overflow-hidden rounded-full bg-[#EDEDF0] dark:bg-[#1F2A3C] ${size === "sm" ? "h-1" : "h-1.5"} ${className}`}
      {...(label
        ? {
            role: "progressbar",
            "aria-label": label,
            "aria-valuemin": 0,
            "aria-valuemax": 100,
            "aria-valuenow": pct,
          }
        : { "aria-hidden": true })}
    >
      <div
        className={`cot-bar h-full w-full rounded-full ${barClass}`}
        style={{ transform: `scaleX(${pct / 100})` }}
      />
    </div>
  );
}

/* --------------------------------------------------------------------------
   Personas
   -------------------------------------------------------------------------- */

function initialsFromName(nombre: string): string {
  const parts = String(nombre || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

/** Tonos estables por id: el mismo técnico siempre tiene el mismo color. */
const AVATAR_TONES = [
  "bg-[#EEF3FF] text-[#1244D1] dark:bg-[#1B2A63] dark:text-[#C9D7FF]",
  "bg-[#FFF8EB] text-[#8A5D0F] dark:bg-[rgba(230,162,60,0.18)] dark:text-[#F2C27A]",
  "bg-[#E9F8F0] text-[#04724D] dark:bg-[#0F2A1C] dark:text-[#86EFAC]",
  "bg-[#F4F4F5] text-[#3F3F46] dark:bg-[#1B2539] dark:text-[#D6DEEA]",
  "bg-[#F3EEFF] text-[#5B3CC4] dark:bg-[#2A1F52] dark:text-[#C4B5FD]",
];

function avatarTone(id: number | null | undefined): string {
  const n = Math.abs(Number(id) || 0);
  return AVATAR_TONES[n % AVATAR_TONES.length];
}

export type AvatarPerson = {
  id: number | null;
  nombre: string;
  responsable?: boolean;
  avatar_url?: string | null;
};

/** Avatar circular: foto de perfil si hay URL; si no (o falla), iniciales. Decorativo junto al nombre. */
export function Avatar({
  person,
  size = "md",
  className = "",
}: {
  person: AvatarPerson;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const dim = size === "sm" ? "size-6 text-[10px]" : size === "lg" ? "size-10 text-[13px]" : "size-8 text-[11px]";
  const raw = String(person.avatar_url || "").trim();
  useEffect(() => {
    setBroken(false);
  }, [raw]);
  const src = raw && !broken ? resolveMediaUrl(raw) : "";
  const showPhoto = Boolean(src);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ${dim} ${
        showPhoto ? "bg-[#F4F4F5] dark:bg-[#1B2539]" : avatarTone(person.id)
      } ${className}`}
      aria-hidden
    >
      {showPhoto ? (
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      ) : (
        initialsFromName(person.nombre)
      )}
    </span>
  );
}

export const AvatarStack = memo(function AvatarStack({
  people,
  max = 3,
  size = "sm",
}: {
  people: AvatarPerson[];
  max?: number;
  size?: "sm" | "md";
}) {
  if (!people.length) return null;
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span className="flex items-center -space-x-1.5" title={people.map((p) => p.nombre).join(", ")}>
      {shown.map((p, i) => (
        <Avatar
          key={p.id ?? `p-${i}`}
          person={p}
          size={size}
          className="ring-2 ring-white dark:ring-[#111827]"
        />
      ))}
      {extra > 0 ? (
        <span
          className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#F4F4F5] font-semibold text-[#52525B] ring-2 ring-white dark:bg-[#1B2539] dark:text-[#B7C1D1] dark:ring-[#111827] ${
            size === "sm" ? "size-6 text-[10px]" : "size-8 text-[11px]"
          }`}
          aria-hidden
        >
          +{extra}
        </span>
      ) : null}
    </span>
  );
});

/* --------------------------------------------------------------------------
   Secciones del formulario
   -------------------------------------------------------------------------- */

export function LockBadge({ label = "Solo lectura" }: { label?: string }) {
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-[#F4F4F5] px-2.5 text-[11.5px] font-medium text-[#52525B] dark:bg-white/6 dark:text-[#B7C1D1]">
      <Lock className="size-3" aria-hidden />
      {label}
    </span>
  );
}

type SectionCardProps = {
  id: string;
  title: string;
  icon?: ReactNode;
  hint?: ReactNode;
  actions?: ReactNode;
  /** Muestra la etiqueta «Solo lectura» (técnico asignado). */
  locked?: boolean;
  /** Sin relleno interior: el contenido pinta sus propias filas. */
  flush?: boolean;
  /** Orden en la entrada escalonada de la pestaña. */
  index?: number;
  className?: string;
  children: ReactNode;
};

/**
 * Tarjeta de sección: encabezado con ícono en mosaico + cuerpo.
 * Entra escalonada (`cot-rise`) al cambiar de paso.
 */
export function SectionCard({
  id,
  title,
  icon,
  hint,
  actions,
  locked = false,
  flush = false,
  index = 0,
  className = "",
  children,
}: SectionCardProps) {
  return (
    <section
      aria-labelledby={id}
      className={`cot-rise overflow-hidden rounded-[18px] border border-[#E7E7EA] bg-white dark:border-[#273244] dark:bg-[#111827] ${className}`}
      style={{ "--cot-i": index } as CSSProperties}
    >
      <header className={`flex flex-wrap items-start gap-x-3 gap-y-2 border-b px-4 py-3.5 sm:px-5 ${divider}`}>
        {icon ? (
          <span
            className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63]/70 dark:text-[#9BB6FF] [&_svg]:size-4"
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              id={id}
              className="text-[15px] font-semibold leading-snug tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]"
            >
              {title}
            </h3>
            {locked ? <LockBadge /> : null}
          </div>
          {hint ? (
            <p className="mt-0.5 text-[13px] leading-snug text-[#6E6E77] dark:text-[#8EA0B8]">{hint}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">{actions}</div>
        ) : null}
      </header>
      <div className={flush ? "" : "space-y-4 p-4 sm:p-5"}>{children}</div>
    </section>
  );
}

/* --------------------------------------------------------------------------
   Campo con etiqueta, pista y error
   -------------------------------------------------------------------------- */

export function Field({
  label,
  htmlFor,
  labelId,
  required,
  hint,
  hintId,
  error,
  errorId,
  className = "",
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  labelId?: string;
  required?: boolean;
  hint?: ReactNode;
  hintId?: string;
  error?: string;
  errorId?: string;
  className?: string;
  children: ReactNode;
}) {
  const LabelTag = htmlFor ? "label" : "p";
  return (
    <div className={`min-w-0 ${className}`}>
      <LabelTag id={labelId} {...(htmlFor ? { htmlFor } : {})} className={fieldLabel}>
        {label}
        {required ? (
          <span className={requiredMark} aria-hidden>
            *
          </span>
        ) : null}
      </LabelTag>
      {children}
      {error ? (
        <p id={errorId} className={fieldError} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className={fieldHint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Aviso en línea (errores de catálogo, bloqueos)
   -------------------------------------------------------------------------- */

const noticeTone = {
  warning:
    "border-[#F0D7A3] bg-[#FFF8EB] text-[#7A520D] dark:border-[rgba(230,162,60,0.3)] dark:bg-[rgba(230,162,60,0.1)] dark:text-[#F2C27A]",
  danger:
    "border-[#F6CFCF] bg-[#FEF2F2] text-[#9F1F1F] dark:border-[#7F1D1D] dark:bg-[#3F1518] dark:text-[#FCA5A5]",
  info: "border-[#D7E3FF] bg-[#EEF3FF] text-[#1D3A8A] dark:border-[#2C3F7A] dark:bg-[#1B2A63]/60 dark:text-[#C9D7FF]",
} as const;

export function Notice({
  tone = "info",
  title,
  children,
  id,
  role,
  tabIndex,
  className = "",
}: {
  tone?: keyof typeof noticeTone;
  title?: ReactNode;
  children?: ReactNode;
  id?: string;
  role?: "alert" | "status" | "note";
  tabIndex?: number;
  className?: string;
}) {
  return (
    <div
      id={id}
      role={role}
      tabIndex={tabIndex}
      className={`cot-fade rounded-2xl border px-3.5 py-3 text-[13px] leading-relaxed outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] ${noticeTone[tone]} ${className}`}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={title ? "mt-0.5" : ""}>{children}</div> : null}
    </div>
  );
}
