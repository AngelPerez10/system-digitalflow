import { FileText } from "lucide-react";
import "@/components/ui/modal-kit/motion.css";
import { MonthSwitcher } from "../../Proyectos/list/ProyectosHero";
import type { ResumenReportes } from "./reporteListUtils";

type Props = {
  selectedMonth: string;
  onShiftMonth: (delta: number) => void;
  stats: ResumenReportes;
  /** Técnico (solo sus reportes): título propio y «Sin evidencia» en lugar de «Técnicos». */
  fieldMode: boolean;
};

/**
 * Encabezado de celular (< 640 px): la banda marina del escritorio en versión
 * compacta, con el cambio de mes y el resumen del mes integrados para no
 * ocupar media pantalla con tarjetas sueltas.
 */
export function ReportesMobileHeader({ selectedMonth, onShiftMonth, stats, fieldMode }: Props) {
  const metricas = [
    { label: "Reportes", value: stats.total },
    { label: "Con fotos", value: stats.conEvidencia },
    { label: "Fotos", value: stats.totalFotos },
    fieldMode ? { label: "Sin fotos", value: stats.sinEvidencia } : { label: "Técnicos", value: stats.tecnicos },
  ];

  return (
    <header className="cot-sheen relative overflow-hidden rounded-[20px] bg-[#17235B] text-white dark:bg-[#1B2A63] sm:hidden">
      <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#E6A23C]/15 blur-3xl" aria-hidden />
      <div className="relative space-y-4 p-4">
        <div className="flex items-start gap-3">
          <span className="cot-tick inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]" aria-hidden>
            <FileText className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/55">Operación</p>
            <h1 className="mt-0.5 text-[21px] font-bold leading-tight tracking-[-0.6px]">{fieldMode ? "Mis reportes" : "Reportes de mantenimiento"}</h1>
            <p className="mt-1 text-[13px] leading-snug text-white/65">
              {fieldMode ? "Evidencia Antes / Después de tus servicios." : "Evidencia Antes / Después de cada servicio."}
            </p>
          </div>
        </div>

        <MonthSwitcher selectedMonth={selectedMonth} onShiftMonth={onShiftMonth} />

        <dl className="grid grid-cols-4 divide-x divide-white/10 rounded-[14px] bg-white/[0.06] py-2.5" aria-label="Resumen del mes">
          {metricas.map((m) => (
            // dt antes que dd en el HTML; `flex-col-reverse` pone la cifra arriba.
            <div key={m.label} className="flex min-w-0 flex-col-reverse px-1 text-center">
              <dt className="mt-1 truncate text-[10px] font-medium uppercase tracking-wide text-white/55">{m.label}</dt>
              <dd key={m.value} className="cot-flash text-[17px] font-semibold leading-none tabular-nums">
                {m.value.toLocaleString("es-MX")}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}
