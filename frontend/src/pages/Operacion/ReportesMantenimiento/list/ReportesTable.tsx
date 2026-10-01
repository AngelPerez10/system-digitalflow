import { memo, type CSSProperties } from "react";
import "@/components/ui/modal-kit/motion.css";
import { focusRing, folioText } from "../../Proyectos/shared/proyectoTokens";
import type { ReporteMantenimiento } from "../reporteTypes";
import { ReporteEvidencia, ReporteRowActions, type ReporteHandlers } from "./ReporteEvidencia";
import { ReporteTecnicosStack } from "./ReporteTecnicosStack";
import { folioDe, formatFechaCorta, type SeccionReportes } from "./reporteListUtils";

type Avatars = Map<string, { id: number; url: string }>;

const th = "px-3 py-2.5 text-left text-[12px] font-medium text-[#71717A] dark:text-[#8EA0B8]";
const td = "px-3 py-3 align-middle";
const SECTION_DOT: Record<SeccionReportes["key"], string> = { CON: "bg-emerald-500 dark:bg-emerald-400", SIN: "bg-amber-500 dark:bg-amber-400" };

type RowProps = { row: ReporteMantenimiento; index: number; avatars: Avatars } & ReporteHandlers;

const ReporteTableRow = memo(function ReporteTableRow({ row, index, avatars, ...handlers }: RowProps) {
  const folio = folioDe(row);
  return (
    <tr className="cot-rise group border-t border-[#F0F0F2] transition-colors duration-150 hover:bg-[#FAFAFB] dark:border-[#1F2A3C] dark:hover:bg-white/2" style={{ "--cot-i": Math.min(index, 10) } as CSSProperties}>
      <td className={`${td} pl-5`}>
        <div className="min-w-0">
          <span className={folioText}>{folio}</span>
          {handlers.canEdit ? (
            <button
              type="button"
              onClick={() => handlers.onEdit(row)}
              className={`mt-0.5 block max-w-full truncate rounded-lg text-left text-[14px] font-medium text-[#09090B] hover:text-[#1244D1] dark:text-[#F8FAFC] dark:hover:text-[#9BB6FF] ${focusRing}`}
              title={row.orden_cliente}
            >
              {row.orden_cliente || "Sin cliente"}
            </button>
          ) : (
            <p className="mt-0.5 truncate text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC]" title={row.orden_cliente}>
              {row.orden_cliente || "Sin cliente"}
            </p>
          )}
          <p className="mt-0.5 truncate font-mono text-[12px] text-[#71717A] dark:text-[#8EA0B8]">{row.orden_folio || "Sin origen"}</p>
        </div>
      </td>
      <td className={td}>
        <ReporteTecnicosStack value={row.tecnico_nombre} avatars={avatars} />
      </td>
      <td className={`${td} whitespace-nowrap text-[13px] tabular-nums text-[#52525B] dark:text-[#B7C1D1]`}>{formatFechaCorta(row.fecha_servicio)}</td>
      <td className={td}>
        <ReporteEvidencia row={row} />
      </td>
      <td className={`${td} pr-5`}>
        <div className="flex justify-end opacity-80 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
          <ReporteRowActions row={row} {...handlers} />
        </div>
      </td>
    </tr>
  );
});

type Props = {
  sections: SeccionReportes[];
  /** Con un segmento filtrado no se pintan encabezados de sección. */
  grouped: boolean;
  avatars: Avatars;
} & ReporteHandlers;

/** Tabla de escritorio agrupada por evidencia (mismo patrón que la de Proyectos y Órdenes). */
export function ReportesTable({ sections, grouped, avatars, ...handlers }: Props) {
  let index = 0;
  return (
    <div className="overflow-x-auto overflow-y-hidden">
      <table className="w-full min-w-4xl table-fixed border-collapse">
        <colgroup>
          <col className="w-[30%]" />
          <col className="w-[20%]" />
          <col className="w-[13%]" />
          <col className="w-[24%]" />
          <col className="w-32" />
        </colgroup>
        <thead className="sticky top-0 z-1 bg-[#FAFAFA]/95 backdrop-blur-sm dark:bg-[#0F172A]/95">
          <tr>
            <th scope="col" className={`${th} pl-5`}>
              Reporte
            </th>
            <th scope="col" className={th}>
              Técnicos
            </th>
            <th scope="col" className={th}>
              Fecha
            </th>
            <th scope="col" className={th}>
              Evidencia
            </th>
            <th scope="col" className={`${th} pr-5 text-right`}>
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        {sections.map((section) => {
          const headingId = `reportes-tabla-${section.key.toLowerCase()}`;
          return (
            <tbody key={section.key} aria-labelledby={grouped ? headingId : undefined}>
              {grouped ? (
                <tr>
                  <th scope="colgroup" colSpan={5} className="border-t border-[#F0F0F2] bg-white px-5 pb-1.5 pt-4 text-left dark:border-[#1F2A3C] dark:bg-[#111827]">
                    <span id={headingId} className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-widest text-[#52525B] dark:text-[#B7C1D1]">
                      <span className={`size-2 rounded-full ${SECTION_DOT[section.key]}`} aria-hidden />
                      {section.label}
                      <span className="rounded-full bg-[#F4F4F5] px-1.5 text-[11px] tabular-nums tracking-normal text-[#71717A] dark:bg-white/6 dark:text-[#8EA0B8]">{section.rows.length}</span>
                    </span>
                  </th>
                </tr>
              ) : null}
              {section.rows.map((row) => (
                <ReporteTableRow key={row.id} row={row} index={index++} avatars={avatars} {...handlers} />
              ))}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
