/**
 * Componentes de chrome del modal Wialon:
 * badges, secciones, estados vacíos/carga, pie y telemetría.
 * Todos los exports son named; el modal los importa por nombre.
 */
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  erpModalFooterClass,
  erpPrimaryBtnClass,
  erpSecondaryBtnClass,
  erpSubheadingClass,
} from "../../shared/cuentasAntarixStyles";

// ---------- Estilos locales del modal (no van a la hoja global) ----------

export const wialonUiLabel =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E77] dark:text-[#8EA0B8] sm:text-[11px]";
export const wialonUiCaption =
  "text-xs font-normal leading-relaxed text-[#6E6E77] dark:text-[#8ea0b8]";
export const wialonUiValue =
  "text-sm font-medium leading-snug text-[#09090B] dark:text-[#f8fafc]";
export const wialonUiBadge =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-none tabular-nums";
export const wialonEyebrowClass =
  "text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1B5CFF] dark:text-[#4B7CFF] sm:text-[11px]";
export const wialonPanelClass =
  "rounded-2xl border border-[#E7E7EA] bg-[#FAFAFA] p-4 dark:border-[#273244] dark:bg-[#0f172a]/90 sm:p-5";
export const wialonDossierZoneClass = "relative space-y-3 sm:space-y-4";
export const wialonDossierHeadingClass =
  "text-base font-medium tracking-[-0.01em] text-[#09090B] dark:text-[#f8fafc] sm:text-lg";
export const wialonDossierCardClass =
  "relative overflow-visible rounded-2xl border border-[#E7E7EA]/90 bg-gradient-to-br from-[#ffffff] via-[#FAFAFA]/85 to-[#F1F5FF]/40 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)] dark:border-[#273244] dark:from-[#111827]/80 dark:via-[#0f172a]/55 dark:to-[#17235B]/10 dark:shadow-none sm:p-5";
export const wialonIconBtnClass =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E7E7EA] bg-white text-[#6E6E77] transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#273244] dark:bg-[#111827] dark:text-[#8EA0B8] dark:hover:border-rose-900/40 dark:hover:bg-rose-950/30 dark:hover:text-rose-300";

// ---------- Badges ----------

export function WialonSharedBadge({
  sharedWith,
  count,
  compact = false,
  label: labelOverride,
}: {
  sharedWith?: string;
  count?: number;
  compact?: boolean;
  label?: string;
}) {
  const label =
    labelOverride ??
    (count && count > 1 ? `Compartida · ${count} cuentas` : "Compartida");
  return (
    <span
      className={cn(
        wialonUiBadge,
        "bg-[#F1F5FF] text-[#1244D1] ring-1 ring-[#1B5CFF]/20 dark:bg-[#1B5CFF]/15 dark:text-[#4B7CFF] dark:ring-[#1B5CFF]/25",
        compact && "text-[10px] px-2 py-0",
      )}
      title={sharedWith && sharedWith !== "—" ? `Con: ${sharedWith}` : undefined}
    >
      {label}
    </span>
  );
}

export function WialonStatusBadge({ status }: { status: string }) {
  const active = status === "Activo";
  const unknown = !status || status === "—";
  return (
    <span
      className={cn(
        wialonUiBadge,
        unknown
          ? "bg-[#FAFAFA] text-[#6E6E77] dark:bg-[#243048] dark:text-[#8EA0B8]"
          : active
            ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/40"
            : "bg-rose-50 text-rose-800 ring-1 ring-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800/40",
      )}
    >
      {unknown ? "Sin dato" : status}
    </span>
  );
}

// ---------- Telemetría ----------

export function WialonTelemetryChips({
  unit,
  compact = false,
}: {
  unit: {
    last_state?: string;
    speed_kmh?: number | null;
    is_online?: boolean | null;
    online_label?: string;
    engine_on?: boolean | null;
    engine_label?: string;
    last_message_at: string;
  };
  compact?: boolean;
}) {
  const online = unit.is_online === true;
  const offline = unit.is_online === false;
  const onlineText =
    unit.online_label || (online ? "En línea" : offline ? "Fuera de línea" : "Sin dato");
  const engineOn = unit.engine_on === true;
  const engineOff = unit.engine_on === false;
  const engineText =
    unit.engine_label || (engineOn ? "Encendido" : engineOff ? "Apagado" : "Sin dato");
  const motion = (unit.last_state || "").trim() || "Sin posición";
  const speed =
    typeof unit.speed_kmh === "number" && Number.isFinite(unit.speed_kmh) && unit.speed_kmh > 0
      ? ` · ${unit.speed_kmh} km/h`
      : "";
  const lastConn =
    unit.last_message_at && unit.last_message_at !== "—"
      ? unit.last_message_at
      : "Sin conexión";

  const chip =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-none ring-1 ring-inset";

  return (
    <div className={cn("flex flex-col gap-1.5", compact ? "mt-1.5" : "mt-2")}>
      <div className="flex flex-wrap gap-1.5">
        <span
          className={cn(
            chip,
            online
              ? "bg-emerald-50 text-emerald-800 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/50"
              : offline
                ? "bg-rose-50 text-rose-800 ring-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800/50"
                : "bg-[#FAFAFA] text-[#6E6E77] ring-[#E7E7EA] dark:bg-[#243048] dark:text-[#8EA0B8] dark:ring-[#273244]",
          )}
          title="Estado de conexión"
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              online ? "bg-emerald-500" : offline ? "bg-rose-500" : "bg-[#A1A1AA]",
            )}
            aria-hidden
          />
          {onlineText}
        </span>
        <span
          className={cn(
            chip,
            engineOn
              ? "bg-[#F1F5FF] text-[#1244D1] ring-[#1B5CFF]/25 dark:bg-[#1B5CFF]/15 dark:text-[#4B7CFF] dark:ring-[#1B5CFF]/30"
              : engineOff
                ? "bg-[#FAFAFA] text-[#52525B] ring-[#E7E7EA] dark:bg-[#243048] dark:text-[#cbd5e1] dark:ring-[#273244]"
                : "bg-[#FAFAFA] text-[#6E6E77] ring-[#E7E7EA] dark:bg-[#243048] dark:text-[#8EA0B8] dark:ring-[#273244]",
          )}
          title="Motor / ignición"
        >
          Motor {engineText.toLowerCase()}
        </span>
        <span
          className={cn(
            chip,
            motion === "En movimiento"
              ? "bg-sky-50 text-sky-800 ring-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-800/50"
              : "bg-[#FAFAFA] text-[#52525B] ring-[#E7E7EA] dark:bg-[#243048] dark:text-[#cbd5e1] dark:ring-[#273244]",
          )}
          title="Último estado de movimiento"
        >
          {motion}
          {speed}
        </span>
      </div>
      <p className={cn(wialonUiCaption, "truncate")} title={`Última conexión: ${lastConn}`}>
        Última conexión: {lastConn}
      </p>
    </div>
  );
}

