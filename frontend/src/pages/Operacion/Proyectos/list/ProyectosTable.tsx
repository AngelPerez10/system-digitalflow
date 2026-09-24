import { memo, type CSSProperties } from "react";
import { StatusChangedByChip } from "../../shared/StatusChangedByChip";
import { displayCotizacionFolio, displayProyectoFolio } from "../shared/proyectoFormUtils";
import {
  formatPeriodoLabel,
  proyectoPeriodo,
  proyectoTeam,
  proyectoTiposLabels,
} from "../shared/proyectoListUtils";
import type { ProyectoStatusSection } from "../shared/proyectoStatusSections";
import { AvatarStack, EstadoPill, ProgressBar } from "../shared/ProyectoUi";
import { ESTADO_TONE, focusRing, folioText, origenChip, toneForEstado } from "../shared/proyectoTokens";
import type { ProyectoEstado, ProyectoRow } from "../shared/proyectoTypes";
import { ProyectoRowActions, type ProyectoRowHandlers } from "./ProyectoRowActions";

const th = "px-3 py-2.5 text-left text-[12px] font-medium text-[#71717A] dark:text-[#8EA0B8]";
const td = "px-3 py-3 align-middle";

const SECTION_ESTADO: Record<string, ProyectoEstado | null> = {
  EN_PROCESO: "en_proceso",
  PAUSADO: "pausado",
  CERRADO: "cerrado",
  CANCELADO: "cancelado",
  OTROS: null,
};

type RowProps = { row: ProyectoRow; index: number } & ProyectoRowHandlers;

const ProyectoTableRow = memo(function ProyectoTableRow({ row, index, ...handlers }: RowProps) {
  const { canEdit, onEdit } = handlers;
  const team = proyectoTeam(row);
  const tipos = proyectoTiposLabels(row);
  const periodo = proyectoPeriodo(row);
  const tone = toneForEstado(row.estado);
  const avance = Math.round(Number(row.draft?.porcentajeAvance) || 0);
  const folio = displayProyectoFolio(row.folio);

  return (
    <tr
      className="cot-rise group border-t border-[#F0F0F2] transition-colors duration-150 hover:bg-[#FAFAFB] dark:border-[#1F2A3C] dark:hover:bg-white/[0.02]"
      style={{ "--cot-i": Math.min(index, 10) } as CSSProperties}
    >
      <td className={`${td} pl-5`}>
        <div className="min-w-0">
          <span className={folioText}>{folio}</span>
          {canEdit ? (
            <button
              type="button"
              onClick={() => onEdit(row)}
              className={`mt-0.5 block max-w-full truncate rounded-[4px] text-left text-[14px] font-medium text-[#09090B] hover:text-[#1244D1] dark:text-[#F8FAFC] dark:hover:text-[#9BB6FF] ${focusRing}`}
              title={row.cliente}
            >
              {row.cliente || "Sin cliente"}
            </button>
          ) : (
            <p className="mt-0.5 truncate text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC]" title={row.cliente}>
              {row.cliente || "Sin cliente"}
            </p>
          )}
          {tipos.length ? (
            <p className="mt-0.5 truncate text-[12px] text-[#71717A] dark:text-[#8EA0B8]" title={tipos.join(", ")}>
              {tipos.join(" · ")}
            </p>
          ) : null}
        </div>
      </td>
      <td className={td}>
        {team.todos.length ? (
          <div className="flex min-w-0 items-center gap-2">
            <AvatarStack people={team.todos} max={3} />
            <span className="min-w-0 truncate text-[13px] text-[#3F3F46] dark:text-[#D6DEEA]" title={team.todos.map((p) => p.nombre).join(", ")}>
              {team.responsable?.nombre ?? team.todos[0].nombre}
            </span>
          </div>
        ) : (
          <span className="text-[13px] text-[#A1A1AA] dark:text-[#64748B]">Sin asignar</span>
        )}
      </td>
      <td className={td}>
        {row.cotizacionFolio === "—" ? (
          <span className="text-[13px] text-[#A1A1AA] dark:text-[#64748B]">—</span>
        ) : (
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={origenChip[row.cotizacionOrigen]}>
              {row.cotizacionOrigen === "digitalflow" ? "DF" : "SICAR"}
            </span>
            <span className="truncate text-[13px] tabular-nums text-[#3F3F46] dark:text-[#D6DEEA]">
              {row.cotizacionesCount > 1
                ? `${row.cotizacionesCount} vinculadas`
                : displayCotizacionFolio(row.cotizacionFolio, row.cotizacionOrigen)}
            </span>
          </div>
        )}
      </td>
      <td className={td}>
        <div className="flex items-center gap-2.5">
          <ProgressBar value={avance} barClass={tone.bar} className="w-20 shrink-0" label={`Avance de ${folio}`} />
          <span className="w-9 text-right text-[13px] font-medium tabular-nums text-[#3F3F46] dark:text-[#D6DEEA]">{avance}%</span>
        </div>
      </td>
      <td className={td}>
        {row.equiposTotal === 0 ? (
          <span className="text-[13px] text-[#A1A1AA] dark:text-[#64748B]">—</span>
        ) : (
          <div className="text-[13px] leading-tight tabular-nums">
            <span className="font-medium text-[#09090B] dark:text-[#F8FAFC]">
              {row.equiposEntregados}/{row.equiposTotal}
            </span>
            <span className="text-[#71717A] dark:text-[#8EA0B8]"> entregados</span>
            <p className="text-[12px] text-[#71717A] dark:text-[#8EA0B8]">{row.equiposInstalados} instalados</p>
          </div>
        )}
      </td>
      <td className={td}>
        <StatusChangedByChip
          name={row.draft.statusChangedByName}
          at={row.draft.statusChangedAt}
          avatarUrl={row.draft.statusChangedByAvatarUrl}
          fallbackName={row.draft.creadoPorName}
          fallbackAt={row.draft.createdAt}
          fallbackAvatarUrl={row.draft.creadoPorAvatarUrl}
        >
          <EstadoPill estado={row.estado} size="sm" />
        </StatusChangedByChip>
      </td>
      <td className={`${td} whitespace-nowrap text-[13px] text-[#52525B] dark:text-[#B7C1D1]`}>
        {formatPeriodoLabel(periodo)}
        {periodo?.diaActual != null && row.estado === "en_proceso" ? (
          <span className="mt-0.5 block text-[11.5px] font-semibold text-[#8A5D0F] dark:text-[#E6A23C]">
            Hoy · día {periodo.diaActual}/{periodo.dias}
          </span>
        ) : null}
      </td>
      <td className={`${td} pr-5`}>
        <div className="flex justify-end opacity-80 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
          <ProyectoRowActions row={row} {...handlers} />
        </div>
      </td>
    </tr>
  );
});

