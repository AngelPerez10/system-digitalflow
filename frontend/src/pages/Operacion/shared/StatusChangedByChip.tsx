import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { Avatar, Surface } from "@heroui/react";
import { History, UserRound } from "lucide-react";
import { formatIsoDateTime } from "../OrdenesTrabajo/OrdenServicio/shared/ordenesPageUtils";

const UNKNOWN_ACTOR = "Autor no registrado";

/** Iniciales cortas para el avatar de auditoría (máx. 2 letras). */
export function initialsFromDisplayName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function resolveStatusChangedByName(
  fullName?: string | null,
  username?: string | null,
): string {
  return String(fullName || "").trim() || String(username || "").trim();
}

/** Resuelve nombre/fecha de auditoría; usa fallback (p. ej. creador) si aún no hay sello. */
export function resolveStatusAudit({
  name,
  at,
  fallbackName,
  fallbackAt,
}: {
  name?: string | null;
  at?: string | null;
  fallbackName?: string | null;
  fallbackAt?: string | null;
}): { name: string; at: string; fromFallback: boolean } | null {
  const primaryName = String(name || "").trim();
  const primaryAt = String(at || "").trim();
  if (primaryName || primaryAt) {
    return { name: primaryName, at: primaryAt, fromFallback: false };
  }
  const fbName = String(fallbackName || "").trim();
  const fbAt = String(fallbackAt || "").trim();
  if (fbName || fbAt) {
    return { name: fbName, at: fbAt, fromFallback: true };
  }
  return null;
}

/** "hace 3 días" desde un ISO; "" si no es una fecha válida. Sin dependencias. */
function relativeTimeEs(iso: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = then - Date.now();
  const abs = Math.abs(diffMs);
  if (abs < 45_000) return "hace instantes";
  const rtf = new Intl.RelativeTimeFormat("es-MX", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000_000],
    ["month", 2_592_000_000],
    ["week", 604_800_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diffMs / ms), unit);
  }
  return "hace instantes";
}

type Props = {
  name: string;
  at?: string | null;
  /** Si no hay sello de status, usar creador / created_at. */
  fallbackName?: string | null;
  fallbackAt?: string | null;
  align?: "start" | "center";
  variant?: "compact" | "panel";
  className?: string;
  /**
   * Si se pasa, el componente NO dibuja su propia pastilla: envuelve a
   * `children` (p. ej. el badge de estado) como disparador del tooltip de
   * auditoría. Si no hay datos de auditoría, `children` se renderiza tal cual.
   */
  children?: ReactNode;
};

/** Secundario / primario legibles en claro-oscuro.
 * No usar `text-muted` / Typography `color="muted"`: en este ERP `--muted` es fill, no texto.
 */
const secondaryText = "text-[#52525B] dark:text-[#B7C1D1]";
const tertiaryText = "text-[#6E7280] dark:text-[#8EA0B8]";
const primaryText = "text-[#09090B] dark:text-[#F8FAFC]";

function eyebrowLabel(fromFallback: boolean): string {
  return fromFallback ? "Registro creado por" : "Status colocado por";
}

function buildAriaLabel(
  display: string,
  when: string,
  hasName: boolean,
  fromFallback: boolean,
): string {
  const verb = fromFallback ? "Registro creado por" : "Status colocado por";
  if (hasName && when) return `${verb} ${display}, ${when}`;
  if (hasName) return `${verb} ${display}`;
  if (when) return `Status cambiado el ${when}. ${UNKNOWN_ACTOR}.`;
  return UNKNOWN_ACTOR;
}

function AuditAvatar({
  initials,
  size,
  muted,
}: {
  initials: string;
  size: "compact" | "md";
  muted: boolean;
}) {
  const isCompact = size === "compact";
  return (
    <Avatar
      size="sm"
      color={muted ? "default" : "accent"}
      variant="soft"
      className={[
        "shrink-0",
        isCompact ? "size-[18px]" : "size-8 sm:size-9",
        muted
          ? "border border-dashed border-[#C7C9D1] bg-[#F4F4F5] dark:border-[#3A4661] dark:bg-[#1e293b]"
          : "",
      ].join(" ")}
    >
      <Avatar.Fallback
        className={[
          "font-semibold leading-none",
          isCompact ? "text-[8px]" : "text-[11px]",
          muted ? tertiaryText : "text-accent-soft-foreground",
        ].join(" ")}
        aria-hidden
      >
        {initials ? (
          initials
        ) : (
          <UserRound
            className={isCompact ? "size-2.5" : "size-4"}
            strokeWidth={2}
            aria-hidden
          />
        )}
      </Avatar.Fallback>
    </Avatar>
  );
}

