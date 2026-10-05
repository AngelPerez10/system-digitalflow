/**
 * Encabezado del directorio (Cuentas / Unidades).
 *
 * - Mosaico marino con ícono dorado que cambia con la vista (se re-monta con
 *   `key`: entrada breve con `cot-fade`), título y descripción.
 * - Pestañas con ícono y conteo; el indicador azul se desliza con `transform`
 *   (sin medir).
 * - Franja de resumen: una entrada por sección (color, nombre, conteo) que
 *   lleva a esa sección del listado; a la derecha «N de M» y, si se está
 *   refrescando en segundo plano, «Sincronizando…».
 */
import { Car, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaaSeccionTone } from "../shared/cuentasAntarixTonos";

export type CaaDirectorioVista = "cuentas" | "unidades";

export type CaaResumenItem = { key: string; label: string; count: number; tone: CaaSeccionTone };

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] dark:focus-visible:ring-[rgba(75,124,255,0.28)]";

const VISTAS: Record<CaaDirectorioVista, { label: string; title: string; desc: string; Icon: typeof Users }> = {
  cuentas: {
    label: "Cuentas",
    title: "Cuentas de Wialon",
    desc: "Cada fila es una cuenta. Ábrela para editar datos, flota y accesos.",
    Icon: Users,
  },
  unidades: {
    label: "Unidades",
    title: "Unidades de la flota",
    desc: "Todas las unidades. Abre una para editar ficha, SIM y accesos desde su cuenta.",
    Icon: Car,
  },
};

export default function CuentasAntarixDirectoryHeader({
  view,
  onViewChange,
  totales,
  mostrando,
  total,
  resumen,
  cargando,
  syncing,
}: {
  view: CaaDirectorioVista;
  onViewChange: (v: CaaDirectorioVista) => void;
  totales: Record<CaaDirectorioVista, number>;
  mostrando: number;
  total: number;
  resumen: CaaResumenItem[];
  cargando: boolean;
  syncing: boolean;
}) {
  const v = VISTAS[view];

  const irASeccion = (key: string) => {
    // Tabla en escritorio, tarjetas en celular: se usa la que esté visible.
    const el = [document.getElementById(`caa-sec-${key}`), document.getElementById(`caa-sec-${key}-m`)].find((x) => x && x.getClientRects().length > 0);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className="mb-4 overflow-hidden rounded-[16px] border border-[#E7E7EA] bg-gradient-to-b from-[#FAFAFB] to-white dark:border-[#273244] dark:from-[#151E32] dark:to-[#111827]">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <span
            key={view}
            className="cot-fade inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#17235B] text-[#E6A23C] shadow-[0_8px_18px_-10px_rgba(23,35,91,0.7)] dark:bg-[#1B2A63]"
            aria-hidden
          >
            <v.Icon className="size-5" />
          </span>
          <div key={`t-${view}`} className="cot-fade min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1B5CFF] dark:text-[#7EA0FF]">Directorio</p>
            <h2 className="mt-0.5 truncate text-[18px] font-semibold leading-tight tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">{v.title}</h2>
            <p className="mt-0.5 text-[12.5px] leading-snug text-[#71717A] dark:text-[#8EA0B8]">{v.desc}</p>
          </div>
        </div>

        <div
          className="relative grid w-full shrink-0 grid-cols-2 rounded-[12px] border border-[#E7E7EA] bg-white p-1 shadow-[0_1px_2px_rgba(9,9,11,0.04)] sm:w-[18rem] dark:border-[#273244] dark:bg-[#0F172A]"
          role="tablist"
          aria-label="Vista del directorio"
        >
          <span
            className="caa-seg-pill pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-0.25rem)] rounded-[9px] bg-[#1B5CFF] shadow-[0_4px_12px_-6px_rgba(27,92,255,0.7)] dark:bg-[#4B7CFF]"
            style={{ transform: view === "unidades" ? "translateX(100%)" : "none" }}
            aria-hidden
          />
          {(Object.keys(VISTAS) as CaaDirectorioVista[]).map((k) => {
            const activo = view === k;
            const { Icon, label } = VISTAS[k];
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={activo}
                onClick={() => onViewChange(k)}
                className={cn(
                  "relative z-[1] inline-flex min-h-[40px] items-center justify-center gap-2 rounded-[9px] px-3 text-[13px] font-semibold transition-colors duration-150",
                  activo ? "text-white" : "text-[#52525B] hover:text-[#09090B] dark:text-[#B7C1D1] dark:hover:text-white",
                  focusRing,
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {label}
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums transition-colors duration-150",
                    activo ? "bg-white/20 text-white" : "bg-[#F4F4F5] text-[#71717A] dark:bg-white/[0.07] dark:text-[#8EA0B8]",
                  )}
                >
                  {totales[k].toLocaleString("es-MX")}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Resumen por sección: cada entrada lleva a su sección del listado. */}
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5 border-t border-[#EDEDF0] bg-white/70 px-3 py-2.5 sm:px-4 dark:border-[#1F2A3C] dark:bg-white/[0.015]">
        {cargando ? (
          <span className="h-7 w-56 rounded-full bg-[#F4F4F5] motion-safe:animate-pulse dark:bg-white/[0.06]" aria-hidden />
        ) : (
          resumen.map((r, i) => (
            <button
              key={`${view}-${r.key}`}
              type="button"
              onClick={() => irASeccion(r.key)}
              disabled={r.count === 0}
              style={{ "--caa-i": i } as React.CSSProperties}
              className={cn(
                "caa-row-in cot-press inline-flex h-8 items-center gap-2 rounded-full px-2.5 text-[12.5px] font-medium text-[#3F3F46] hover:bg-[#F4F4F5] disabled:pointer-events-none disabled:opacity-45 dark:text-[#D6DEEA] dark:hover:bg-white/[0.05]",
                focusRing,
              )}
              title={r.count > 0 ? `Ir a ${r.label}` : undefined}
            >
              <span className={cn("h-3.5 w-[3px] rounded-full", r.tone.bar)} aria-hidden />
              {r.label}
              <span className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ring-1 ring-inset", r.tone.count)}>
                {r.count}
              </span>
            </button>
          ))
        )}
        <span className="ml-auto inline-flex items-center gap-2 pl-2 text-[12px] text-[#71717A] dark:text-[#8EA0B8]" aria-live="polite">
          {syncing ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-[#1244D1] dark:text-[#9BB6FF]">
              <span className="size-1.5 rounded-full bg-[#1B5CFF] motion-safe:animate-pulse dark:bg-[#6B93FF]" aria-hidden />
              Sincronizando…
            </span>
          ) : null}
          {!cargando ? (
            <span>
              <span className="font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">{mostrando.toLocaleString("es-MX")}</span> de{" "}
              <span className="tabular-nums">{total.toLocaleString("es-MX")}</span>
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}
