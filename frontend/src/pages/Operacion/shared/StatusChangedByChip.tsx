import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Avatar, Surface } from "@heroui/react";
import { CalendarClock, History, UserRound, X } from "lucide-react";
import {
  MODAL_BACKDROP_SURFACE,
  MODAL_BACKDROP_TRANSITION,
  MODAL_PANEL_ANIMATE,
  MODAL_PANEL_ENTER_TRANSITION,
  MODAL_PANEL_EXIT,
  MODAL_PANEL_EXIT_TRANSITION,
  MODAL_PANEL_INITIAL,
  MODAL_REDUCE_TRANSITION,
} from "@/components/ui/modal/modalMotion";
import { formatIsoDateTime } from "../OrdenesTrabajo/OrdenServicio/shared/ordenesPageUtils";
import {
  UNKNOWN_ACTOR,
  initialsFromDisplayName,
  resolveStatusAudit,
} from "./statusChangedBy";

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
   * `children` (p. ej. el badge de estado) como disparador del modal de
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

/** Misma familia que Órdenes / Clientes (`erpSansStyle`). El portal no hereda la página. */
const erpAuditFontStyle = {
  fontFamily: "Geist, Outfit, system-ui, sans-serif",
} as const;

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  size: "compact" | "md" | "lg";
  muted: boolean;
}) {
  const isCompact = size === "compact";
  const isLg = size === "lg";
  return (
    <Avatar
      size="sm"
      color={muted ? "default" : "accent"}
      variant="soft"
      className={[
        "shrink-0",
        isCompact ? "size-4.5" : isLg ? "size-12 sm:size-14" : "size-8 sm:size-9",
        muted
          ? "border border-dashed border-[#C7C9D1] bg-[#F4F4F5] dark:border-[#3A4661] dark:bg-[#1e293b]"
          : "",
      ].join(" ")}
    >
      <Avatar.Fallback
        className={[
          "font-semibold leading-none",
          isCompact ? "text-[8px]" : isLg ? "text-sm sm:text-base" : "text-[11px]",
          muted ? tertiaryText : "text-accent-soft-foreground",
        ].join(" ")}
        aria-hidden
      >
        {initials ? (
          initials
        ) : (
          <UserRound
            className={isCompact ? "size-2.5" : isLg ? "size-5" : "size-4"}
            strokeWidth={2}
            aria-hidden
          />
        )}
      </Avatar.Fallback>
    </Avatar>
  );
}

type AuditDetail = {
  display: string;
  hasName: boolean;
  when: string;
  rel: string;
  atIso: string;
  fromFallback: boolean;
  initials: string;
  aria: string;
};

