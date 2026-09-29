/**
 * Tarjetas de resumen del tablero Equipo — mismo formato visual que las de
 * Órdenes (`OrdenesPageStats`) y Proyectos (`ProyectosPageStats`).
 */
import type { ReactNode } from "react";
import { erpStatCardClass } from "../../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import { TIPO_TONE } from "../shared/equipoTokens";

export type EquipoStatsData = {
  ordenes: number;
  proyectos: number;
  abiertos: number;
  sinAsignar: number;
};

function StatCard({ label, value, tone, icon }: { label: string; value: number; tone: string; icon: ReactNode }) {
  return (
    <div className={`${erpStatCardClass} min-w-0`}>
      <div className="flex items-center gap-2.5 sm:gap-3">
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border sm:h-10 sm:w-10 ${tone}`}>
          <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            {icon}
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[#6E6E77] sm:text-[10px]">{label}</p>
          <p key={value} className="cot-flash mt-0.5 text-base font-semibold tabular-nums text-[#09090B] dark:text-white sm:text-lg">
            {value.toLocaleString("es-MX")}
          </p>
        </div>
      </div>
    </div>
  );
}

export function EquipoStats({ stats }: { stats: EquipoStatsData }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4" role="group" aria-label="Resumen del equipo">
      <StatCard
        label="Órdenes de la semana"
        value={stats.ordenes}
        tone={TIPO_TONE.orden.stat}
        icon={<path d="M6 6h12M6 12h12M6 18h12" strokeLinecap="round" />}
      />
      <StatCard
        label="Proyectos de la semana"
        value={stats.proyectos}
        tone={TIPO_TONE.proyecto.stat}
        icon={<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinejoin="round" />}
      />
      <StatCard
        label="Abiertos"
        value={stats.abiertos}
        tone="border-orange-200/80 bg-orange-50/90 text-orange-900 dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-200"
        icon={<path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round" />}
      />
      <StatCard
        label="Sin asignar"
        value={stats.sinAsignar}
        tone="border-amber-200/70 bg-amber-50/90 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200"
        icon={
          <>
            <path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" strokeLinecap="round" />
            <circle cx="9" cy="7" r="3.5" />
            <path d="M19 8v5M21.5 10.5h-5" strokeLinecap="round" />
          </>
        }
      />
    </div>
  );
}
