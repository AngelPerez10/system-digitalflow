/**
 * Tabla de cuentas (escritorio), agrupada en secciones: Bloqueadas →
 * Sin unidades → Con unidades. Cada sección lleva un encabezado con su
 * conteo; las filas entran escalonadas (`caa-row-in`, solo transform/opacity).
 *
 * Lenguaje visual: sin pastillas en mayúsculas; estado con punto + texto,
 * unidades como cifra con ícono (ámbar cuando no tiene ninguna).
 */
import type { CSSProperties } from "react";
import { Car, Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  caaEmptyCellClass,
  caaTdCellClass,
  caaThCellClass,
  erpSansStyle,
  erpTableHeaderClass,
  erpTableWrapClass,
} from "../shared/cuentasAntarixStyles";
import { unidadesDe, type CaaSeccion } from "../shared/cuentasAntarixFiltros";
import type { WialonUserRow } from "../shared/wialonTypes";
import { CaaAvatar, CaaDistribuidor, CaaEstado, CaaSeccionHeader, CaaUnidades } from "./CuentasAntarixBadges";
import { SECCION_TONE } from "../shared/cuentasAntarixTonos";

type Props = {
  secciones: CaaSeccion[];
  canEdit?: boolean;
  matchedUnitsByUser?: Map<number, string[]>;
  onEdit: (row: WialonUserRow) => void;
};

const COLS = 6;

export default function CuentasAntarixUsersTable({ secciones, canEdit = true, matchedUnitsByUser, onEdit }: Props) {
  let i = 0;
  return (
    <div className="min-w-0" style={erpSansStyle}>
      <div className={erpTableWrapClass}>
        <Table className="w-full min-w-[900px] lg:min-w-full">
          <TableHeader className={erpTableHeaderClass}>
            <TableRow>
              <TableCell isHeader className={cn(caaThCellClass, "min-w-[260px] py-2.5 pl-4")}>
                Cuenta
              </TableCell>
              <TableCell isHeader className={cn(caaThCellClass, "w-[180px] py-2.5")}>
                Cuenta padre
              </TableCell>
              <TableCell isHeader className={cn(caaThCellClass, "w-[130px] py-2.5")}>
                Unidades
              </TableCell>
              <TableCell isHeader className={cn(caaThCellClass, "w-[170px] py-2.5")}>
                Estado
              </TableCell>
              <TableCell isHeader className={cn(caaThCellClass, "w-[120px] py-2.5")}>
                Distribuidor
              </TableCell>
              <TableCell isHeader className={cn(caaThCellClass, "w-[72px] py-2.5 pr-4 text-right")}>
                <span className="sr-only">Acciones</span>
              </TableCell>
            </TableRow>
          </TableHeader>

          {secciones.map((s) => (
            <TableBody key={s.key} className="bg-white text-[12.5px] text-[#3F3F46] dark:bg-[#111827] dark:text-[#D6DEEA]">
              <TableRow>
                <TableCell colSpan={COLS} className={cn("border-y border-[#EDEDF0] px-4 py-2.5 dark:border-[#1F2A3C]", SECCION_TONE[s.key].band)}>
                  <span id={`caa-sec-${s.key}`} className="block scroll-mt-24">
                    <CaaSeccionHeader seccion={s} />
                  </span>
                </TableCell>
              </TableRow>
              {s.rows.map((row) => {
                const matchedUnits = matchedUnitsByUser?.get(Number(row.wialon_id));
                const displayName = row.name || "Sin nombre";
                return (
                  <TableRow
                    key={row.wialon_id}
                    style={{ "--caa-i": i++ } as CSSProperties}
                    className={cn(
                      "caa-row-in group/row border-b border-[#F1F1F3] transition-colors duration-150 last:border-b-0 hover:bg-[#FAFAFB] dark:border-[#1A2335] dark:hover:bg-white/[0.025]",
                      canEdit && "cursor-pointer",
                    )}
                    onClick={canEdit ? () => onEdit(row) : undefined}
                  >
                    <TableCell className={cn(caaTdCellClass, "py-3 pl-4")}>
                      <div className="flex min-w-0 items-center gap-3">
                        <CaaAvatar row={row} className="size-9 text-[13px]" />
                        <div className="min-w-0">
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(row);
                              }}
                              className="block max-w-full truncate text-left text-[13.5px] font-semibold text-[#09090B] transition-colors duration-150 hover:text-[#1B5CFF] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:text-[#F8FAFC] dark:hover:text-[#7EA0FF]"
                              title={displayName}
                            >
                              {displayName}
                            </button>
                          ) : (
                            <span className="block truncate text-[13.5px] font-semibold text-[#09090B] dark:text-[#F8FAFC]" title={displayName}>
                              {displayName}
                            </span>
                          )}
                          <span className="mt-0.5 block truncate font-mono text-[11.5px] tabular-nums text-[#71717A] dark:text-[#8EA0B8]" title={row.user_id || undefined}>
                            {row.user_id || "—"}
                            {row.creator && row.creator !== "—" ? <span className="font-sans"> · {row.creator}</span> : null}
                          </span>
                          {matchedUnits?.length ? (
                            <span
                              className="mt-1 block line-clamp-2 text-[11.5px] leading-snug text-[#1244D1] dark:text-[#9BB6FF]"
                              title={matchedUnits.join(" · ")}
                            >
                              <Car className="mr-1 inline size-3 -translate-y-px" aria-hidden />
                              {matchedUnits.join(" · ")}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className={cn(caaTdCellClass, "max-w-[220px] py-3")}>
                      <span className="block truncate" title={row.parent_account || undefined}>
                        {row.parent_account && row.parent_account !== "—" ? row.parent_account : <span className={caaEmptyCellClass}>—</span>}
                      </span>
                    </TableCell>

                    <TableCell className={cn(caaTdCellClass, "py-3")}>
                      <CaaUnidades n={unidadesDe(row)} />
                    </TableCell>

                    <TableCell className={cn(caaTdCellClass, "py-3")}>
                      <CaaEstado row={row} />
                    </TableCell>

                    <TableCell className={cn(caaTdCellClass, "py-3")}>
                      {row.dealer_rights === "Sí" ? (
                        <CaaDistribuidor />
                      ) : (
                        <span className={caaEmptyCellClass}>—</span>
                      )}
                    </TableCell>

                    <TableCell className={cn(caaTdCellClass, "py-3 pr-4 text-right")}>
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(row);
                          }}
                          className="cot-press inline-flex size-8 items-center justify-center rounded-[9px] text-[#A1A1AA] opacity-70 hover:bg-[#EEF3FF] hover:text-[#1B5CFF] group-hover/row:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.3)] dark:hover:bg-[#1B2A63]/60 dark:hover:text-[#9BB6FF]"
                          title="Editar cuenta"
                          aria-label={`Editar ${row.name || row.user_id}`}
                        >
                          <Pencil className="size-4" aria-hidden />
                        </button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          ))}
        </Table>
      </div>
    </div>
  );
}
