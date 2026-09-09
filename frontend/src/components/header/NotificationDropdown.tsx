import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import { useNotificaciones, type Notificacion } from "@/hooks/useNotificaciones";

/* Icono por tipo de notificación (trazo, hereda color). */
function TipoIcon({ tipo }: { tipo: string }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, className: "h-4 w-4" } as const;
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

const TONO_POR_TIPO: Record<string, string> = {
  orden_prioridad_escalada: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
  orden_pendiente: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
  poliza_mantenimiento_proximo: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200",
  orden_liberada: "bg-[rgba(27,92,255,0.12)] text-[#1244D1] dark:bg-[rgba(75,124,255,0.18)] dark:text-[#4B7CFF]",
  orden_asignada: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  orden_tomada: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
};

function tiempoRelativo(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const diff = Date.now() - t;
  const min = Math.round(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "ayer";
  if (d < 7) return `hace ${d} días`;
  return new Date(t).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

export default function NotificationDropdown() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { items, noLeidas, loading, error, cargarLista, marcarLeida, marcarTodas } = useNotificaciones();

  useEffect(() => {
    if (open) void cargarLista();
  }, [open, cargarLista]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const badge = useMemo(() => (noLeidas > 99 ? "99+" : String(noLeidas)), [noLeidas]);

  if (!isAuthenticated) return null;

  const abrirNotificacion = (n: Notificacion) => {
    if (!n.leida) void marcarLeida(n.id);
    setOpen(false);
    if (n.url) navigate(n.url);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={noLeidas > 0 ? `Notificaciones (${noLeidas} sin leer)` : "Notificaciones"}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e7ded0] text-[#6E6E77] transition-colors hover:bg-[#f2ece1] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/35 dark:border-[#273244] dark:text-[#8EA0B8] dark:hover:bg-[#243048] dark:hover:text-[#F8FAFC] lg:h-11 lg:w-11"
      >
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {noLeidas > 0 && (
          <span
            className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[#1B5CFF] px-1 text-[10px] font-bold leading-[18px] text-white ring-2 ring-[#f9f7f3] dark:ring-[#0f172a]"
            aria-hidden
          >
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notificaciones"
          className="fixed left-3 right-3 top-[68px] z-[100000] flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-[#e7ded0] bg-white shadow-[0_20px_50px_-20px_rgba(28,25,23,0.4)] dark:border-[#273244] dark:bg-[#111827] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[min(70vh,560px)] sm:w-[380px]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#e7ded0] px-4 py-3 dark:border-[#273244]">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#09090B] dark:text-[#F8FAFC]">Notificaciones</p>
              <p className="text-[11px] text-[#6E6E77] dark:text-[#8EA0B8]">
                {noLeidas > 0 ? `${noLeidas} sin leer` : "Al día"}
              </p>
            </div>
            {noLeidas > 0 && (
              <button
                type="button"
                onClick={() => void marcarTodas()}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-[#1244D1] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/35 dark:text-[#4B7CFF]"
              >
                Marcar todas
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
            {loading && items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-[#6E6E77] dark:text-[#8EA0B8]" role="status" aria-live="polite">
                Cargando…
              </p>
            ) : error ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-medium text-[#52525B] dark:text-[#B7C1D1]">No se pudieron cargar</p>
                <button
                  type="button"
                  onClick={() => void cargarLista()}
                  className="mt-2 rounded-lg border border-[#e7ded0] px-3 py-1.5 text-xs font-semibold text-[#09090B] hover:bg-[#f5f0e8] dark:border-[#273244] dark:text-[#F8FAFC] dark:hover:bg-[#1e293b]"
                >
                  Reintentar
                </button>
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-[#6E6E77] dark:text-[#8EA0B8]">
                No tienes notificaciones.
              </p>
            ) : (
              <ul className="divide-y divide-[#efe7d9] dark:divide-[#273244]">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => abrirNotificacion(n)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f7f2e9] focus-visible:outline-none focus-visible:bg-[#f7f2e9] dark:hover:bg-[#1e293b] dark:focus-visible:bg-[#1e293b] ${
                        n.leida ? "" : "bg-[rgba(27,92,255,0.045)] dark:bg-[rgba(75,124,255,0.08)]"
                      }`}
                    >
                      <span
                        className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          TONO_POR_TIPO[n.tipo] ?? "bg-[#f2ece1] text-[#6E6E77] dark:bg-[#243048] dark:text-[#8EA0B8]"
                        }`}
                        aria-hidden
                      >
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
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#1B5CFF] dark:bg-[#4B7CFF]" aria-label="Sin leer" />
                          )}
                        </span>
                        {n.cuerpo && (
                          <span className="mt-0.5 block truncate text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">
                            {n.cuerpo}
                          </span>
                        )}
                        <span className="mt-1 block text-[11px] text-[#A1A1AA] dark:text-[#6E6E77]">
                          {tiempoRelativo(n.created_at)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
