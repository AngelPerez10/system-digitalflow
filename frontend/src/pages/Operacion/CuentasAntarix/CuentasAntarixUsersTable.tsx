import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { PencilIcon, BoxCubeIcon } from "@/icons";
import { erpChipNeutralClass, erpSectionLabelClass, erpTableWrapClass } from "@/layout/erpPageStyles";
import {
  erpRowActionBarClass,
  erpRowActionBtnClass,
  erpTableRowHoverClass,
} from "@/pages/Operacion/OrdenesTrabajo/ordenTrabajoStyles";
import { cn } from "@/lib/utils";
import type { WialonUserRow } from "./wialonTypes";

const uiBadge =
  "inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium leading-none";

const thBase = cn(
  erpSectionLabelClass,
  "bg-[#fcfaf6] py-3 text-left dark:bg-[#0f172a]/95"
);

const tdBase =
  "py-3 align-middle text-sm font-normal leading-snug text-[#57534e] dark:text-[#cbd5e1]";

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
  onEdit: (row: WialonUserRow) => void;
  onViewUnits: (row: WialonUserRow) => void;
};

/**
 * Tabla con anchos mínimos en px + columna Nombre flexible.
 * En pantallas anchas el nombre crece; en estrechas hay scroll horizontal suave.
 */
export default function CuentasAntarixUsersTable({ rows, canEdit = true, onEdit, onViewUnits }: Props) {
  return (
    <div className="min-w-0">
      <div
        className={cn(
          erpTableWrapClass,
          "touch-pan-x overflow-x-auto overscroll-x-contain rounded-2xl [-webkit-overflow-scrolling:touch]"
        )}
      >
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

          <TableHeader className="sticky top-0 z-10 border-b border-[#e7ded0] dark:border-[#273244]">
            <TableRow>
              <TableCell isHeader className={cn(thBase, "px-3")}>
                ID
              </TableCell>
              <TableCell isHeader className={cn(thBase, "px-4")}>
                Nombre
              </TableCell>
              <TableCell isHeader className={cn(thBase, "px-3")}>
                Cuenta padre
              </TableCell>
              <TableCell isHeader className={cn(thBase, "px-2 text-center")}>
                Distrib.
              </TableCell>
              <TableCell isHeader className={cn(thBase, "px-2 text-center")}>
                Unid.
              </TableCell>
              <TableCell isHeader className={cn(thBase, "px-2 text-center")}>
                Status
              </TableCell>
              <TableCell isHeader className={cn(thBase, "pl-3 pr-6")}>
                Bloq.
              </TableCell>
              <TableCell isHeader className={cn(thBase, "pl-4 pr-3 text-center")}>
                Acciones
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-[#efe5d7] dark:divide-[#1e293b]">
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="px-4 py-10 text-center text-sm text-[#78716c] dark:text-[#8ea0b8]"
                >
                  Sin usuarios
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => (
                <TableRow
                  key={row.wialon_id}
                  className={cn(
                    erpTableRowHoverClass,
                    idx % 2 === 1 && "bg-[#fcfaf6]/50 dark:bg-white/[0.02]"
                  )}
                >
                  <TableCell className={cn(tdBase, "px-3 tabular-nums text-[#1c1917] dark:text-[#f8fafc]")}>
                    <span className="block break-all text-sm font-medium" title={row.user_id || undefined}>
                      {row.user_id || "—"}
                    </span>
                  </TableCell>

                  <TableCell className={cn(tdBase, "px-4 align-top")}>
                    <div className="min-w-0 space-y-1.5">
                      <p
                        className="text-sm font-medium leading-snug text-[#1c1917] line-clamp-2 dark:text-[#f8fafc]"
                        title={row.name || undefined}
                      >
                        {row.name || "—"}
                      </p>
                      <p
                        className="text-xs font-normal leading-snug text-[#78716c] line-clamp-1 dark:text-[#8ea0b8]"
                        title={row.creator || undefined}
                      >
                        {row.creator || "—"}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell className={cn(tdBase, "px-3")}>
                    <span
                      className="block text-sm leading-snug text-[#1c1917] line-clamp-2 dark:text-[#f8fafc]"
                      title={row.parent_account || undefined}
                    >
                      {row.parent_account || "—"}
                    </span>
                  </TableCell>

                  <TableCell className={cn(tdBase, "px-2 text-center")}>
                    <DealerBadge value={row.dealer_rights} />
                  </TableCell>

                  <TableCell className={cn(tdBase, "px-2 text-center tabular-nums")}>
                    <span className="inline-flex min-w-[1.75rem] justify-center rounded-lg bg-[#fff3e6] px-2 py-0.5 text-sm font-medium text-[#c45f00] dark:bg-[#ff801f]/15 dark:text-[#ffb366]">
                      {row.assigned_units}
                    </span>
                  </TableCell>

                  <TableCell className={cn(tdBase, "px-2 text-center")}>
                    <StatusBadge status={row.status} />
                  </TableCell>

                  <TableCell
                    className={cn(
                      tdBase,
                      "pl-3 pr-6 tabular-nums whitespace-nowrap text-sm text-[#1c1917] dark:text-[#f8fafc]"
                    )}
                  >
                    <span title={blockedLabel(row) !== "No" ? blockedLabel(row) : undefined}>
                      {blockedLabel(row)}
                    </span>
                  </TableCell>

                  <TableCell className={cn(tdBase, "pl-4 pr-3 text-center")}>
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
                      <button
                        type="button"
                        onClick={() => onViewUnits(row)}
                        className={cn(
                          erpRowActionBtnClass,
                          "hover:border-[#ffa057] hover:text-[#ea580c] dark:hover:border-[#ff801f] dark:hover:text-[#ff801f]"
                        )}
                        title="Ver unidades"
                        aria-label={`Ver unidades de ${row.name || row.user_id}`}
                      >
                        <BoxCubeIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
