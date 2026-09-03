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
import type { WialonUserRow } from "../shared/wialonTypes";

function blockedLabel(row: WialonUserRow): string {
  return row.status === "Bloqueado" && row.blocked !== "No" ? row.blocked : "No";
}

function StatusBadge({ status }: { status: string }) {
  const s = String(status || "").trim();
  const kind = s === "Activo" ? "ok" : s === "Bloqueado" || s === "Inactivo" ? "bad" : "neutral";
  return <span className={caaStatusBadgeClass(kind)}>{s || "—"}</span>;
}

type Props = {
  rows: WialonUserRow[];
  canEdit?: boolean;
  matchedUnitsByUser?: Map<number, string[]>;
  onEdit: (row: WialonUserRow) => void;
};

export default function CuentasAntarixUsersTable({
  rows,
  canEdit = true,
  matchedUnitsByUser,
  onEdit,
}: Props) {
  return (
    <div className="min-w-0" style={erpSansStyle}>
      <div className={erpTableWrapClass}>
        <Table className="w-full min-w-[900px] lg:min-w-full">
          <TableHeader className={erpTableHeaderClass}>
            <TableRow>
              <TableCell isHeader className={cn(caaThCellClass, "min-w-[220px]")}>
                Cuenta
              </TableCell>
              <TableCell isHeader className={cn(caaThCellClass, "w-[160px]")}>
                Cuenta padre
              </TableCell>
              <TableCell isHeader className={cn(caaThCellClass, "w-[120px] text-center")}>
                Distribuidor
              </TableCell>
              <TableCell isHeader className={cn(caaThCellClass, "w-[96px] text-center")}>
                Unidades
              </TableCell>
              <TableCell isHeader className={cn(caaThCellClass, "w-[110px] text-center")}>
                Estado
              </TableCell>
              <TableCell isHeader className={cn(caaThCellClass, "w-[150px]")}>
                Bloqueada
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
                  Sin usuarios
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const matchedUnits = matchedUnitsByUser?.get(Number(row.wialon_id));
                const blocked = blockedLabel(row);
                const isBlocked = blocked !== "No";
                const displayName = row.name || "Sin nombre";
                return (
                  <TableRow key={row.wialon_id} className={erpTableRowHoverClass}>
                    <TableCell className={cn(caaTdCellClass, "min-w-[220px] max-w-[320px]")}>
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => onEdit(row)}
                          className="block max-w-full truncate text-left font-medium text-[#09090B] transition-colors hover:text-[#1B5CFF] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:text-[#F8FAFC] dark:hover:text-[#4B7CFF]"
                          title={displayName}
                        >
                          {displayName}
                        </button>
                      ) : (
                        <span className="block truncate font-medium text-[#09090B] dark:text-[#F8FAFC]" title={displayName}>
                          {displayName}
                        </span>
                      )}
                      <span
                        className="mt-0.5 block truncate font-mono text-[11px] tabular-nums text-[#1B5CFF] dark:text-[#4B7CFF]"
                        title={row.user_id || undefined}
                      >
                        {row.user_id || "—"}
                        {row.creator ? ` · ${row.creator}` : ""}
                      </span>
                      {matchedUnits?.length ? (
                        <span
                          className="mt-1 block line-clamp-2 rounded-[6px] bg-[rgba(27,92,255,0.08)] px-1.5 py-0.5 text-[11px] leading-snug text-[#1244D1] dark:bg-[rgba(75,124,255,0.14)] dark:text-[#4B7CFF]"
                          title={matchedUnits.join(" · ")}
                        >
                          Unidad: {matchedUnits.join(" · ")}
                        </span>
                      ) : null}
                    </TableCell>

                    <TableCell className={cn(caaTdCellClass, "w-[160px] max-w-[200px]")}>
                      <span className="block truncate" title={row.parent_account || undefined}>
                        {row.parent_account || <span className={caaEmptyCellClass}>—</span>}
                      </span>
                    </TableCell>

                    <TableCell className={cn(caaTdCellClass, "w-[120px] text-center")}>
                      {row.dealer_rights === "Sí" ? (
                        <span className={caaStatusBadgeClass("neutral")}>Distribuidor</span>
                      ) : (
                        <span className={caaEmptyCellClass}>—</span>
                      )}
                    </TableCell>

                    <TableCell className={cn(caaTdCellClass, "w-[96px] text-center font-medium tabular-nums text-[#09090B] dark:text-[#F8FAFC]")}>
                      {row.assigned_units}
                    </TableCell>

                    <TableCell className={cn(caaTdCellClass, "w-[110px] text-center")}>
                      <StatusBadge status={row.status} />
                    </TableCell>

                    <TableCell className={cn(caaTdCellClass, "w-[150px] whitespace-nowrap tabular-nums")}>
                      {isBlocked ? (
                        <span className="text-[#C22B2B] dark:text-[#F87171]" title={blocked}>
                          {blocked}
                        </span>
                      ) : (
                        <span className={caaEmptyCellClass}>—</span>
                      )}
                    </TableCell>

                    <TableCell className={cn(caaTdCellClass, "w-[90px] text-center")}>
                      {canEdit ? (
                        <div className={cn(erpRowActionBarClass, "mx-auto w-fit")}>
                          <button
                            type="button"
                            onClick={() => onEdit(row)}
                            className={erpRowActionBtnClass}
                            title="Editar cuenta"
                            aria-label={`Editar ${row.name || row.user_id}`}
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
