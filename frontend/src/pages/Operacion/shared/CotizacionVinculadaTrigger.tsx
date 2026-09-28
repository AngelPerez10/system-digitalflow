/**
 * Disparador «Cotización vinculada» compartido por los listados de Órdenes y
 * Proyectos (solo admins): un botón compacto con el ícono de a quién
 * pertenece (DigitalFlow o SICAR) + el folio principal + «+N» si hay varias,
 * que abre un panel «Cotizaciones vinculadas» con todas; las de DigitalFlow
 * enlazan a su PDF (en otra pestaña, para no perder el listado).
 *
 * El panel va en un portal con posición fija: la tabla hace scroll horizontal
 * y recortaría un popover absoluto.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Building2, ExternalLink, FileText, Zap } from "lucide-react";
import "@/components/ui/modal-kit/motion.css";
import { parseCotizacionApiId } from "../Proyectos/form/cotizaciones/proyectoCotizacionMappers";
import { displayCotizacionFolio } from "../Proyectos/shared/proyectoFormUtils";
import { focusRing } from "../Proyectos/shared/proyectoTokens";

export type CotizacionOrigen = "digitalflow" | "sicar";

export type CotizacionRef = {
  id: string;
  origen: CotizacionOrigen;
  folio: string;
};

/* --------------------------------------------------------------------------
   Datos
   -------------------------------------------------------------------------- */

const ORIGEN_LABEL: Record<CotizacionOrigen, string> = { digitalflow: "DigitalFlow", sicar: "SICAR" };

/** Ícono + color que identifica a quién pertenece la cotización. */
const ORIGEN_ICON = { digitalflow: Zap, sicar: Building2 } as const;
const ORIGEN_TONE: Record<CotizacionOrigen, string> = {
  digitalflow: "bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63]/70 dark:text-[#9BB6FF]",
  sicar: "bg-[#F4F4F5] text-[#3F3F46] dark:bg-white/[0.08] dark:text-[#D6DEEA]",
};

export function OrigenIcon({ origen, className = "size-3.5" }: { origen: CotizacionOrigen; className?: string }) {
  const Icon = ORIGEN_ICON[origen];
  return <Icon className={className} aria-hidden />;
}

function pdfHref(c: CotizacionRef): string | null {
  if (c.origen !== "digitalflow") return null;
  const id = parseCotizacionApiId(c.id, c.origen);
  return id ? `/cotizacion/${id}/pdf` : null;
}

/* --------------------------------------------------------------------------
   Renglón (panel y bloque móvil)
   -------------------------------------------------------------------------- */

export function CotizacionVinculadaRow({ c, dense = false }: { c: CotizacionRef; dense?: boolean }) {
  const folio = displayCotizacionFolio(c.folio, c.origen);
  const href = pdfHref(c);
  const body = (
    <>
      <span
        className={`inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] ${ORIGEN_TONE[c.origen]}`}
        aria-hidden
      >
        <OrigenIcon origen={c.origen} className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-mono text-[13px] font-semibold tracking-tight text-[#09090B] dark:text-[#F8FAFC]">
          {folio}
        </span>
        <span className="mt-0.5 block text-[11.5px] text-[#71717A] dark:text-[#8EA0B8]">
          {ORIGEN_LABEL[c.origen]}
          {href ? " · Ver PDF" : ""}
        </span>
      </span>
      {href ? (
        <ExternalLink className="size-3.5 shrink-0 text-[#A1A1AA] transition-colors group-hover:text-[#1B5CFF] dark:text-[#64748B]" aria-hidden />
      ) : null}
    </>
  );
  const base = `group flex w-full items-center gap-2.5 rounded-[10px] text-left ${dense ? "px-2 py-1.5" : "px-2.5 py-2"}`;
  return href ? (
    <Link
      to={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} transition-colors hover:bg-[#F5F8FF] dark:hover:bg-[#1B2A63]/40 ${focusRing}`}
      aria-label={`Ver PDF de la cotización ${folio} (se abre en otra pestaña)`}
    >
      {body}
    </Link>
  ) : (
    <div className={base}>{body}</div>
  );
}

/* --------------------------------------------------------------------------
   Disparador + panel desplegable (portal, posición fija)
   -------------------------------------------------------------------------- */

const PANEL_W = 288;

export function CotizacionVinculadaTrigger({ cotizaciones }: { cotizaciones: CotizacionRef[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const [principal] = cotizaciones;
  const resto = cotizaciones.length - 1;
  const folio = displayCotizacionFolio(principal.folio, principal.origen);

  const place = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.min(Math.max(8, r.left), window.innerWidth - PANEL_W - 8);
    setPos({ top: r.bottom + 6, left });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const close = () => setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    // Foco al primer elemento del panel.
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("a,button")?.focus());
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-haspopup="dialog"
        aria-label={`${cotizaciones.length === 1 ? "Cotización" : `${cotizaciones.length} cotizaciones`}: ${folio}${resto > 0 ? ` y ${resto} más` : ""}. Ver detalle`}
        className={`cot-press group inline-flex max-w-full items-center gap-1.5 rounded-md text-left transition-colors ${focusRing}`}
      >
        <span
          className={`inline-flex size-5 shrink-0 items-center justify-center rounded-[6px] ${ORIGEN_TONE[principal.origen]}`}
          aria-hidden
        >
          <OrigenIcon origen={principal.origen} className="size-3" />
        </span>
        <span className="min-w-0 truncate font-mono text-[12.5px] font-semibold tabular-nums text-[#1244D1] underline decoration-[#C9D7FF] decoration-1 underline-offset-2 group-hover:decoration-[#1244D1] dark:text-[#9BB6FF] dark:decoration-[#3A4F8F]">
          {folio}
          {resto > 0 ? ` +${resto}` : ""}
        </span>
      </button>

      {open && pos
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-label="Cotizaciones vinculadas"
              className="cot-fade fixed z-[100000] rounded-[14px] border border-[#E7E7EA] bg-white p-1.5 shadow-[0_12px_32px_-8px_rgba(9,9,11,0.18),0_2px_6px_rgba(9,9,11,0.06)] dark:border-[#273244] dark:bg-[#111827]"
              style={{ top: pos.top, left: pos.left, width: PANEL_W }}
            >
              <p className="flex items-center justify-between px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#71717A] dark:text-[#8EA0B8]">
                Cotizaciones vinculadas
                <span className="rounded-full bg-[#F4F4F5] px-1.5 text-[11px] tabular-nums tracking-normal dark:bg-white/6">
                  {cotizaciones.length}
                </span>
              </p>
              <ul className="max-h-72 space-y-0.5 overflow-y-auto">
                {cotizaciones.map((c, i) => (
                  <li key={c.id || i}>
                    <CotizacionVinculadaRow c={c} />
                  </li>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/** Chip «Sin cotización» usado cuando la lista viene vacía. */
export function SinCotizacionBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-7 items-center gap-1.5 rounded-lg border border-dashed border-[#E4E4E7] px-2 text-[12px] text-[#A1A1AA] dark:border-[#273244] dark:text-[#64748B] ${className}`}
    >
      <FileText className="size-3.5" aria-hidden />
      Sin cotización
    </span>
  );
}
