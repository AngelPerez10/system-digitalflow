import { memo, type CSSProperties, type SyntheticEvent } from "react";
import { ArrowRight, Camera, CalendarDays, ClipboardList, FolderKanban, ImageOff, Layers } from "lucide-react";
import "@/components/ui/modal-kit/motion.css";
import { btn, btnSm, folioText, focusRing, metaChip } from "../../Proyectos/shared/proyectoTokens";
import type { ReporteMantenimiento } from "../reporteTypes";
import { ReporteRowActions, type ReporteHandlers } from "./ReporteEvidencia";
import { ReporteTecnicosStack } from "./ReporteTecnicosStack";
import { evidenciaDe, folioDe, formatFechaCorta, miniaturaUrl, type SeccionReportes } from "./reporteListUtils";

type Avatars = Map<string, { id: number; url: string }>;

/** La foto aparece con un fundido al terminar de cargar (sin estado de React: solo un atributo). */
function onFotoLista(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.dataset.ok = "";
}

function PortadaLado({ url, lado }: { url: string; lado: "Antes" | "Después" }) {
  const tono = lado === "Antes" ? "bg-[#E6A23C]" : "bg-emerald-500";
  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-[#F0F0F2] dark:bg-[#1B2539]">
      {url ? (
        <img
          src={miniaturaUrl(url)}
          alt=""
          loading="lazy"
          decoding="async"
          width={320}
          height={211}
          onLoad={onFotoLista}
          className="size-full object-cover opacity-0 transition-opacity duration-300 ease-out data-ok:opacity-100 motion-reduce:transition-none"
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-1 text-[#A1A1AA] dark:text-[#64748B]">
          <Camera className="size-4" aria-hidden />
          <span className="text-[11px] font-medium">Sin foto</span>
        </div>
      )}
      <span className="absolute bottom-1.5 left-1.5 inline-flex h-5 items-center gap-1 rounded-full bg-black/55 px-2 text-[10.5px] font-semibold text-white">
        <span className={`size-1.5 rounded-full ${tono}`} aria-hidden />
        {lado}
      </span>
    </div>
  );
}

type CardProps = {
  row: ReporteMantenimiento;
  index: number;
  avatars: Avatars;
  /** Técnico: si el reporte aún no tiene evidencia, la acción principal invita a completarlo. */
  fieldMode: boolean;
} & ReporteHandlers;

const ReporteCard = memo(function ReporteCard({ row, index, avatars, fieldMode, ...handlers }: CardProps) {
  const folio = folioDe(row);
  const ev = evidenciaDe(row);
  const fotos = ev.antes + ev.despues;
  const avance = ev.zonas ? ev.zonasCompletas / ev.zonas : 0;
  const completo = ev.zonas > 0 && ev.zonasCompletas === ev.zonas;
  const OrigenIcon = row.origen_tipo === "proyecto" ? FolderKanban : ClipboardList;
  const continuar = fieldMode && fotos === 0;

  return (
    <li
      className="cot-rise group flex min-w-0 flex-col overflow-hidden rounded-[18px] border border-[#E7E7EA] bg-white shadow-[0_6px_20px_-16px_rgba(9,9,11,0.22)] transition-[transform,box-shadow,border-color] duration-200 ease-out [contain-intrinsic-size:auto_360px] [content-visibility:auto] hover:-translate-y-0.5 hover:border-[#D3D3D8] hover:shadow-[0_14px_32px_-20px_rgba(9,9,11,0.35)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-[#273244] dark:bg-[#111827] dark:hover:border-[#3A4661]"
      style={{ "--cot-i": Math.min(index, 8) } as CSSProperties}
    >
      {fotos > 0 ? (
        <div className="relative grid grid-cols-2 gap-px bg-[#E7E7EA] dark:bg-[#273244]">
          <PortadaLado url={ev.portadaAntes} lado="Antes" />
          <PortadaLado url={ev.portadaDespues} lado="Después" />
          <span className="absolute right-1.5 top-1.5 inline-flex h-5 items-center gap-1 rounded-full bg-black/55 px-2 text-[10.5px] font-semibold tabular-nums text-white">
            <Camera className="size-3" aria-hidden />
            {fotos}
          </span>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-3 p-4">
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
            <span className={`${metaChip} font-mono`} title={row.origen_tipo === "proyecto" ? "Proyecto" : "Orden de trabajo"}>
              <OrigenIcon className="size-3" aria-hidden />
              {row.orden_folio || "Sin origen"}
            </span>
            {ev.zonas > 0 ? (
              <span className={metaChip}>
                <Layers className="size-3" aria-hidden />
                {ev.zonas} {ev.zonas === 1 ? "zona" : "zonas"}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-auto">
          {fotos === 0 ? (
            <div className="flex items-center gap-2 rounded-[12px] border border-dashed border-[#D3D3D8] bg-[#FAFAFA] px-3 py-2.5 text-[12.5px] text-[#6E6E77] dark:border-[#3A4661] dark:bg-[#0F172A]/50 dark:text-[#8EA0B8]">
              <ImageOff className="size-4 shrink-0" aria-hidden />
              {fieldMode ? "Falta capturar las fotos de Antes y Después." : "Sin evidencia fotográfica."}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                <span className="text-[#6E6E77] dark:text-[#8EA0B8]">
                  <span className="font-semibold tabular-nums text-[#8A5D0F] dark:text-[#E6A23C]">{ev.antes}</span> antes ·{" "}
                  <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{ev.despues}</span> después
                </span>
                <span className={`font-semibold tabular-nums ${completo ? "text-emerald-700 dark:text-emerald-300" : "text-[#52525B] dark:text-[#B7C1D1]"}`}>
                  {ev.zonasCompletas}/{ev.zonas} completas
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-[#F0F0F2] dark:bg-[#1B2539]"
                role="progressbar"
                aria-label={`Zonas con Antes y Después en ${folio}`}
                aria-valuemin={0}
                aria-valuemax={ev.zonas}
                aria-valuenow={ev.zonasCompletas}
              >
                <div
                  className={`cot-bar h-full w-full rounded-full ${completo ? "bg-emerald-500" : "bg-[#E6A23C]"}`}
                  style={{ transform: `scaleX(${avance})` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[#F0F0F2] px-4 py-2.5 dark:border-[#1F2A3C]">
        <div className="min-w-0 flex-1">
          <ReporteTecnicosStack value={row.tecnico_nombre} avatars={avatars} />
        </div>
        <div className="flex shrink-0 items-center gap-2 [&_button]:max-sm:size-11">
          <ReporteRowActions row={row} {...handlers} showEdit={false} />
        </div>
        {handlers.canEdit ? (
          <button
            type="button"
            onClick={() => handlers.onEdit(row)}
            className={`${continuar ? btn.primary : btn.secondary} ${btnSm} group/cta shrink-0 max-sm:min-h-11!`}
            aria-label={`${continuar ? "Continuar" : "Abrir"} ${folio}`}
          >
            {continuar ? "Continuar" : "Abrir"}
            <ArrowRight className="transition-transform duration-200 group-hover/cta:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
          </button>
        ) : null}
      </div>
    </li>
  );
});

const gridClass = "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3";

type GridProps = {
  sections: SeccionReportes[];
  /** Con el filtro de evidencia activo hay una sola sección y no se muestra su encabezado. */
  grouped: boolean;
  avatars: Avatars;
  fieldMode: boolean;
} & ReporteHandlers;

/** Tarjetas (móvil, tablet y hasta laptop), agrupadas por evidencia como la tabla de escritorio. */
export function ReportesCardGrid({ sections, grouped, avatars, fieldMode, ...handlers }: GridProps) {
  let i = 0;
  return (
    <div className="space-y-5">
      {sections.map((section) => {
        const headingId = `reportes-cards-${section.key.toLowerCase()}`;
        return (
          <section key={section.key} aria-labelledby={grouped ? headingId : undefined} className="space-y-2.5">
            {grouped ? (
              <div className="flex items-center gap-2 px-1">
                <span className={`size-2 rounded-full ${section.key === "CON" ? "bg-emerald-500" : "bg-[#A1A1AA]"}`} aria-hidden />
                <h3 id={headingId} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]">
                  {section.label}
                </h3>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F4F4F5] px-1.5 text-[11px] font-semibold tabular-nums text-[#52525B] dark:bg-[#1B2539] dark:text-[#B7C1D1]">
                  {section.rows.length}
                </span>
                <span className="h-px flex-1 bg-[#F0F0F2] dark:bg-[#1F2A3C]" aria-hidden />
              </div>
            ) : null}
            <ul className={gridClass}>
              {section.rows.map((row) => (
                <ReporteCard key={row.id} row={row} index={i++} avatars={avatars} fieldMode={fieldMode} {...handlers} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
