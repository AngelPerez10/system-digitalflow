/**
 * Indicadores que también filtran: Todas · Próxima visita · Vencidas · Vigentes.
 * Grupo de radio (flechas del teclado entre opciones). La cifra se re-monta con
 * `key` al cambiar para un destello breve (`cot-flash`).
 */
import type { CSSProperties } from "react";
import { AlarmClock, CalendarCheck2, CircleAlert, Layers } from "lucide-react";
import { ESTADO_TONO, filtroTabClass } from "../shared/polizaStyles";
import type { PolizaEstadoFiltro, PolizaStats } from "./polizaListTypes";

type Props = {
  stats: PolizaStats;
  value: PolizaEstadoFiltro;
  onChange: (next: PolizaEstadoFiltro) => void;
  loading?: boolean;
};

const OPCIONES: {
  id: PolizaEstadoFiltro;
  label: string;
  hint: string;
  icon: typeof Layers;
  count: (s: PolizaStats) => number;
}[] = [
  { id: "todas", label: "Todas", hint: "Pólizas registradas", icon: Layers, count: (s) => s.total },
  {
    id: "proxima_visita",
    label: "Próxima visita",
    hint: "En los próximos 30 días",
    icon: AlarmClock,
    count: (s) => s.proximaVisita,
  },
  { id: "vencida", label: "Vencidas", hint: "Sin visitas pendientes", icon: CircleAlert, count: (s) => s.vencidas },
  { id: "vigente", label: "Vigentes", hint: "Al corriente", icon: CalendarCheck2, count: (s) => s.vigentes },
];

export default function PolizasEstadoTabs({ stats, value, onChange, loading = false }: Props) {
  return (
    <div role="radiogroup" aria-label="Filtrar pólizas por estado" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {OPCIONES.map((o, i) => {
        const active = value === o.id;
        const n = o.count(stats);
        const Icon = o.icon;
        const tono = o.id === "todas" ? null : ESTADO_TONO[o.id];
        return (
          <label key={o.id} className="cot-rise block" style={{ "--cot-i": i } as CSSProperties}>
            <input
              type="radio"
              name="polizas-estado"
              className="peer sr-only"
              checked={active}
              onChange={() => onChange(o.id)}
            />
            <span
              className={`${filtroTabClass(active, o.id)} cursor-pointer peer-focus-visible:ring-4 peer-focus-visible:ring-[rgba(27,92,255,0.25)]`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#CBD5E1]">{o.label}</span>
                <span
                  className={`inline-flex size-8 items-center justify-center rounded-[10px] ${
                    tono
                      ? `${tono.soft} ${tono.text}`
                      : "bg-[rgba(27,92,255,0.08)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.14)] dark:text-[#9BB6FF]"
                  }`}
                  aria-hidden
                >
                  <Icon className="size-4" strokeWidth={2} />
                </span>
              </span>
              <span className="mt-2 flex items-end justify-between gap-2">
                {loading ? (
                  <span className="h-8 w-10 animate-pulse rounded-md bg-[#F4F4F5] dark:bg-[#1B2539]" aria-hidden />
                ) : (
                  <span
                    key={n}
                    className="cot-flash text-[30px] font-bold leading-none tracking-[-1px] tabular-nums text-[#09090B] dark:text-[#F8FAFC]"
                  >
                    {n.toLocaleString("es-MX")}
                  </span>
                )}
                <span className="truncate pb-0.5 text-right text-[11.5px] text-[#6E6E77] dark:text-[#8EA0B8]">
                  {o.hint}
                </span>
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
