import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { useAuth } from "@/context/AuthContext";
import { useNotificaciones, type Notificacion } from "@/hooks/useNotificaciones";

/* --------------------------------------------------------------------------
   Campanita del header + panel flotante "animated notification" (estilo glass).
   Tarjetas con entrada escalonada, arrastrar-para-descartar y clic→navegar.
   Respeta prefers-reduced-motion.
   -------------------------------------------------------------------------- */

/** Icono de trazo por tipo (hereda color del contenedor). */
function TipoIcon({ tipo }: { tipo: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    className: "h-4 w-4",
  } as const;
  if (tipo === "orden_prioridad_escalada") {
    return (
      <svg {...common}>
        <path d="M12 5v14M6 11l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (tipo === "poliza_mantenimiento_proximo") {
    return (
      <svg {...common}>
        <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  }
  if (tipo === "orden_asignada" || tipo === "orden_tomada") {
    return (
      <svg {...common}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }
  if (tipo === "orden_liberada") {
    return (
      <svg {...common}>
        <path d="M3 7h13M3 12h9M3 17h6M18 7v10M21 10l-3-3-3 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
    </svg>
  );
}

/** Chip de color por tipo (fondo translúcido + texto). */
const TONO_POR_TIPO: Record<string, string> = {
  orden_prioridad_escalada:
    "bg-rose-500/15 text-rose-700 ring-rose-500/25 dark:bg-rose-500/20 dark:text-rose-200 dark:ring-rose-400/25",
  orden_pendiente:
    "bg-amber-500/15 text-amber-800 ring-amber-500/25 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-400/25",
  poliza_mantenimiento_proximo:
    "bg-sky-500/15 text-sky-800 ring-sky-500/25 dark:bg-sky-500/20 dark:text-sky-200 dark:ring-sky-400/25",
  orden_liberada:
    "bg-[#1B5CFF]/12 text-[#1244D1] ring-[#1B5CFF]/25 dark:bg-[#4B7CFF]/18 dark:text-[#4B7CFF] dark:ring-[#4B7CFF]/25",
  orden_asignada:
    "bg-emerald-500/15 text-emerald-800 ring-emerald-500/25 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-400/25",
  orden_tomada:
    "bg-emerald-500/15 text-emerald-800 ring-emerald-500/25 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-400/25",
};

function tiempoRelativo(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const min = Math.round((Date.now() - t) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "ayer";
  if (d < 7) return `hace ${d} días`;
  return new Date(t).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

/* Superficie sólida: el translúcido se enturbiaba sobre las bandas marinas del
   sistema. Se conserva un desenfoque muy leve y una sombra marcada. */
const PANEL_SURFACE =
  "rounded-2xl border border-[#e7ded0] bg-[#fdfcfa] shadow-[0_24px_60px_-18px_rgba(28,25,23,0.5)] ring-1 ring-black/[0.04] " +
  "backdrop-blur-[2px] dark:border-white/10 dark:bg-[#111827] dark:ring-white/10 dark:shadow-[0_28px_64px_-18px_rgba(0,0,0,0.75)]";

type CardProps = {
  n: Notificacion;
  index: number;
  reduce: boolean;
  onOpen: (n: Notificacion) => void;
  onDismiss: (n: Notificacion) => void;
};

function NotificacionCard({ n, index, reduce, onOpen, onDismiss }: CardProps) {
  const tono = TONO_POR_TIPO[n.tipo] ?? "bg-black/5 text-[#6E6E77] ring-black/5 dark:bg-white/10 dark:text-[#8EA0B8] dark:ring-white/10";
  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: 28, scale: 0.98 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: 64, scale: 0.96 }}
      transition={
        reduce
          ? { duration: 0.12 }
          : { type: "spring", stiffness: 460, damping: 34, delay: Math.min(index, 4) * 0.045 }
      }
      drag={reduce ? false : "x"}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 0.7 }}
      dragSnapToOrigin
      onDragEnd={(_e, info) => {
        if (info.offset.x > 110 || info.velocity.x > 700) onDismiss(n);
      }}
      className="group relative"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpen(n)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen(n);
          }
        }}
        className={`flex cursor-pointer items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-[#e7ded0] hover:bg-[#f3ede2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:hover:border-white/10 dark:hover:bg-white/[0.05] ${
          n.leida ? "" : "bg-[#1B5CFF]/[0.045] dark:bg-[#4B7CFF]/[0.09]"
        }`}
      >
        <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${tono}`} aria-hidden>
          <TipoIcon tipo={n.tipo} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span
              className={`text-[13px] leading-snug ${
                n.leida
                  ? "font-medium text-[#52525B] dark:text-[#B7C1D1]"
                  : "font-semibold text-[#09090B] dark:text-[#F8FAFC]"
              }`}
            >
              {n.titulo}
            </span>
            {!n.leida && (
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#1B5CFF] shadow-[0_0_0_3px_rgba(27,92,255,0.15)] dark:bg-[#4B7CFF]" aria-label="Sin leer" />
            )}
          </span>
          {n.cuerpo && (
            <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-[#6E6E77] dark:text-[#8EA0B8]">
              {n.cuerpo}
            </span>
          )}
          <span className="mt-1 block text-[11px] text-[#A1A1AA] dark:text-[#6E6E77]">
            {tiempoRelativo(n.created_at)}
          </span>
        </span>
      </div>

      <button
        type="button"
        onClick={() => onDismiss(n)}
        aria-label={`Descartar: ${n.titulo}`}
        className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#A1A1AA] opacity-0 transition-opacity hover:bg-black/5 hover:text-[#52525B] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 group-hover:opacity-100 dark:hover:bg-white/10 dark:hover:text-[#E5E7EB] [@media(pointer:coarse)]:opacity-100"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>
    </motion.li>
  );
}

export default function NotificationDropdown() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const reduce = !!useReducedMotion();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const rootRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const { items, noLeidas, loading, error, cargarLista, marcarLeida, marcarTodas } = useNotificaciones();

  const visibles = useMemo(() => items.filter((n) => !dismissed.has(n.id)), [items, dismissed]);

  useEffect(() => {
    if (open) void cargarLista();
  }, [open, cargarLista]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        bellRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const badge = noLeidas > 99 ? "99+" : String(noLeidas);

  const abrirNotificacion = useCallback(
    (n: Notificacion) => {
      if (!n.leida) void marcarLeida(n.id);
      setOpen(false);
      if (n.url) navigate(n.url);
    },
    [marcarLeida, navigate],
  );

  const descartar = useCallback(
    (n: Notificacion) => {
      setDismissed((prev) => {
        const next = new Set(prev);
        next.add(n.id);
        return next;
      });
      if (!n.leida) void marcarLeida(n.id);
    },
    [marcarLeida],
  );

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={bellRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : "Notificaciones"}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e7ded0] text-[#6E6E77] transition-colors hover:bg-[#f2ece1] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/35 dark:border-[#273244] dark:text-[#8EA0B8] dark:hover:bg-[#243048] dark:hover:text-[#F8FAFC] lg:h-11 lg:w-11"
      >
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {noLeidas > 0 && (
          <span className="absolute -right-1 -top-1 flex" aria-hidden>
            {!reduce && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1B5CFF]/60" />
            )}
            <span className="relative inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#1B5CFF] px-1 text-[10px] font-bold leading-[18px] text-white ring-2 ring-[#f9f7f3] dark:ring-[#0f172a]">
              {badge}
            </span>
          </span>
        )}
      </button>

      {/* Región viva: anuncia el contador sin robar foco. */}
      <span className="sr-only" role="status" aria-atomic="true">
        {noLeidas > 0 ? `${noLeidas} notificaciones sin leer` : "Sin notificaciones nuevas"}
      </span>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role="dialog"
            aria-label="Notificaciones"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.96 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
            transition={reduce ? { duration: 0.12 } : { type: "spring", stiffness: 420, damping: 32 }}
            style={{ transformOrigin: "top right" }}
            className={`fixed inset-x-3 top-[64px] z-[100000] flex max-h-[72vh] origin-top-right flex-col overflow-hidden ${PANEL_SURFACE} sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+10px)] sm:max-h-[min(72vh,540px)] sm:w-[384px]`}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#ece3d4] bg-[#f7f2e9] px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#09090B] dark:text-[#F8FAFC]">Notificaciones</p>
                <p className="text-[11px] text-[#6E6E77] dark:text-[#8EA0B8]">
                  {noLeidas > 0 ? `${noLeidas} sin leer` : "Estás al día"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {noLeidas > 0 && (
                  <button
                    type="button"
                    onClick={() => void marcarTodas()}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-[#1244D1] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/35 dark:text-[#4B7CFF]"
                  >
                    Marcar todas
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    bellRef.current?.focus();
                  }}
                  aria-label="Cerrar notificaciones"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#6E6E77] hover:bg-black/5 hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/35 dark:text-[#8EA0B8] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 custom-scrollbar">
              {loading && visibles.length === 0 ? (
                <ul className="space-y-1.5 p-1" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex items-start gap-3 rounded-xl px-3 py-2.5">
                      <span className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-black/[0.06] dark:bg-white/10" />
                      <span className="flex-1 space-y-2 py-0.5">
                        <span className="block h-3 w-3/4 animate-pulse rounded bg-black/[0.06] dark:bg-white/10" />
                        <span className="block h-2.5 w-1/2 animate-pulse rounded bg-black/[0.05] dark:bg-white/[0.07]" />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : error ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm font-medium text-[#52525B] dark:text-[#B7C1D1]">No se pudieron cargar</p>
                  <button
                    type="button"
                    onClick={() => void cargarLista()}
                    className="mt-2 rounded-lg border border-[#e7ded0] px-3 py-1.5 text-xs font-semibold text-[#09090B] hover:bg-black/5 dark:border-white/10 dark:text-[#F8FAFC] dark:hover:bg-white/10"
                  >
                    Reintentar
                  </button>
                </div>
              ) : visibles.length === 0 ? (
                <div className="flex flex-col items-center px-4 py-8 text-center">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B5CFF]/10 text-[#1B5CFF] dark:bg-[#4B7CFF]/15 dark:text-[#4B7CFF]">
                    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <p className="mt-2.5 text-sm font-medium text-[#52525B] dark:text-[#B7C1D1]">Sin novedades</p>
                  <p className="mt-0.5 text-xs text-[#6E6E77] dark:text-[#8EA0B8]">Te avisaremos cuando algo pase.</p>
                </div>
              ) : (
                <motion.ul layout={!reduce} className="space-y-1">
                  <AnimatePresence initial={false}>
                    {visibles.map((n, i) => (
                      <NotificacionCard
                        key={n.id}
                        n={n}
                        index={i}
                        reduce={reduce}
                        onOpen={abrirNotificacion}
                        onDismiss={descartar}
                      />
                    ))}
                  </AnimatePresence>
                </motion.ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
