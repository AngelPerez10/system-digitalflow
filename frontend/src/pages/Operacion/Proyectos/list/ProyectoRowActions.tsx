import { FileText, Mail, Pencil, Trash2 } from "lucide-react";
import { displayProyectoFolio } from "../shared/proyectoFormUtils";
import { iconBtn, iconBtnDanger } from "../shared/proyectoTokens";
import type { ProyectoRow } from "../shared/proyectoTypes";

export type ProyectoRowHandlers = {
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (row: ProyectoRow) => void;
  onDelete: (row: ProyectoRow) => void;
  onPdf: (row: ProyectoRow) => void;
  onEnviarPdf: (row: ProyectoRow) => void;
  /** Puede marcar/desmarcar "Liquidado" (solo en proyectos cerrados). */
  canLiquidar?: boolean;
  onToggleLiquidado?: (row: ProyectoRow, next: boolean) => void;
};

/** Acciones secundarias de un proyecto (PDF, correo, editar, eliminar). */
export function ProyectoRowActions({
  row,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onPdf,
  onEnviarPdf,
  showEdit = true,
}: { row: ProyectoRow; showEdit?: boolean } & ProyectoRowHandlers) {
  const folio = displayProyectoFolio(row.folio);
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className={iconBtn} onClick={() => onPdf(row)} aria-label={`Ver PDF de ${folio}`} title="Ver PDF">
        <FileText aria-hidden />
      </button>
      <button
        type="button"
        className={iconBtn}
        onClick={() => onEnviarPdf(row)}
        aria-label={`Enviar PDF de ${folio} por correo`}
        title="Enviar por correo"
      >
        <Mail aria-hidden />
      </button>
      {canEdit && showEdit ? (
        <button type="button" className={iconBtn} onClick={() => onEdit(row)} aria-label={`Editar ${folio}`} title="Editar">
          <Pencil aria-hidden />
        </button>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          className={iconBtnDanger}
          onClick={() => onDelete(row)}
          aria-label={`Eliminar ${folio}`}
          title="Eliminar"
        >
          <Trash2 aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
