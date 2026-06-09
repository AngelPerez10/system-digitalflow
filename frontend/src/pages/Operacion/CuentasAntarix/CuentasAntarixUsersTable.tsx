import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { PencilIcon } from "@/icons";
import { erpChipNeutralClass, erpSansStyle } from "@/layout/erpPageStyles";
import {
  erpRowActionBarClass,
  erpRowActionBtnClass,
} from "@/pages/Operacion/OrdenesTrabajo/ordenTrabajoStyles";
import { cn } from "@/lib/utils";
import type { WialonUserRow } from "./wialonTypes";

const uiBadge =
  "inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium leading-none";

const tableWrapClass =
  "overflow-x-auto rounded-xl border border-[#e7ded0]/90 bg-[#fcfaf6]/60 dark:border-[#273244] dark:bg-[#0f172a]/35";

const tableHeaderClass =
  "sticky top-0 z-10 border-b border-[#e7ded0] bg-[#fffdfa]/95 text-[11px] font-semibold text-[#1c1917] dark:border-[#334155] dark:bg-[#111827]/95 dark:text-[#f8fafc]";

const thCellClass = "px-3 py-2 text-left text-gray-700 dark:text-gray-300";

const tableBodyClass =
  "divide-y divide-[#f5f5f4] text-[12px] text-[#44403c] dark:divide-[#334155]/80 dark:text-[#e5e7eb]";

const rowHoverClass = "hover:bg-[#fff7ed]/80 dark:hover:bg-[#1e293b]/50";

function blockedLabel(row: WialonUserRow): string {
  return row.status === "Bloqueado" && row.blocked !== "No" ? row.blocked : "No";
}

function StatusBadge({ status }: { status: string }) {
  const active = status === "Activo";
  return (
    <span
      className={cn(
        uiBadge,
        active
          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
      )}
    >
      {status}
    </span>
  );
}

function DealerBadge({ value }: { value: string }) {
  const yes = value === "Sí";
  return (
    <span
      className={cn(
        uiBadge,
        yes
          ? "bg-[#fff3e6] text-[#c45f00] dark:bg-[#ff801f]/15 dark:text-[#ffb366]"
          : erpChipNeutralClass
      )}
    >
      {value}
    </span>
  );
}

type Props = {
  rows: WialonUserRow[];
  canEdit?: boolean;
  matchedUnitsByUser?: Map<number, string[]>;
  onEdit: (row: WialonUserRow) => void;
};

/**
 * Tabla alineada con ProductosPage: contenedor crema, cabecera sticky y hover naranja suave.
 */
export default function CuentasAntarixUsersTable({
  rows,
  canEdit = true,
  matchedUnitsByUser,
  onEdit,
}: Props) {
  return (
    <div
      className="min-w-0 text-sm font-normal leading-relaxed text-[#57534e] dark:text-[#b7c1d1]"
      style={erpSansStyle}
    >
      <div className={cn(tableWrapClass, "touch-pan-x overscroll-x-contain [-webkit-overflow-scrolling:touch]")}>
        <Table className="w-full min-w-[72rem] table-fixed xl:min-w-full">
          <colgroup>
            <col style={{ width: "6.5rem" }} />
            <col />
            <col style={{ width: "8.5rem" }} />
            <col style={{ width: "5.25rem" }} />
            <col style={{ width: "4.5rem" }} />
            <col style={{ width: "6.75rem" }} />
            <col style={{ width: "10.5rem" }} />
            <col style={{ width: "6.5rem" }} />
          </colgroup>

          <TableHeader className={tableHeaderClass}>
            <TableRow>
              <TableCell isHeader className={thCellClass}>
                ID
              </TableCell>
              <TableCell isHeader className={thCellClass}>
                Nombre
              </TableCell>
              <TableCell isHeader className={thCellClass}>
                Cuenta padre
              </TableCell>
              <TableCell isHeader className={cn(thCellClass, "text-center")}>
                Distrib.
              </TableCell>
              <TableCell isHeader className={cn(thCellClass, "text-center")}>
                Unid.
              </TableCell>
              <TableCell isHeader className={cn(thCellClass, "text-center")}>
                Status
              </TableCell>
              <TableCell isHeader className={thCellClass}>
                Bloq.
              </TableCell>
              <TableCell isHeader className={cn(thCellClass, "text-center")}>
                Acciones
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className={tableBodyClass}>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="px-3 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  Sin usuarios
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const matchedUnits = matchedUnitsByUser?.get(Number(row.wialon_id));
                return (
                  <TableRow key={row.wialon_id} className={rowHoverClass}>
                    <TableCell className="px-3 py-2 align-middle tabular-nums">
                      <span
                        className="block break-all text-sm font-medium text-gray-900 dark:text-white"
                        title={row.user_id || undefined}
                      >
                        {row.user_id || "—"}
                      </span>
                    </TableCell>

                    <TableCell className="px-3 py-2 align-top">
                      <div className="min-w-0 space-y-1">
                        <p
                          className="truncate text-sm font-medium text-gray-900 line-clamp-2 dark:text-white"
                          title={row.name || undefined}
                        >
                          {row.name || "—"}
                        </p>
                        <p
                          className="truncate text-xs text-gray-500 line-clamp-1 dark:text-gray-400"
                          title={row.creator || undefined}
                        >
                          {row.creator || "—"}
                        </p>
                        {matchedUnits?.length ? (
                          <p
                            className="text-xs text-[#ff801f] line-clamp-2 dark:text-[#ffa057]"
                            title={matchedUnits.join(" · ")}
                          >
                            Unidad: {matchedUnits.join(" · ")}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell className="px-3 py-2 align-middle whitespace-nowrap">
                      <span
                        className="block text-sm text-gray-900 line-clamp-2 dark:text-white"
                        title={row.parent_account || undefined}
                      >
                        {row.parent_account || "—"}
                      </span>
                    </TableCell>

                    <TableCell className="px-3 py-2 text-center align-middle">
                      <DealerBadge value={row.dealer_rights} />
                    </TableCell>

                    <TableCell className="px-3 py-2 text-center align-middle tabular-nums">
                      <span className="inline-flex min-w-[1.75rem] justify-center rounded-lg bg-[#fff3e6] px-2 py-0.5 text-sm font-medium text-[#c45f00] dark:bg-[#ff801f]/15 dark:text-[#ffb366]">
                        {row.assigned_units}
                      </span>
                    </TableCell>

                    <TableCell className="px-3 py-2 text-center align-middle">
                      <StatusBadge status={row.status} />
                    </TableCell>

                    <TableCell className="px-3 py-2 align-middle tabular-nums whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <span title={blockedLabel(row) !== "No" ? blockedLabel(row) : undefined}>
                        {blockedLabel(row)}
                      </span>
                    </TableCell>

                    <TableCell className="px-3 py-2 text-center align-middle">
                      <div className={cn(erpRowActionBarClass, "mx-auto w-fit")}>
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => onEdit(row)}
                            className={cn(
                              erpRowActionBtnClass,
                              "hover:border-[#ffa057] hover:text-[#ea580c] dark:hover:border-[#ff801f] dark:hover:text-[#ff801f]"
                            )}
                            title="Editar usuario"
                            aria-label={`Editar ${row.name || row.user_id}`}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
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
