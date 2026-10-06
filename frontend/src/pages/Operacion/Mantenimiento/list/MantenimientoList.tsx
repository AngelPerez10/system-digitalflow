/**
 * Listado único de Mantenimiento: pólizas y reportes mezclados.
 * Tabla en escritorio (≥1024 px) y tarjetas en pantallas menores (solo se monta
 * una). Cada fila lleva una etiqueta de tipo con su ícono y las acciones de su
 * propio módulo (PDF / editar / eliminar, según permisos).
 */
import { memo, type CSSProperties } from "react";
import { Camera, FileText, ImageOff, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import "@/components/ui/modal-kit/motion.css";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { focusRing, folioText, iconBtn, iconBtnDanger } from "../../Proyectos/shared/proyectoTokens";
import EstadoPolizaBadge from "../polizas/list/EstadoPolizaBadge";
import PolizaVisitasTrack from "../polizas/list/PolizaVisitasTrack";
import type { PolizaRow } from "../polizas/list/polizaListTypes";
import { ReporteEvidencia, ReporteRowActions, type ReporteHandlers } from "../reportes/list/ReporteEvidencia";
import { ReporteTecnicosStack } from "../reportes/list/ReporteTecnicosStack";
import { formatFechaCorta, tieneEvidencia } from "../reportes/list/reporteListUtils";
import { countReporteFotos, type ReporteMantenimiento } from "../reportes/reporteTypes";
import type { MantenimientoItem, MantenimientoTipo } from "../shared/mantenimientoItems";

export type PolizaHandlers = {
  onPdf: (row: PolizaRow) => void;
  /** Sin permiso no se pasa y el botón se oculta. */
  onEdit?: (row: PolizaRow) => void;
  onDelete?: (row: PolizaRow) => void;
};

type Avatars = Map<string, { id: number; url: string }>;

type Props = {
  items: MantenimientoItem[];
  poliza: PolizaHandlers;
  reporte: ReporteHandlers;
  avatars: Avatars;
};

const stagger = (i: number) => ({ "--cot-i": Math.min(i, 10) }) as CSSProperties;

const TIPO: Record<MantenimientoTipo, { label: string; icon: typeof ShieldCheck; chip: string }> = {
  poliza: {
    label: "Póliza",
    icon: ShieldCheck,
    chip: "bg-[#EEF3FF] text-[#1244D1] ring-[#D7E3FF] dark:bg-[#1B2A63]/60 dark:text-[#C9D7FF] dark:ring-[#2C3F7A]",
  },
  reporte: {
    label: "Reporte",
    icon: FileText,
    chip: "bg-[#E9F8F3] text-[#0B6B5C] ring-[#BFE9DD] dark:bg-[rgba(45,212,191,0.12)] dark:text-[#5EEAD4] dark:ring-[rgba(45,212,191,0.28)]",
  },
};

export function TipoBadge({ kind }: { kind: MantenimientoTipo }) {
  const t = TIPO[kind];
  const Icon = t.icon;
  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold ring-1 ring-inset ${t.chip}`}>
      <Icon className="size-3.5" aria-hidden />
      {t.label}
    </span>
  );
}

function PolizaActions({ row, onPdf, onEdit, onDelete }: PolizaHandlers & { row: PolizaRow }) {
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className={iconBtn} onClick={() => onPdf(row)} aria-label={`Ver PDF de ${row.folio}`} title="Ver PDF">
        <FileText aria-hidden />
      </button>
      {onEdit ? (
        <button type="button" className={iconBtn} onClick={() => onEdit(row)} aria-label={`Editar ${row.folio}`} title="Editar">
          <Pencil aria-hidden />
        </button>
      ) : null}
      {onDelete ? (
        <button type="button" className={iconBtnDanger} onClick={() => onDelete(row)} aria-label={`Eliminar ${row.folio}`} title="Eliminar">
          <Trash2 aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

/** Cliente: si se puede editar, el nombre abre el registro. */
function ClienteLink({ cliente, onOpen }: { cliente: string; onOpen?: () => void }) {
  const texto = cliente || "Sin cliente";
  return onOpen ? (
    <button
      type="button"
      onClick={onOpen}
      className={`block max-w-full truncate rounded-lg text-left text-[14px] font-medium text-[#09090B] hover:text-[#1244D1] dark:text-[#F8FAFC] dark:hover:text-[#9BB6FF] ${focusRing}`}
      title={texto}
    >
      {texto}
    </button>
  ) : (
    <p className="truncate text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC]" title={texto}>
      {texto}
    </p>
  );
}

/** Estado de un reporte en la tabla: con o sin evidencia fotográfica. */
function EvidenciaBadge({ row }: { row: ReporteMantenimiento }) {
  const con = tieneEvidencia(row);
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-semibold ${
        con ? "bg-emerald-500/14 text-emerald-700 dark:text-emerald-300" : "bg-[rgba(230,162,60,0.16)] text-[#8A5D0F] dark:text-[#E6A23C]"
      }`}
    >
      {con ? <Camera className="size-3.5" aria-hidden /> : <ImageOff className="size-3.5" aria-hidden />}
      {con ? "Con evidencia" : "Sin evidencia"}
    </span>
  );
}

const th = "px-3 py-2.5 text-left text-[12px] font-medium text-[#71717A] dark:text-[#8EA0B8]";
const td = "px-3 py-3 align-middle";

function MantenimientoList({ items, poliza, reporte, avatars }: Props) {
  const desktop = useMediaQuery("(min-width: 1024px)");

  if (!desktop) {
    return (
      <ul className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4">
        {items.map((it, i) => (
          <li
            key={it.key}
            className="cot-rise flex flex-col rounded-[16px] border border-[#E7E7EA] bg-white p-4 dark:border-[#273244] dark:bg-[#111827]"
            style={stagger(i)}
          >
            <div className="flex items-center justify-between gap-2">
              <TipoBadge kind={it.kind} />
              <span className="text-[12.5px] tabular-nums text-[#6E6E77] dark:text-[#8EA0B8]">{it.fecha ? formatFechaCorta(it.fecha) : "—"}</span>
            </div>
            <p className={`${folioText} mt-3`}>{it.folio}</p>
            <div className="mt-0.5">
              <ClienteLink
                cliente={it.cliente}
                onOpen={it.kind === "poliza" ? (poliza.onEdit ? () => poliza.onEdit?.(it.row) : undefined) : reporte.canEdit ? () => reporte.onEdit(it.row) : undefined}
              />
            </div>
            {it.kind === "poliza" ? (
              <>
                <p className="mt-1 line-clamp-1 text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">
                  {[it.row.servicioTipo || it.row.tipoLabel, it.row.equiposAtendidos].filter(Boolean).join(" · ")}
                </p>
                <div className="mt-3 rounded-[12px] bg-[#FAFAFA] px-3 py-2.5 dark:bg-[#1B2539]">
                  <PolizaVisitasTrack visitas={it.row.visitas} />
                </div>
              </>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                <ReporteTecnicosStack value={it.row.tecnico_nombre} avatars={avatars} />
                <ReporteEvidencia row={it.row} />
              </div>
            )}
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#F0F0F2] pt-3 dark:border-[#1F2A3C]">
              {it.kind === "poliza" ? <EstadoPolizaBadge estado={it.row.estado} /> : <span className="truncate font-mono text-[12px] text-[#71717A] dark:text-[#8EA0B8]">{it.row.orden_folio || "Sin origen"}</span>}
              {it.kind === "poliza" ? <PolizaActions row={it.row} {...poliza} /> : <ReporteRowActions row={it.row} {...reporte} />}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="overflow-x-auto overflow-y-hidden">
      <table className="w-full min-w-3xl table-fixed border-collapse">
        <colgroup>
          <col className="w-28" />
          <col className="w-[27%]" />
          <col />
          <col className="w-28" />
          <col className="w-36" />
          <col className="w-36" />
        </colgroup>
        <thead className="sticky top-0 z-1 bg-[#FAFAFA]/95 backdrop-blur-sm dark:bg-[#0F172A]/95">
          <tr>
            <th scope="col" className={`${th} pl-5`}>Tipo</th>
            <th scope="col" className={th}>Folio y cliente</th>
            <th scope="col" className={th}>Detalle</th>
            <th scope="col" className={th}>Fecha</th>
            <th scope="col" className={th}>Estado</th>
            <th scope="col" className={`${th} pr-5 text-right`}>
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr
              key={it.key}
              className="cot-rise group border-t border-[#F0F0F2] transition-colors duration-150 hover:bg-[#FAFAFB] dark:border-[#1F2A3C] dark:hover:bg-white/2"
              style={stagger(i)}
            >
              <td className={`${td} pl-5`}>
                <TipoBadge kind={it.kind} />
              </td>
              <td className={td}>
                <span className={folioText}>{it.folio}</span>
                <div className="mt-0.5">
                  <ClienteLink
                    cliente={it.cliente}
                    onOpen={it.kind === "poliza" ? (poliza.onEdit ? () => poliza.onEdit?.(it.row) : undefined) : reporte.canEdit ? () => reporte.onEdit(it.row) : undefined}
                  />
                </div>
                <p className="mt-0.5 truncate font-mono text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
                  {it.kind === "poliza" ? it.row.cotizacionFolio : it.row.orden_folio || "Sin origen"}
                </p>
              </td>
              <td className={td}>
                {it.kind === "poliza" ? (
                  <div className="min-w-0 space-y-1.5">
                    <p className="truncate text-[13px] text-[#3F3F46] dark:text-[#CBD5E1]" title={it.row.servicioTipo || it.row.tipoLabel}>
                      {it.row.servicioTipo || it.row.tipoLabel}
                    </p>
                    <PolizaVisitasTrack visitas={it.row.visitas} />
                  </div>
                ) : (
                  <div className="flex min-w-0 flex-col gap-1">
                    <ReporteTecnicosStack value={it.row.tecnico_nombre} avatars={avatars} />
                    <p className="truncate text-[12px] tabular-nums text-[#71717A] dark:text-[#8EA0B8]">
                      {countReporteFotos(it.row.secciones)} fotos · {it.row.secciones.length} {it.row.secciones.length === 1 ? "zona" : "zonas"}
                    </p>
                  </div>
                )}
              </td>
              <td className={`${td} whitespace-nowrap text-[13px] tabular-nums text-[#52525B] dark:text-[#B7C1D1]`}>
                {it.fecha ? formatFechaCorta(it.fecha) : "—"}
                <span className="block text-[11.5px] text-[#A1A1AA] dark:text-[#64748B]">{it.kind === "poliza" ? "Visita" : "Servicio"}</span>
              </td>
              <td className={td}>
                {it.kind === "poliza" ? <EstadoPolizaBadge estado={it.row.estado} /> : <EvidenciaBadge row={it.row} />}
              </td>
              <td className={`${td} pr-5`}>
                <div className="flex justify-end opacity-80 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
                  {it.kind === "poliza" ? <PolizaActions row={it.row} {...poliza} /> : <ReporteRowActions row={it.row} {...reporte} />}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(MantenimientoList);