// ---------- Estados ----------

export function WialonErrorAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex gap-2.5 rounded-xl border border-rose-200/80 bg-rose-50/80 px-3.5 py-2.5 text-sm text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
    >
      <svg
        className="mt-0.5 h-4 w-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
      </svg>
      <p className="min-w-0 flex-1 leading-relaxed">{message}</p>
    </div>
  );
}

export function WialonEmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E7E7EA] bg-gradient-to-b from-[#ffffff] to-[#F1F5FF]/60 px-5 py-12 text-center dark:border-[#273244] dark:from-[#0f172a]/40 dark:to-[#111827]/20">
      {icon ? (
        <span
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E7E7EA] bg-white/90 text-[#A1A1AA] dark:border-[#273244] dark:bg-[#111827] dark:text-[#64748b]"
          aria-hidden
        >
          {icon}
        </span>
      ) : null}
      <p className={erpSubheadingClass}>{title}</p>
      {description ? <p className={cn("max-w-sm", wialonUiCaption)}>{description}</p> : null}
    </div>
  );
}

export function WialonLoadingState({
  label = "Cargando…",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        compact ? "py-8" : "py-16",
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          "inline-flex animate-spin rounded-full border-2 border-[#1B5CFF] border-t-transparent",
          compact ? "h-7 w-7" : "h-10 w-10",
        )}
        aria-hidden
      />
      <p className={wialonUiCaption}>{label}</p>
    </div>
  );
}

