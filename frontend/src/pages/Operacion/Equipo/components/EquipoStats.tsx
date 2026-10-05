/**
 * Tarjetas de resumen del tablero Equipo — mismo formato visual que las de
 * Órdenes (`OrdenesPageStats`) y Proyectos (`ProyectosPageStats`). «Avance»
 * lleva su propio diseño: cifra grande, detalle y barra de progreso.
 */
import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { erpStatCardClass } from "../../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import { TIPO_TONE } from "../shared/equipoTokens";

export type EquipoStatsData = {
  ordenes: number;
  proyectos: number;
  abiertos: number;
  cerrados: number;
  /** Sin técnico (todos los meses cargados). */
  sinAsignar: number;
};

function StatCard({ label, value, tone, icon }: { label: string; value: number; tone: string; icon: ReactNode }) {
  return (
    <div className={`${erpStatCardClass} eq-row-in min-w-0`}>
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

/** Avance de la semana: cerrados / total, con barra (solo `transform`). */
function AvanceCard({ cerrados, total }: { cerrados: number; total: number }) {
  const progress = total > 0 ? cerrados / total : 0;
  const pct = Math.round(progress * 100);
  return (
    <div className={`${erpStatCardClass} eq-row-in min-w-0 flex-col! justify-center gap-0!`}>
      <p className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-wide text-[#6E6E77] sm:text-[10px]">
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-[#E9F8F0] text-[#04724D] ring-1 ring-inset ring-[#BFE6D4] dark:bg-[#0F2A1C] dark:text-[#86EFAC] dark:ring-[#1E5A42]" aria-hidden>
          <CheckCircle2 className="size-3.5" />
        </span>
        Avance de la semana
      </p>
      <div className="mt-2 flex w-full items-baseline gap-2">
        <p key={pct} className="cot-flash text-[22px] font-semibold leading-none tracking-[-0.6px] tabular-nums text-[#09090B] dark:text-white">
          {pct}
          <span className="ml-0.5 text-[13px] font-medium tracking-normal text-[#71717A] dark:text-[#8EA0B8]">%</span>
        </p>
        <p className="truncate text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
          {cerrados} de {total} cerrados
        </p>
      </div>
      <span className="mt-2.5 block h-1 w-full overflow-hidden rounded-full bg-[#EDEDF0] dark:bg-[#1F2A3C]" role="img" aria-label={`${pct} % completado`}>
        <span
          className="block h-full w-full origin-left rounded-full bg-[#0E8A5F] transition-transform duration-700 ease-out motion-reduce:transition-none dark:bg-[#34D399]"
          style={{ transform: `scaleX(${Math.max(progress, 0.02)})` }}
        />
      </span>
    </div>
  );
}

export function EquipoStats({ stats }: { stats: EquipoStatsData }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4" role="group" aria-label="Resumen del equipo">
      <StatCard label="Órdenes de la semana" value={stats.ordenes} tone={TIPO_TONE.orden.stat} icon={<path d="M6 6h12M6 12h12M6 18h12" strokeLinecap="round" />} />
      <StatCard
        label="Proyectos de la semana"
        value={stats.proyectos}
        tone={TIPO_TONE.proyecto.stat}
        icon={<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinejoin="round" />}
      />
      <AvanceCard cerrados={stats.cerrados} total={stats.abiertos + stats.cerrados} />
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
