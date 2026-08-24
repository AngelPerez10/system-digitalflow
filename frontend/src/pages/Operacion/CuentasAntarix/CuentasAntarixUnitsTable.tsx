import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { PencilIcon } from "@/icons";
import {
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
import type { WialonUnitSearchEntry } from "./wialonTypes";

const thClass =
  "whitespace-nowrap px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#78716c] dark:text-[#8ea0b8] sm:text-[11px]";

const tdClass = "px-3 py-3 align-middle";

function unitInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.slice(0, 1).toUpperCase();
}

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
  const active = status === "Activo";
  const inactive = status === "Inactivo";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium leading-none",
        active
          ? "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/50"
          : inactive
            ? "bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800/50"
            : "bg-[#f5f0e8] text-[#78716c] ring-1 ring-inset ring-[#e2d9ca] dark:bg-[#1e293b] dark:text-[#8ea0b8] dark:ring-[#334155]"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          active ? "bg-emerald-500" : inactive ? "bg-rose-500" : "bg-[#a8a29e]"
        )}
        aria-hidden
      />
      {status}
    </span>
  );
}

type Props = {
  rows: WialonUnitSearchEntry[];
  canEdit?: boolean;
  onOpen: (entry: WialonUnitSearchEntry) => void;
};

export default function CuentasAntarixUnitsTable({
  rows,
  canEdit = true,
  onOpen,
}: Props) {
  return (
    <div className={erpTableWrapClass} style={erpSansStyle}>
      <div
        className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]"
        aria-label="Tabla de unidades Wialon; desplaza horizontalmente si hace falta"
      >
        <Table className="w-full min-w-[1040px] border-collapse text-sm">
          <TableHeader className={erpTableHeaderClass}>
            <TableRow>
              <TableCell isHeader className={cn(thClass, "min-w-[220px]")}>
                Unidad
              </TableCell>
              <TableCell isHeader className={cn(thClass, "min-w-[100px]")}>
                Estado
              </TableCell>
              <TableCell isHeader className={cn(thClass, "min-w-[160px]")}>
                UID / IMEI
              </TableCell>
              <TableCell isHeader className={cn(thClass, "min-w-[120px]")}>
                Teléfono
              </TableCell>
              <TableCell isHeader className={cn(thClass, "min-w-[200px]")}>
                Cuentas
              </TableCell>
              <TableCell isHeader className={cn(thClass, "min-w-[160px]")}>
                Campos
              </TableCell>
              <TableCell isHeader className={cn(thClass, "w-[88px] text-center")}>
                Acciones
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#e7ded0] dark:divide-[#273244]">
            {rows.map((entry) => {
              const owners = ownersLabel(entry);
              return (
                <TableRow key={entry.unit_id} className={erpTableRowHoverClass}>
                  <TableCell className={tdClass}>
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ff801f]/12 text-sm font-medium text-[#9a3412] [font-family:Georgia,'Times_New_Roman',serif] dark:bg-[#fb923c]/15 dark:text-[#fdba74]"
                        aria-hidden
                      >
                        {unitInitial(entry.name || "")}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#1c1917] dark:text-[#f8fafc]">
                          {entry.name || "Sin nombre"}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] tabular-nums text-[#78716c] dark:text-[#8ea0b8]">
                          ID {entry.unit_id}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className={tdClass}>
                    <UnitStatusBadge entry={entry} />
                  </TableCell>
                  <TableCell className={tdClass}>
                    <span className="block max-w-[220px] truncate font-mono text-[12px] tracking-wide text-[#ea580c] dark:text-[#fb923c]">
                      {entry.uid?.trim() ? entry.uid : "—"}
                    </span>
                  </TableCell>
                  <TableCell className={tdClass}>
                    <span className="font-mono text-[12px] tabular-nums text-[#57534e] dark:text-[#cbd5e1]">
                      {entry.phone?.trim() ? entry.phone : "—"}
                    </span>
                  </TableCell>
                  <TableCell className={tdClass}>
                    <span
                      className="line-clamp-2 text-[12px] leading-snug text-[#57534e] dark:text-[#cbd5e1]"
                      title={owners}
                    >
                      {owners}
                    </span>
                  </TableCell>
                  <TableCell className={tdClass}>
                    <span
                      className="line-clamp-2 text-[12px] leading-snug text-[#78716c] dark:text-[#8ea0b8]"
                      title={entry.custom_fields || undefined}
                    >
                      {entry.custom_fields?.trim() ? entry.custom_fields : "—"}
                    </span>
                  </TableCell>
                  <TableCell className={cn(tdClass, "text-center")}>
                    {canEdit ? (
                      <div className={cn(erpRowActionBarClass, "mx-auto w-fit gap-1 p-1")}>
                        <button
                          type="button"
                          onClick={() => onOpen(entry)}
                          className={cn(
                            erpRowActionBtnClass,
                            "h-7 w-7 hover:border-[#ffa057] hover:text-[#ea580c] dark:hover:border-[#ff801f] dark:hover:text-[#ff801f]"
                          )}
                          title="Abrir unidad"
                          aria-label={`Abrir unidad ${entry.name || entry.uid || entry.unit_id}`}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#a8a29e]">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
