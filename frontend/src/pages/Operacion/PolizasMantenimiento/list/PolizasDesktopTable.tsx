import { memo } from "react";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  erpRowActionBarClass,
  erpRowActionBtnClass,
  erpTableHeaderClass,
  erpTableRowHoverClass,
  erpTableWrapClass,
  osTableBodyClass,
  osTdCellClass,
  osThCellClass,
} from "../../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import { EstadoPolizaBadge } from "./EstadoPolizaBadge";
import { PolizaPdfGlyph } from "./PolizaPdfGlyph";
import { PolizaStatusSectionHeader } from "./PolizaStatusSectionHeader";
import { formatPolizaFecha, nextVisitIso } from "./polizaDemoData";
import type { PolizaStatusSection } from "./polizaStatusSections";
import type { PolizaRow } from "./polizaListTypes";

type Props = {
  sections: PolizaStatusSection[];
  filteredCount: number;
  hasSearch: boolean;
  loading: boolean;
  canDelete: boolean;
  onEdit: (row: PolizaRow) => void;
  onPdf: (row: PolizaRow) => void;
  onDelete: (row: PolizaRow) => void;
};

const PolizaTableRow = memo(function PolizaTableRow({
  row,
  headingId,
  canDelete,
  onEdit,
  onPdf,
  onDelete,
}: {
  row: PolizaRow;
  headingId: string;
  canDelete: boolean;
  onEdit: (row: PolizaRow) => void;
  onPdf: (row: PolizaRow) => void;
  onDelete: (row: PolizaRow) => void;
}) {
  return (
    <TableRow className={erpTableRowHoverClass} aria-labelledby={headingId}>
      <TableCell className={cn(osTdCellClass, "w-[100px] min-w-[96px] whitespace-nowrap")}>
        <span className="inline-flex items-center justify-center rounded-md border border-[#BBD0FF]/70 bg-[rgba(27,92,255,0.08)] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#1B5CFF] dark:border-[#4B7CFF]/35 dark:bg-[rgba(75,124,255,0.14)] dark:text-[#4B7CFF] sm:text-[11px]">
          {row.folio}
        </span>
      </TableCell>
      <TableCell className={cn(osTdCellClass, "w-[22%] min-w-[160px]")}>
        <span className="block truncate font-medium text-[#09090B] dark:text-white" title={row.cliente}>
          {row.cliente}
        </span>
      </TableCell>
      <TableCell className={cn(osTdCellClass, "w-[16%] min-w-[140px]")}>
        <span className="block truncate text-[#52525B] dark:text-[#B7C1D1]" title={row.tipoLabel}>
          {row.tipoLabel}
        </span>
      </TableCell>
      <TableCell
        className={cn(
          osTdCellClass,
          "w-[110px] min-w-[100px] whitespace-nowrap tabular-nums text-[#52525B] dark:text-[#B7C1D1]"
        )}
      >
        {row.cotizacionFolio}
      </TableCell>
      <TableCell
        className={cn(
          osTdCellClass,
          "w-[120px] min-w-[110px] whitespace-nowrap tabular-nums text-[#52525B] dark:text-[#B7C1D1]"
        )}
      >
        {formatPolizaFecha(nextVisitIso(row))}
      </TableCell>
      <TableCell className={cn(osTdCellClass, "w-[148px] min-w-[140px] text-center")}>
        <div className="flex justify-center">
          <EstadoPolizaBadge estado={row.estado} />
        </div>
      </TableCell>
      <TableCell className={cn(osTdCellClass, "w-[148px] min-w-[140px] text-center")}>
        <div className={cn(erpRowActionBarClass, "mx-auto")}>
          <button
            type="button"
            className={erpRowActionBtnClass}
            onClick={() => onEdit(row)}
            aria-label={`Ver póliza ${row.folio}`}
            title="Ver póliza"
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={erpRowActionBtnClass}
            onClick={() => onPdf(row)}
            aria-label={`Ver PDF de la póliza ${row.folio}`}
            title="Ver PDF"
          >
            <PolizaPdfGlyph className="h-3.5 w-3.5" />
          </button>
          {canDelete ? (
            <button
              type="button"
              className={cn(
                erpRowActionBtnClass,
                "hover:border-rose-400 hover:text-rose-600 dark:hover:border-rose-500/60 dark:hover:text-rose-400"
              )}
              onClick={() => onDelete(row)}
              aria-label={`Eliminar póliza ${row.folio}`}
              title="Eliminar"
            >
              <TrashBinIcon className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
});

export const PolizasDesktopTable = memo(function PolizasDesktopTable({
  sections,
  filteredCount,
  hasSearch,
  loading,
  canDelete,
  onEdit,
  onPdf,
  onDelete,
}: Props) {
  return (
    <div className={erpTableWrapClass}>
      <Table className="w-full min-w-[1020px] table-fixed border-collapse">
        <TableHeader className={`${erpTableHeaderClass} sticky top-0 z-10`}>
          <TableRow>
            <TableCell isHeader scope="col" className={cn(osThCellClass, "w-[100px] min-w-[96px] whitespace-nowrap")}>
              Folio
            </TableCell>
            <TableCell isHeader scope="col" className={cn(osThCellClass, "w-[22%] min-w-[160px]")}>
              Cliente
            </TableCell>
            <TableCell isHeader scope="col" className={cn(osThCellClass, "w-[16%] min-w-[140px]")}>
              Tipo
            </TableCell>
            <TableCell isHeader scope="col" className={cn(osThCellClass, "w-[110px] min-w-[100px] whitespace-nowrap")}>
              Cotización
            </TableCell>
            <TableCell isHeader scope="col" className={cn(osThCellClass, "w-[120px] min-w-[110px] whitespace-nowrap")}>
              Próxima visita
            </TableCell>
            <TableCell isHeader scope="col" className={cn(osThCellClass, "w-[148px] min-w-[140px] whitespace-nowrap text-center")}>
              Estado
            </TableCell>
            <TableCell isHeader scope="col" className={cn(osThCellClass, "w-[148px] min-w-[140px] whitespace-nowrap text-center")}>
              Acciones
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody className={osTableBodyClass}>
          {filteredCount === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className={cn(osTdCellClass, "py-10")}>
                <div
                  className="text-center text-sm text-[#6E6E77] dark:text-[#8EA0B8]"
                  role="status"
                  aria-busy={loading && !hasSearch}
                >
                  {hasSearch
                    ? "No hay pólizas que coincidan con la búsqueda."
                    : loading
                      ? "Cargando pólizas…"
                      : "Aún no hay pólizas registradas."}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            sections.flatMap((section) => {
              const headingId = `polizas-table-${section.key}`;
              return [
                <TableRow key={`${section.key}-header`} className="hover:bg-transparent dark:hover:bg-transparent">
                  <TableCell isHeader scope="colgroup" colSpan={7} className="border-y-0 bg-transparent p-0 text-left">
                    <div className="px-3 py-2">
                      <PolizaStatusSectionHeader
                        estado={section.key}
                        label={section.label}
                        count={section.rows.length}
                        headingId={headingId}
                      />
                    </div>
                  </TableCell>
                </TableRow>,
                ...section.rows.map((row) => (
                  <PolizaTableRow
                    key={row.id}
                    row={row}
                    headingId={headingId}
                    canDelete={canDelete}
                    onEdit={onEdit}
                    onPdf={onPdf}
                    onDelete={onDelete}
                  />
                )),
              ];
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
});
