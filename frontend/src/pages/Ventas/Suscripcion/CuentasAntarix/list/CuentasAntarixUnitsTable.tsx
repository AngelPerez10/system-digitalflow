import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import {
  caaEmptyCellClass,
  caaStatusBadgeClass,
  caaTableBodyClass,
  caaTdCellClass,
  caaThCellClass,
  erpRowActionBarClass,
  erpRowActionBtnClass,
  erpSansStyle,
  erpTableHeaderClass,
  erpTableRowHoverClass,
  erpTableWrapClass,
} from "../shared/cuentasAntarixStyles";
import { cn } from "@/lib/utils";
import type { WialonUnitSearchEntry } from "../shared/wialonTypes";

function ownersLabel(entry: WialonUnitSearchEntry): string {
  if (!entry.users?.length) return "Sin cuenta";
  return entry.users
    .map((u) => u.name || u.user_id || `ID ${u.wialon_id}`)
    .filter(Boolean)
    .join(" · ");
}

function unitStatusLabel(entry: WialonUnitSearchEntry): string {
  if (entry.status === "Activo" || entry.status === "Inactivo") return entry.status;
  if (entry.is_active === true) return "Activo";
  if (entry.is_active === false) return "Inactivo";
  return entry.status?.trim() || "—";
}

function UnitStatusBadge({ entry }: { entry: WialonUnitSearchEntry }) {
  const status = unitStatusLabel(entry);
  const kind = status === "Activo" ? "ok" : status === "Inactivo" ? "bad" : "neutral";
  return <span className={caaStatusBadgeClass(kind)}>{status}</span>;
}

type Props = {
  rows: WialonUnitSearchEntry[];
  canEdit?: boolean;
  onOpen: (entry: WialonUnitSearchEntry) => void;
};

export default function CuentasAntarixUnitsTable({ rows, canEdit = true, onOpen }: Props) {
  return (
    <div className="min-w-0" style={erpSansStyle}>
      <div className={erpTableWrapClass}>
        <Table className="w-full min-w-[960px] lg:min-w-full">
          <TableHeader className={erpTableHeaderClass}>
            <TableRow>
              <TableCell isHeader className={cn(caaThCellClass, "min-w-[220px]")}>
                Unidad
              </TableCell>
              <TableCell isHeader className={cn(caaThCellClass, "w-[104px] text-center")}>
                Estado
              </TableCell>
              <TableCell isHeader className={cn(caaThCellClass, "w-[170px]")}>
                UID / IMEI
              </TableCell>
              <TableCell isHeader className={cn(caaThCellClass, "w-[130px]")}>
                Teléfono
              </TableCell>
              <TableCell isHeader className={cn(caaThCellClass, "min-w-[200px]")}>
                Cuentas
              </TableCell>
              <TableCell isHeader className={cn(caaThCellClass, "min-w-[160px]")}>
                Campos
              </TableCell>
              <TableCell isHeader className={cn(caaThCellClass, "w-[90px] text-center")}>
                Acción
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className={caaTableBodyClass}>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-3 py-8 text-center text-[#6E6E77] dark:text-[#8EA0B8]">
                  Sin unidades
                </TableCell>
              </TableRow>
            ) : (
              rows.map((entry) => {
                const owners = ownersLabel(entry);
                return (
                  <TableRow key={entry.unit_id} className={erpTableRowHoverClass}>
                    <TableCell className={cn(caaTdCellClass, "min-w-[220px] max-w-[320px]")}>
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => onOpen(entry)}
                          className="block max-w-full truncate text-left font-medium text-[#09090B] transition-colors hover:text-[#1B5CFF] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:text-[#F8FAFC] dark:hover:text-[#4B7CFF]"
                          title={entry.name || "Sin nombre"}
                        >
                          {entry.name || "Sin nombre"}
                        </button>
                      ) : (
                        <span className="block truncate font-medium text-[#09090B] dark:text-[#F8FAFC]" title={entry.name || "Sin nombre"}>
                          {entry.name || "Sin nombre"}
                        </span>
                      )}
                      <span className="mt-0.5 block truncate font-mono text-[11px] tabular-nums text-[#1B5CFF] dark:text-[#4B7CFF]">
                        ID {entry.unit_id}
                      </span>
                    </TableCell>

                    <TableCell className={cn(caaTdCellClass, "w-[104px] text-center")}>
                      <UnitStatusBadge entry={entry} />
                    </TableCell>

                    <TableCell className={cn(caaTdCellClass, "w-[170px]")}>
                      <span className="block max-w-[170px] truncate font-mono text-[12px] tabular-nums text-[#52525B] dark:text-[#B7C1D1]">
                        {entry.uid?.trim() ? entry.uid : <span className={caaEmptyCellClass}>—</span>}
                      </span>
                    </TableCell>

                    <TableCell className={cn(caaTdCellClass, "w-[130px] font-mono text-[12px] tabular-nums")}>
                      {entry.phone?.trim() ? entry.phone : <span className={caaEmptyCellClass}>—</span>}
                    </TableCell>

                    <TableCell className={cn(caaTdCellClass, "min-w-[200px] max-w-[280px]")}>
                      <span className="block line-clamp-2 leading-snug" title={owners}>
                        {owners}
                      </span>
                    </TableCell>

                    <TableCell className={cn(caaTdCellClass, "min-w-[160px] max-w-[240px]")}>
                      <span
                        className="block line-clamp-2 leading-snug text-[#6E6E77] dark:text-[#8EA0B8]"
                        title={entry.custom_fields || undefined}
                      >
                        {entry.custom_fields?.trim() ? entry.custom_fields : <span className={caaEmptyCellClass}>—</span>}
                      </span>
                    </TableCell>

                    <TableCell className={cn(caaTdCellClass, "w-[90px] text-center")}>
                      {canEdit ? (
                        <div className={cn(erpRowActionBarClass, "mx-auto w-fit")}>
                          <button
                            type="button"
                            onClick={() => onOpen(entry)}
                            className={erpRowActionBtnClass}
                            title="Abrir unidad"
                            aria-label={`Abrir unidad ${entry.name || entry.uid || entry.unit_id}`}
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <span className={caaEmptyCellClass}>—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