function StatusAuditDetailModal({
  open,
  onClose,
  detail,
  titleId,
}: {
  open: boolean;
  onClose: () => void;
  detail: AuditDetail;
  titleId: string;
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const descId = useId().replace(/:/g, "");

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const root = panelRef.current;

    const getFocusable = () =>
      Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
      );

    const raf = requestAnimationFrame(() => {
      const closeBtn = root.querySelector<HTMLElement>('button[aria-label="Cerrar detalle"]');
      const focusable = getFocusable();
      (closeBtn && focusable.includes(closeBtn) ? closeBtn : focusable[0])?.focus();
    });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (active === first || !root.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !root.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey, true);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  const eyebrow = eyebrowLabel(detail.fromFallback);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-99999 flex items-end justify-center sm:items-center sm:p-4"
          role="presentation"
        >
          <motion.button
            type="button"
            aria-label="Cerrar fondo del diálogo"
            className={`absolute inset-0 ${MODAL_BACKDROP_SURFACE}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduce ? MODAL_REDUCE_TRANSITION : MODAL_BACKDROP_TRANSITION}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            initial={reduce ? { opacity: 0 } : MODAL_PANEL_INITIAL}
            animate={reduce ? { opacity: 1 } : MODAL_PANEL_ANIMATE}
            exit={
              reduce
                ? { opacity: 0, transition: MODAL_REDUCE_TRANSITION }
                : { ...MODAL_PANEL_EXIT, transition: MODAL_PANEL_EXIT_TRANSITION }
            }
            transition={reduce ? MODAL_REDUCE_TRANSITION : MODAL_PANEL_ENTER_TRANSITION}
            className={[
              "relative z-10 flex w-full max-w-md flex-col overflow-hidden",
              "rounded-t-[22px] border border-[#E7E7EA] bg-white shadow-[0_24px_48px_-18px_rgba(9,9,11,0.35)]",
              "dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_28px_56px_-16px_rgba(0,0,0,0.65)]",
              "sm:rounded-[22px]",
              "max-h-[min(88dvh,560px)]",
              "text-sm",
            ].join(" ")}
            style={erpAuditFontStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[#D4D4D8] dark:bg-[#334155] sm:hidden"
              aria-hidden
            />
            <header className="flex items-start gap-3 border-b border-[#E7E7EA] px-4 pb-3 pt-3 dark:border-[#273244] sm:px-5 sm:pt-4">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(27,92,255,0.1)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.15)] dark:text-[#4B7CFF]">
                <History className="size-5" strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className={`text-[11px] font-semibold uppercase tracking-widest ${secondaryText}`}>
                  Auditoría
                </p>
                <h2
                  id={titleId}
                  className={`mt-0.5 text-base font-semibold tracking-tight sm:text-[1.125rem] ${primaryText}`}
                >
                  {eyebrow}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar detalle"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F4F4F5] text-[#52525B] transition-colors hover:bg-[#E4E4E7] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:bg-[#1e293b] dark:text-[#B7C1D1] dark:hover:bg-[#243048] dark:hover:text-[#F8FAFC]"
              >
                <X className="size-5" strokeWidth={2} aria-hidden />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
              <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
                <AuditAvatar initials={detail.initials} size="lg" muted={!detail.hasName} />
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-lg font-semibold tracking-tight sm:text-xl ${
                      detail.hasName ? primaryText : `italic ${secondaryText}`
                    }`}
                  >
                    {detail.display}
                  </p>
                  <p id={descId} className={`mt-1 text-sm ${secondaryText}`}>
                    {detail.fromFallback
                      ? "Quién registró el documento cuando aún no hay sello de status."
                      : "Quién colocó el status actual del documento."}
                  </p>
                </div>
              </div>

              <dl className="mt-5 space-y-3">
                {detail.rel ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-[#E7E7EA] bg-[#FAFAFA] px-3.5 py-3 dark:border-[#273244] dark:bg-[#0f172a]/70">
                    <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#1B5CFF] dark:bg-[#111827] dark:text-[#4B7CFF]">
                      <History className="size-4" strokeWidth={2} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <dt className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${tertiaryText}`}>
                        Relativo
                      </dt>
                      <dd className={`mt-0.5 text-sm font-medium tabular-nums ${primaryText}`}>
                        {detail.rel}
                      </dd>
                    </div>
                  </div>
                ) : null}
                {detail.when ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-[#E7E7EA] bg-[#FAFAFA] px-3.5 py-3 dark:border-[#273244] dark:bg-[#0f172a]/70">
                    <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#1B5CFF] dark:bg-[#111827] dark:text-[#4B7CFF]">
                      <CalendarClock className="size-4" strokeWidth={2} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <dt className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${tertiaryText}`}>
                        Fecha y hora
                      </dt>
                      <dd className={`mt-0.5 text-sm font-medium tabular-nums ${primaryText}`}>
                        <time dateTime={detail.atIso}>{detail.when}</time>
                      </dd>
                    </div>
                  </div>
                ) : (
                  <p className={`text-sm ${tertiaryText}`}>Sin fecha registrada.</p>
                )}
              </dl>
            </div>

            <footer className="shrink-0 border-t border-[#E7E7EA] px-4 py-3 dark:border-[#273244] sm:px-5">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-[#E7E7EA] bg-white text-sm font-semibold text-[#09090B] transition-colors hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:hover:bg-[#1e293b]"
              >
                Cerrar
              </button>
            </footer>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/**
 * Auditoría de quién colocó el status (o quién creó el registro, como fallback).
 * - `children` → clona el badge y lo hace clicable para abrir el detalle.
 * - `compact`  → token en línea (avatar + nombre + relativo); clic abre modal.
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
  const [open, setOpen] = useState(false);
  const titleId = useId().replace(/:/g, "");
  const resolved = resolveStatusAudit({ name, at, fallbackName, fallbackAt });

  const openDetail = () => setOpen(true);
  const closeDetail = () => setOpen(false);

  if (!resolved) return children ? <>{children}</> : null;

  const hasName = Boolean(resolved.name);
  const display = hasName ? resolved.name : UNKNOWN_ACTOR;
  const when = resolved.at ? formatIsoDateTime(resolved.at) : "";
  const rel = relativeTimeEs(resolved.at);
  const aria = buildAriaLabel(display, when, hasName, resolved.fromFallback);
  const initials = initialsFromDisplayName(resolved.name);

  const detail: AuditDetail = {
    display,
    hasName,
    when,
    rel,
    atIso: resolved.at,
    fromFallback: resolved.fromFallback,
    initials,
    aria,
  };

  const modal = (
    <StatusAuditDetailModal
      open={open}
      onClose={closeDetail}
      detail={detail}
      titleId={titleId}
    />
  );

  // Modo "envoltura": el badge de estado abre el mismo detalle.
  if (children != null) {
    if (isValidElement(children)) {
      const child = children as ReactElement<{
        title?: string;
        "aria-label"?: string;
        onClick?: (e: ReactMouseEvent) => void;
        onKeyDown?: (e: ReactKeyboardEvent) => void;
        role?: string;
        tabIndex?: number;
      }>;
      return (
        <>
          {cloneElement(child, {
            title: undefined,
            "aria-label": child.props["aria-label"]
              ? `${child.props["aria-label"]}. ${aria}. Abrir detalle.`
              : `${aria}. Abrir detalle.`,
            role: child.props.role ?? "button",
            tabIndex: child.props.tabIndex ?? 0,
            onClick: (e: ReactMouseEvent) => {
              child.props.onClick?.(e);
              if (!e.defaultPrevented) {
                e.stopPropagation();
                openDetail();
              }
            },
            onKeyDown: (e: ReactKeyboardEvent) => {
              child.props.onKeyDown?.(e);
              if (e.defaultPrevented) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                openDetail();
              }
            },
          })}
          {modal}
        </>
      );
    }
    return <>{children}</>;
  }

  if (variant === "panel") {
    return (
      <Surface
        variant="secondary"
        aria-label={aria}
        style={erpAuditFontStyle}
        className={[
          "mt-2 flex min-w-0 items-center gap-3 rounded-2xl border border-[#E7E7EA] bg-[#FAFAFA] px-3 py-2.5",
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
            className="hidden shrink-0 items-center rounded-full border border-[#E7E7EA] bg-white px-2 py-0.75 text-[10px] font-semibold tabular-nums text-[#52525B] dark:border-[#334155] dark:bg-[#111827] dark:text-[#B7C1D1] sm:inline-flex"
            aria-hidden
          >
            {rel}
          </span>
        ) : null}
      </Surface>
    );
  }

  // `compact`: token clicable → modal con el detalle.
  return (
    <div
      className={`flex min-w-0 ${
        align === "center" ? "justify-center" : "justify-start"
      } ${className}`}
      style={erpAuditFontStyle}
    >
      <button
        type="button"
        aria-label={`${aria}. Abrir detalle.`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          openDetail();
        }}
        className={[
          "inline-flex max-w-52 min-w-0 cursor-pointer items-center gap-1.5 rounded-full",
          "border border-[#E7E7EA] bg-white/70 px-2 py-0.75",
          "transition-colors duration-150 hover:border-[#1B5CFF]/40 hover:bg-[#F1F5FF]/70",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 focus-visible:ring-offset-1",
          "dark:border-[#273244] dark:bg-[#0f172a]/60 dark:hover:border-[#4B7CFF]/50 dark:hover:bg-[#4B7CFF]/10",
          "dark:focus-visible:ring-[#4B7CFF]/45 dark:focus-visible:ring-offset-[#111827]",
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
      </button>
      {modal}
    </div>
  );
}

export type { Props as StatusChangedByChipProps };