type Props = {
  sections: ProyectoStatusSection[];
  /** Con un estado filtrado no se pintan encabezados de sección. */
  grouped: boolean;
} & ProyectoRowHandlers;

/** Tabla de escritorio agrupada por estado. */
export function ProyectosTable({ sections, grouped, ...handlers }: Props) {
  let index = 0;
  return (
    <div className="overflow-x-auto overflow-y-hidden">
      <table className="w-full min-w-[64rem] table-fixed border-collapse">
        <colgroup>
          <col className="w-[22%]" />
          <col className="w-[14%]" />
          <col className="w-[12%]" />
          <col className="w-[12%]" />
          <col className="w-[11%]" />
          <col className="w-[10%]" />
          <col className="w-[11%]" />
          <col className="w-[172px]" />
        </colgroup>
        <thead className="sticky top-0 z-[1] bg-[#FAFAFA]/95 backdrop-blur-sm dark:bg-[#0F172A]/95">
          <tr>
            <th scope="col" className={`${th} pl-5`}>Proyecto</th>
            <th scope="col" className={th}>Equipo</th>
            <th scope="col" className={th}>Cotización</th>
            <th scope="col" className={th}>Avance</th>
            <th scope="col" className={th}>Equipos</th>
            <th scope="col" className={th}>Estado</th>
            <th scope="col" className={th}>Periodo</th>
            <th scope="col" className={`${th} pr-5 text-right`}>
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        {sections.map((section) => {
          const estado = SECTION_ESTADO[section.key];
          const tone = estado ? ESTADO_TONE[estado] : null;
          const headingId = `proyectos-tabla-${section.key.toLowerCase()}`;
          return (
            <tbody key={section.key} aria-labelledby={grouped ? headingId : undefined}>
              {grouped ? (
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={8}
                    className="border-t border-[#F0F0F2] bg-white px-5 pb-1.5 pt-4 text-left dark:border-[#1F2A3C] dark:bg-[#111827]"
                  >
                    <span id={headingId} className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#52525B] dark:text-[#B7C1D1]">
                      <span className={`size-2 rounded-full ${tone?.dot ?? "bg-[#A1A1AA]"}`} aria-hidden />
                      {section.label}
                      <span className="rounded-full bg-[#F4F4F5] px-1.5 text-[11px] tabular-nums tracking-normal text-[#71717A] dark:bg-white/[0.06] dark:text-[#8EA0B8]">
                        {section.rows.length}
                      </span>
                    </span>
                  </th>
                </tr>
              ) : null}
              {section.rows.map((row) => (
                <ProyectoTableRow key={row.id} row={row} index={index++} {...handlers} />
              ))}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
