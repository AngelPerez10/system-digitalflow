import { memo, type CSSProperties } from "react";
import { ArrowRight, CalendarDays, Package } from "lucide-react";
import { StatusChangedByChip } from "../../shared/StatusChangedByChip";
import { displayCotizacionFolio, displayProyectoFolio } from "../shared/proyectoFormUtils";
import {
  formatPeriodoLabel,
  proyectoPeriodo,
  proyectoTeam,
  proyectoTiposLabels,
} from "../shared/proyectoListUtils";
import { AvatarStack, EstadoPill, ProgressBar } from "../shared/ProyectoUi";
import { btn, btnSm, focusRing, folioText, metaChip, origenChip, toneForEstado } from "../shared/proyectoTokens";
import type { ProyectoRow } from "../shared/proyectoTypes";
import { ProyectoRowActions, type ProyectoRowHandlers } from "./ProyectoRowActions";

type Props = {
  row: ProyectoRow;
  index: number;
  /** Técnico: la acción principal invita a continuar el trabajo de campo. */
  fieldMode: boolean;
} & ProyectoRowHandlers;

function ProyectoCardImpl({ row, index, fieldMode, ...handlers }: Props) {
  const { canEdit, onEdit } = handlers;
  const tone = toneForEstado(row.estado);
  const team = proyectoTeam(row);
  const periodo = proyectoPeriodo(row);
  const tipos = proyectoTiposLabels(row);
  const avance = Math.round(Number(row.draft?.porcentajeAvance) || 0);
  const folio = displayProyectoFolio(row.folio);
  const activo = row.estado === "en_proceso";
  const hoy = activo && periodo?.diaActual != null;

  return (
    <li
      className="cot-rise group flex min-w-0 flex-col rounded-[18px] border border-[#E7E7EA] bg-white transition-[transform,box-shadow,border-color] duration-200 ease-out [contain-intrinsic-size:auto_260px] [content-visibility:auto] hover:-translate-y-0.5 hover:border-[#D3D3D8] hover:shadow-[0_14px_32px_-20px_rgba(9,9,11,0.35)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-[#273244] dark:bg-[#111827] dark:hover:border-[#3A4661]"
      style={{ "--cot-i": Math.min(index, 8) } as CSSProperties}
    >
      <div className="flex flex-1 flex-col gap-3.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className={folioText}>{folio}</span>
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
        </div>

        <div className="min-w-0">
          {canEdit ? (
            <button
              type="button"
              onClick={() => onEdit(row)}
              className={`line-clamp-2 rounded-[6px] text-left text-[16px] font-semibold leading-snug tracking-[-0.3px] text-[#09090B] hover:text-[#1244D1] dark:text-[#F8FAFC] dark:hover:text-[#9BB6FF] ${focusRing}`}
            >
              {row.cliente || "Sin cliente"}
            </button>
          ) : (
            <h3 className="line-clamp-2 text-[16px] font-semibold leading-snug tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">
              {row.cliente || "Sin cliente"}
            </h3>
          )}
          {tipos.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tipos.slice(0, 2).map((t) => (
                <span key={t} className={`${metaChip} max-w-[12rem] truncate`}>
                  {t}
                </span>
              ))}
              {tipos.length > 2 ? <span className={metaChip}>+{tipos.length - 2}</span> : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-[#6E6E77] dark:text-[#8EA0B8]">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden />
            {formatPeriodoLabel(periodo)}
          </span>
          {hoy ? (
            <span className="inline-flex h-5 items-center gap-1 rounded-full bg-[rgba(230,162,60,0.16)] px-2 text-[11px] font-semibold text-[#8A5D0F] dark:text-[#E6A23C]">
              <span className="size-1.5 rounded-full bg-current motion-safe:animate-pulse" aria-hidden />
              Hoy · día {periodo?.diaActual} de {periodo?.dias}
            </span>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-[12.5px]">
            <span className="text-[#6E6E77] dark:text-[#8EA0B8]">Avance</span>
            <span className={`font-semibold tabular-nums ${tone.text}`}>{avance}%</span>
          </div>
          <ProgressBar value={avance} barClass={tone.bar} label={`Avance de ${folio}`} />
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-[#52525B] dark:text-[#B7C1D1]">
          {row.equiposTotal > 0 ? (
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Package className="size-3.5 text-[#A1A1AA]" aria-hidden />
              {row.equiposEntregados}/{row.equiposTotal} entregados · {row.equiposInstalados} instalados
            </span>
          ) : null}
          {row.cotizacionFolio !== "—" ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span className={origenChip[row.cotizacionOrigen]}>
                {row.cotizacionOrigen === "digitalflow" ? "DF" : "SICAR"}
              </span>
              <span className="truncate tabular-nums">
                {row.cotizacionesCount > 1
                  ? `${row.cotizacionesCount} cotizaciones`
                  : displayCotizacionFolio(row.cotizacionFolio, row.cotizacionOrigen)}
              </span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[#F0F0F2] px-4 py-2.5 dark:border-[#1F2A3C]">
        {team.todos.length ? (
          <AvatarStack people={team.todos} max={4} />
        ) : (
          <span className="whitespace-nowrap text-[12px] text-[#A1A1AA] dark:text-[#64748B]">Sin equipo</span>
        )}
        <div className="flex items-center gap-1.5">
          <ProyectoRowActions row={row} {...handlers} showEdit={false} />
          {canEdit ? (
            <button
              type="button"
              onClick={() => onEdit(row)}
              className={`${fieldMode && activo ? btn.primary : btn.secondary} ${btnSm} group/cta`}
              aria-label={`${fieldMode && activo ? "Continuar" : "Abrir"} ${folio}`}
            >
              {fieldMode && activo ? "Continuar" : "Abrir"}
              <ArrowRight
                className="transition-transform duration-200 group-hover/cta:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden
              />
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export const ProyectoCard = memo(ProyectoCardImpl);