/**
 * Auditoría de quién colocó el status (o quién creó el registro, como fallback).
 * - `children` → NO agrega ningún nodo: clona el badge de estado y le pone
 *   `title` + `aria-label`. Cero impacto en el layout de la celda. El detalle
 *   sale como tooltip nativo del navegador al dejar el cursor sobre el badge.
 * - `compact`  → token en línea (avatar + nombre + relativo) con `title`.
 * - `panel`    → tarjeta dentro del formulario con todo el detalle visible.
 */
export function StatusChangedByChip({
  name,
  at,
  fallbackName,
  fallbackAt,
  align = "start",
  variant = "compact",
  className = "",
  children,
}: Props) {
  const resolved = resolveStatusAudit({ name, at, fallbackName, fallbackAt });
  if (!resolved) return children ? <>{children}</> : null;

  const hasName = Boolean(resolved.name);
  const display = hasName ? resolved.name : UNKNOWN_ACTOR;
  const when = resolved.at ? formatIsoDateTime(resolved.at) : "";
  const rel = relativeTimeEs(resolved.at);
  const aria = buildAriaLabel(display, when, hasName, resolved.fromFallback);
  const initials = initialsFromDisplayName(resolved.name);

  /** Texto del tooltip nativo (una sola línea). */
  const hoverSummary = [
    hasName
      ? `${eyebrowLabel(resolved.fromFallback)}: ${display}`
      : eyebrowLabel(resolved.fromFallback),
    when ? (rel ? `${rel} · ${when}` : when) : "",
  ]
    .filter(Boolean)
    .join(" · ");

  // Modo "envoltura": se clona el badge y se le añaden `title` + `aria-label`
  // directamente. No se envuelve en ningún elemento → el badge no se mueve.
  if (children != null) {
    if (isValidElement(children)) {
      const child = children as ReactElement<{ title?: string; "aria-label"?: string }>;
      return cloneElement(child, {
        title: hoverSummary,
        "aria-label": child.props["aria-label"] ?? aria,
      });
    }
    return <>{children}</>;
  }

  if (variant === "panel") {
    return (
      <Surface
        variant="secondary"
        aria-label={aria}
        className={[
          "mt-2 flex min-w-0 items-center gap-3 rounded-[12px] border border-[#E7E7EA] bg-[#FAFAFA] px-3 py-2.5",
          "dark:border-[#273244] dark:bg-[#0f172a]/80",
          className,
        ].join(" ")}
      >
        <AuditAvatar initials={initials} size="md" muted={!hasName} />
        <div className="min-w-0 flex-1">
          <p
            className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.07em] ${secondaryText}`}
          >
            <History className="size-3 shrink-0" strokeWidth={2.25} aria-hidden />
            {eyebrowLabel(resolved.fromFallback)}
          </p>
          <p
            className={`mt-0.5 truncate text-[13px] font-semibold tracking-tight ${
              hasName ? primaryText : `italic ${secondaryText}`
            }`}
          >
            {display}
          </p>
          {when ? (
            <p className={`mt-0.5 text-[11px] tabular-nums ${tertiaryText}`}>
              <time dateTime={resolved.at}>{rel ? `${rel} · ${when}` : when}</time>
            </p>
          ) : null}
        </div>
        {rel ? (
          <span
            className="hidden shrink-0 items-center rounded-full border border-[#E7E7EA] bg-white px-2 py-[3px] text-[10px] font-semibold tabular-nums text-[#52525B] dark:border-[#334155] dark:bg-[#111827] dark:text-[#B7C1D1] sm:inline-flex"
            aria-hidden
          >
            {rel}
          </span>
        ) : null}
      </Surface>
    );
  }

  // `compact`: token en línea (avatar + nombre + · relativo); detalle en `title`.
  return (
    <div
      className={`flex min-w-0 ${
        align === "center" ? "justify-center" : "justify-start"
      } ${className}`}
    >
      <span
        aria-label={aria}
        title={hoverSummary}
        className={[
          "inline-flex max-w-[13rem] min-w-0 cursor-default items-center gap-1.5 rounded-full",
          "border border-[#E7E7EA] bg-white/70 px-2 py-[3px]",
          "transition-colors duration-150 hover:border-[#1B5CFF]/40 hover:bg-[#F1F5FF]/70",
          "dark:border-[#273244] dark:bg-[#0f172a]/60 dark:hover:border-[#4B7CFF]/50 dark:hover:bg-[#4B7CFF]/10",
          "motion-reduce:transition-none",
        ].join(" ")}
      >
        <AuditAvatar initials={initials} size="compact" muted={!hasName} />
        <span
          className={`min-w-0 truncate text-[10px] font-semibold leading-none tracking-tight ${
            hasName ? primaryText : `font-medium italic ${secondaryText}`
          }`}
        >
          {display}
        </span>
        {rel ? (
          <span
            className={`shrink-0 text-[10px] font-medium leading-none tabular-nums ${tertiaryText}`}
            aria-hidden
          >
            · {rel}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export type { Props as StatusChangedByChipProps };
