import { memo, type CSSProperties } from "react";
import { ArrowRight, CalendarDays, Layers } from "lucide-react";
import "@/components/ui/modal-kit/motion.css";
import { btn, btnSm, focusRing, folioText, metaChip } from "../../Proyectos/shared/proyectoTokens";
import { AvatarStack } from "../../Proyectos/shared/ProyectoUi";
import { splitTecnicos } from "../reporteTecnicos";
import type { ReporteMantenimiento } from "../reporteTypes";
import { ReporteEvidencia, ReporteRowActions, type ReporteHandlers } from "./ReporteEvidencia";
import { folioDe, formatFechaCorta } from "./reporteListUtils";

type Avatars = Map<string, { id: number; url: string }>;

type CardProps = { row: ReporteMantenimiento; index: number; avatars: Avatars } & ReporteHandlers;

const ReporteCardImpl = memo(function ReporteCard({ row, index, avatars, ...handlers }: CardProps) {
  const folio = folioDe(row);
  const nombres = splitTecnicos(row.tecnico_nombre);
  const people = nombres.map((n, i) => {
    const a = avatars.get(n.toLowerCase());
    return { id: a?.id ?? -(i + 1), nombre: n, avatar_url: a?.url };
  });
  return (
    <li
      className="cot-rise group flex min-w-0 flex-col rounded-[18px] border border-[#E7E7EA] bg-white transition-[transform,box-shadow,border-color] duration-200 ease-out [contain-intrinsic-size:auto_240px] [content-visibility:auto] hover:-translate-y-0.5 hover:border-[#D3D3D8] hover:shadow-[0_14px_32px_-20px_rgba(9,9,11,0.35)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-[#273244] dark:bg-[#111827] dark:hover:border-[#3A4661]"
      style={{ "--cot-i": Math.min(index, 8) } as CSSProperties}
    >
      <div className="flex flex-1 flex-col gap-3.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className={folioText}>{folio}</span>
          <span className="inline-flex items-center gap-1.5 text-[12.5px] tabular-nums text-[#6E6E77] dark:text-[#8EA0B8]">
            <CalendarDays className="size-3.5" aria-hidden />
            {formatFechaCorta(row.fecha_servicio)}
          </span>
        </div>

        <div className="min-w-0">
          {handlers.canEdit ? (
            <button
              type="button"
              onClick={() => handlers.onEdit(row)}
              className={`line-clamp-2 rounded-[6px] text-left text-[16px] font-semibold leading-snug tracking-[-0.3px] text-[#09090B] hover:text-[#1244D1] dark:text-[#F8FAFC] dark:hover:text-[#9BB6FF] ${focusRing}`}
            >
              {row.orden_cliente || "Sin cliente"}
            </button>
          ) : (
            <h3 className="line-clamp-2 text-[16px] font-semibold leading-snug tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">{row.orden_cliente || "Sin cliente"}</h3>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={`${metaChip} font-mono`}>{row.orden_folio || "Sin origen"}</span>
            {row.secciones.length > 0 ? (
              <span className={metaChip}>
                <Layers className="size-3" aria-hidden />
                {row.secciones.length} {row.secciones.length === 1 ? "zona" : "zonas"}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-auto">
          <ReporteEvidencia row={row} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[#F0F0F2] px-4 py-2.5 dark:border-[#1F2A3C]">
        {people.length ? <AvatarStack people={people} max={4} /> : <span className="whitespace-nowrap text-[12px] text-[#A1A1AA] dark:text-[#64748B]">Sin técnico</span>}
        <div className="flex items-center gap-1.5">
          <ReporteRowActions row={row} {...handlers} showEdit={false} />
          {handlers.canEdit ? (
            <button type="button" onClick={() => handlers.onEdit(row)} className={`${btn.secondary} ${btnSm} group/cta`} aria-label={`Abrir ${folio}`}>
              Abrir
              <ArrowRight className="transition-transform duration-200 group-hover/cta:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
});

type GridProps = { rows: ReporteMantenimiento[]; avatars: Avatars } & ReporteHandlers;

/** Tarjetas (móvil, tablet y hasta laptop): una columna → dos → tres, como en Proyectos. */
export function ReportesCardGrid({ rows, avatars, ...handlers }: GridProps) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row, i) => (
        <ReporteCardImpl key={row.id} row={row} index={i} avatars={avatars} {...handlers} />
      ))}
    </ul>
  );
}
