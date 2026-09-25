import type { ProyectoStatusSection } from "../shared/proyectoStatusSections";
import { ESTADO_TONE } from "../shared/proyectoTokens";
import type { ProyectoEstado } from "../shared/proyectoTypes";
import { ProyectoCard } from "./ProyectoCard";
import type { ProyectoRowHandlers } from "./ProyectoRowActions";

const SECTION_ESTADO: Record<string, ProyectoEstado | null> = {
  EN_PROCESO: "en_proceso",
  PAUSADO: "pausado",
  SALDO_PENDIENTE: "saldo_pendiente",
  CERRADO: "cerrado",
  CANCELADO: "cancelado",
  OTROS: null,
};

type Props = {
  sections: ProyectoStatusSection[];
  grouped: boolean;
  fieldMode: boolean;
} & ProyectoRowHandlers;

/** Tarjetas agrupadas por estado (vista del técnico y móvil). */
export function ProyectosCardGrid({ sections, grouped, fieldMode, ...handlers }: Props) {
  let index = 0;
  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const estado = SECTION_ESTADO[section.key];
        const headingId = `proyectos-tarjetas-${section.key.toLowerCase()}`;
        return (
          <section key={section.key} aria-labelledby={grouped ? headingId : undefined} aria-label={grouped ? undefined : "Proyectos"}>
            {grouped ? (
              <h2
                id={headingId}
                className="mb-3 flex items-center gap-2 px-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#52525B] dark:text-[#B7C1D1]"
              >
                <span className={`size-2 rounded-full ${estado ? ESTADO_TONE[estado].dot : "bg-[#A1A1AA]"}`} aria-hidden />
                {section.label}
                <span className="rounded-full bg-white px-1.5 text-[11px] tabular-nums tracking-normal text-[#71717A] ring-1 ring-[#E7E7EA] dark:bg-white/[0.06] dark:text-[#8EA0B8] dark:ring-[#273244]">
                  {section.rows.length}
                </span>
              </h2>
            ) : null}
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {section.rows.map((row) => (
                <ProyectoCard key={row.id} row={row} index={index++} fieldMode={fieldMode} {...handlers} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