// ---------- Secciones ----------

export function WialonDossierSection({
  title,
  subtitle,
  eyebrow,
  action,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}) {
  const sectionId = `wialon-dossier-${title.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <section className={wialonDossierZoneClass} aria-labelledby={sectionId}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className={wialonEyebrowClass}>{eyebrow}</p> : null}
          <div className={cn("flex flex-wrap items-center gap-2", eyebrow && "mt-1")}>
            <h3 id={sectionId} className={wialonDossierHeadingClass}>
              {title}
            </h3>
            {badge}
          </div>
          {subtitle ? <p className={cn("mt-1 max-w-xl", wialonUiCaption)}>{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function WialonSectionCard({
  title,
  subtitle,
  eyebrow,
  icon,
  action,
  badge,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: ReactNode;
  action?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const sectionId = `wialon-section-${title.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <section className={cn(wialonPanelClass, className)} aria-labelledby={sectionId}>
      <div className="mb-4 flex flex-col gap-3 border-b border-[#E7E7EA]/80 pb-3 dark:border-white/[0.06] sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          {icon ? (
            <span
              className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1B5CFF]/12 text-[#1B5CFF] dark:bg-[#4B7CFF]/15 dark:text-[#4B7CFF]"
              aria-hidden
            >
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            {eyebrow ? <p className={wialonEyebrowClass}>{eyebrow}</p> : null}
            <div className={cn("flex flex-wrap items-center gap-2", eyebrow && "mt-0.5")}>
              <h3
                id={sectionId}
                className="text-sm font-semibold text-[#09090B] dark:text-[#f1f5f9]"
              >
                {title}
              </h3>
              {badge}
            </div>
            {subtitle ? (
              <p className={cn("mt-0.5 text-[12px] leading-snug", wialonUiCaption)}>{subtitle}</p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

// ---------- Estadísticas ----------

export function WialonStatStrip({
  items,
}: {
  items: { label: string; value: string; serif?: boolean }[];
}) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-[#E7E7EA]/80 bg-[#ffffff] px-3 py-3 dark:border-[#273244] dark:bg-[#111827]/50"
        >
          <dt className={wialonEyebrowClass}>{item.label}</dt>
          <dd
            className={cn(
              "mt-1.5 break-words leading-snug text-[#09090B] dark:text-[#f8fafc]",
              item.serif
                ? "text-xl font-medium tabular-nums sm:text-2xl"
                : wialonUiValue,
            )}
          >
            {item.value || "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// ---------- Pie del modal ----------

export type WialonFooterAction = {
  key: string;
  label: string;
  variant: "primary" | "secondary";
  type?: "button" | "submit";
  /** Asocia un submit con un form fuera del footer (HTML5 `form`). */
  form?: string;
  disabled?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  ariaLabel?: string;
};

/**
 * Pie único del modal Wialon: evita barras sticky duplicadas y centraliza acciones.
 * Usar `form` en acciones submit para enlazar formularios en el cuerpo del diálogo.
 */
export function WialonModalFooter({
  actions,
  busy = false,
  className,
}: {
  actions: WialonFooterAction[];
  busy?: boolean;
  className?: string;
}) {
  if (actions.length === 0) return null;

  return (
    <footer className={cn(erpModalFooterClass, className)} aria-busy={busy || undefined}>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
        {actions.map((action) => (
          <button
            key={action.key}
            type={action.type ?? "button"}
            form={action.form}
            disabled={action.disabled}
            onClick={action.onClick}
            aria-label={action.ariaLabel}
            className={cn(
              action.variant === "primary" ? erpPrimaryBtnClass : erpSecondaryBtnClass,
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B5CFF]",
            )}
          >
            {action.icon ? <span aria-hidden>{action.icon}</span> : null}
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </footer>
  );
}
