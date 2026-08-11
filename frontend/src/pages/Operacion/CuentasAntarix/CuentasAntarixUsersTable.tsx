import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { PencilIcon } from "@/icons";
import {
  erpChipNeutralClass,
  erpSansStyle,
  erpTableHeaderClass,
  erpTableWrapClass,
} from "@/layout/erpPageStyles";
import {
  erpRowActionBarClass,
  erpRowActionBtnClass,
  erpTableRowHoverClass,
} from "@/pages/Operacion/OrdenesTrabajo/ordenTrabajoStyles";
import { cn } from "@/lib/utils";
import type { WialonUserRow } from "./wialonTypes";

const thClass =
  "whitespace-nowrap px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#78716c] dark:text-[#8ea0b8] sm:text-[11px]";

const tdClass = "px-3 py-3 align-middle";

function accountInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.slice(0, 1).toUpperCase();
}

function blockedLabel(row: WialonUserRow): string {
  return row.status === "Bloqueado" && row.blocked !== "No" ? row.blocked : "No";
}

function StatusBadge({ status }: { status: string }) {
  const active = status === "Activo";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium leading-none",
        active
          ? "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/50"
          : "bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800/50"
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-emerald-500" : "bg-rose-500")}
        aria-hidden
      />
      {status}
    </span>
  );
}

function DealerBadge({ value }: { value: string }) {
  const yes = value === "Sí";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium leading-none",
        yes
          ? "bg-[#fff3e6] text-[#c45f00] ring-1 ring-inset ring-[#ff801f]/25 dark:bg-[#ff801f]/15 dark:text-[#ffb366] dark:ring-[#ff801f]/30"
          : cn(erpChipNeutralClass, "ring-1 ring-inset ring-[#e2d9ca] dark:ring-[#334155]")
      )}
    >
      {yes ? "Sí" : "No"}
    </span>
  );
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
    <div
      className="min-w-0 text-sm font-normal leading-relaxed text-[#57534e] dark:text-[#b7c1d1]"
      style={erpSansStyle}
    >
      <div
        className={cn(erpTableWrapClass, "bg-[#fffdfa]/80 dark:bg-[#0f172a]/50")}
        tabIndex={0}
        aria-label="Tabla de usuarios Wialon; desplaza horizontalmente si hace falta"
      >
        <Table className="w-full min-w-[68rem] table-fixed xl:min-w-full">
          <colgroup>
            <col style={{ width: "32%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "7.5rem" }} />
            <col style={{ width: "6.25rem" }} />
            <col style={{ width: "7.75rem" }} />
            <col style={{ width: "9.5rem" }} />
            <col style={{ width: "6.25rem" }} />
          </colgroup>

          <TableHeader className={cn(erpTableHeaderClass, "sticky top-0 z-10")}>
            <TableRow>
              <TableCell isHeader className={thClass}>
                Cuenta
              </TableCell>
              <TableCell isHeader className={thClass}>
                Cuenta padre
              </TableCell>
              <TableCell isHeader className={cn(thClass, "text-center")}>
                Distribuidor
              </TableCell>
              <TableCell isHeader className={cn(thClass, "text-center")}>
                Unidades
              </TableCell>
              <TableCell isHeader className={cn(thClass, "text-center")}>
                Estado
              </TableCell>
              <TableCell isHeader className={thClass}>
                Bloqueada
              </TableCell>
              <TableCell isHeader className={cn(thClass, "text-center")}>
                Acciones
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-[#f1e8db] text-[12px] text-[#44403c] dark:divide-[#273244] dark:text-[#e5e7eb]">
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-3 py-12 text-center text-sm text-[#78716c] dark:text-[#8ea0b8]">
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
                    <TableCell className={cn(tdClass, "align-top")}>
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff801f]/12 text-base font-medium text-[#9a3412] [font-family:Georgia,'Times_New_Roman',serif] dark:bg-[#fb923c]/15 dark:text-[#fdba74]"
                          aria-hidden
                        >
                          {accountInitial(displayName)}
                        </span>
                        <div className="min-w-0 flex-1 space-y-1">
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => onEdit(row)}
                              className="block max-w-full truncate text-left text-sm font-semibold leading-snug text-[#1c1917] transition-colors hover:text-[#ea580c] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/40 dark:text-[#f8fafc] dark:hover:text-[#fb923c]"
                              title={displayName}
                            >
                              {displayName}
                            </button>
                          ) : (
                            <p
                              className="truncate text-sm font-semibold leading-snug text-[#1c1917] dark:text-[#f8fafc]"
                              title={displayName}
                            >
                              {displayName}
                            </p>
                          )}
                          <p
                            className="truncate font-mono text-[11px] tabular-nums tracking-wide text-[#ea580c] dark:text-[#fb923c]"
                            title={row.user_id || undefined}
                          >
                            {row.user_id || "—"}
                          </p>
                          {row.creator ? (
                            <p className="truncate text-[11px] text-[#78716c] dark:text-[#8ea0b8]" title={row.creator}>
                              Creador: {row.creator}
                            </p>
                          ) : null}
                          {matchedUnits?.length ? (
                            <p
                              className="line-clamp-2 rounded-lg bg-[#fff3e6] px-2 py-1 text-[11px] leading-snug text-[#c45f00] dark:bg-[#ff801f]/12 dark:text-[#ffb366]"
                              title={matchedUnits.join(" · ")}
                            >
                              Unidad: {matchedUnits.join(" · ")}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className={tdClass}>
                      <span
                        className="block line-clamp-2 text-sm leading-snug text-[#1c1917] dark:text-[#f8fafc]"
                        title={row.parent_account || undefined}
                      >
                        {row.parent_account || "—"}
                      </span>
                    </TableCell>

                    <TableCell className={cn(tdClass, "text-center")}>
                      <DealerBadge value={row.dealer_rights} />
                    </TableCell>

                    <TableCell className={cn(tdClass, "text-center")}>
                      <span className="inline-flex min-w-[2.25rem] items-center justify-center rounded-lg bg-[#fff3e6] px-2 py-1 text-sm font-semibold tabular-nums text-[#c45f00] [font-family:Georgia,'Times_New_Roman',serif] dark:bg-[#ff801f]/15 dark:text-[#ffb366]">
                        {row.assigned_units}
                      </span>
                    </TableCell>

                    <TableCell className={cn(tdClass, "text-center")}>
                      <StatusBadge status={row.status} />
                    </TableCell>

                    <TableCell className={tdClass}>
                      <span
                        className={cn(
                          "text-sm tabular-nums",
                          isBlocked
                            ? "font-medium text-rose-700 dark:text-rose-300"
                            : "text-[#78716c] dark:text-[#8ea0b8]"
                        )}
                        title={isBlocked ? blocked : undefined}
                      >
                        {blocked}
                      </span>
                    </TableCell>

                    <TableCell className={cn(tdClass, "text-center")}>
                      {canEdit ? (
                        <div className={cn(erpRowActionBarClass, "mx-auto w-fit")}>
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
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#78716c] dark:text-[#8ea0b8]">—</span>
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
