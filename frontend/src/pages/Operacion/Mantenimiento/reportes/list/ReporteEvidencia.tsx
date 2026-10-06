import { Camera, FileText, ImageOff, Pencil, Trash2 } from "lucide-react";
import { iconBtn, iconBtnDanger, metaChip } from "../../../Proyectos/shared/proyectoTokens";
import type { ReporteMantenimiento } from "../reporteTypes";
import { folioDe } from "./reporteListUtils";

/** Zonas y fotos Antes / Después de un reporte; «Sin evidencia» si no hay ninguna. */
export function ReporteEvidencia({ row }: { row: ReporteMantenimiento }) {
  const antes = row.secciones.reduce((n, s) => n + s.fotos_antes.length, 0);
  const despues = row.secciones.reduce((n, s) => n + s.fotos_despues.length, 0);
  if (antes + despues === 0) {
    return (
      <span className={`${metaChip} gap-1.5`}>
        <ImageOff className="size-3.5" aria-hidden />
        Sin evidencia
      </span>
    );
  }
  const zonas = row.secciones.length;
  return (
    <div className="flex flex-wrap items-center gap-1.5" title={`${zonas} ${zonas === 1 ? "zona" : "zonas"} · ${antes} fotos antes · ${despues} fotos después`}>
      <span className="inline-flex h-6 items-center gap-1 rounded-full bg-[rgba(230,162,60,0.16)] px-2.5 text-[12px] font-semibold tabular-nums text-[#8A5D0F] dark:text-[#E6A23C]">
        <Camera className="size-3" aria-hidden />
        Antes {antes}
      </span>
      <span className="inline-flex h-6 items-center gap-1 rounded-full bg-emerald-500/14 px-2.5 text-[12px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
        <Camera className="size-3" aria-hidden />
        Después {despues}
      </span>
      <span className="text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
        {zonas} {zonas === 1 ? "zona" : "zonas"}
      </span>
    </div>
  );
}

export type ReporteHandlers = {
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (row: ReporteMantenimiento) => void;
  onDelete: (row: ReporteMantenimiento) => void;
  onPdf: (row: ReporteMantenimiento) => void;
};

/** Acciones de un reporte (PDF, editar, eliminar) con los mismos botones que Proyectos. */
export function ReporteRowActions({ row, canEdit, canDelete, onEdit, onDelete, onPdf, showEdit = true }: { row: ReporteMantenimiento; showEdit?: boolean } & ReporteHandlers) {
  const folio = folioDe(row);
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className={iconBtn} onClick={() => onPdf(row)} aria-label={`Ver PDF de ${folio}`} title="Ver PDF">
        <FileText aria-hidden />
      </button>
      {canEdit && showEdit ? (
        <button type="button" className={iconBtn} onClick={() => onEdit(row)} aria-label={`Editar ${folio}`} title="Editar">
          <Pencil aria-hidden />
        </button>
      ) : null}
      {canDelete ? (
        <button type="button" className={iconBtnDanger} onClick={() => onDelete(row)} aria-label={`Eliminar ${folio}`} title="Eliminar">
          <Trash2 aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
