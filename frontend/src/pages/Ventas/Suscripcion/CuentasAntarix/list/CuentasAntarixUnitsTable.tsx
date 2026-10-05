/**
 * Tabla de unidades (escritorio), agrupada en secciones: Inactivas →
 * Sin cuenta → Activas. Mismo lenguaje que la tabla de cuentas: mosaico de
 * color por sección, etiquetas suaves y entrada escalonada (`caa-row-in`,
 * solo transform/opacity).
 */
import type { CSSProperties } from "react";
import { Car, Pencil, Phone } from "lucide-react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { caaEmptyCellClass, caaTdCellClass, caaThCellClass, erpSansStyle, erpTableHeaderClass, erpTableWrapClass } from "../shared/cuentasAntarixStyles";
import { unidadActiva, type CaaUnidadSeccion } from "../shared/cuentasAntarixFiltros";
import { UNIDAD_SECCION_TONE } from "../shared/cuentasAntarixTonos";
import type { WialonUnitSearchEntry } from "../shared/wialonTypes";
import { CaaSeccionHeader, CaaUnidadEstado } from "./CuentasAntarixBadges";
import { CaaUnitOwners } from "./CuentasAntarixUnitOwners";

type Props = {
  secciones: CaaUnidadSeccion[];
  canEdit?: boolean;
  onOpen: (entry: WialonUnitSearchEntry) => void;
};

const COLS = 6;

export default function CuentasAntarixUnitsTable({ secciones, canEdit = true, onOpen }: Props) {
  let i = 0;
  return (
    <div className="min-w-0" style={erpSansStyle}>
      <div className={erpTableWrapClass}>
        <Table className="w-full min-w-[960px] lg:min-w-full">
          <TableHeader className={erpTableHeaderClass}>
            <TableRow>
              <TableCell isHeader className={cn(caaThCellClass, "min-w-[240px] py-2.5 pl-4")}>
                Unidad
              </TableCell>
              <TableCell isHeader className={cn(caaThCellClass, "w-[130px] py-2.5")}>
                Estado
              </TableCell>
              <TableCell isHeader className={cn(caaThCellClass, "w-[210px] py-2.5")}>
                Equipo
              </TableCell>
              <TableCell isHeader className={cn(caaThCellClass, "min-w-[220px] py-2.5")}>
                Cuentas
              </TableCell>
              <TableCell isHeader className={cn(caaThCellClass, "min-w-[160px] py-2.5")}>
                Campos
              </TableCell>
              <TableCell isHeader className={cn(caaThCellClass, "w-[72px] py-2.5 pr-4 text-right")}>
                <span className="sr-only">Acciones</span>
              </TableCell>
            </TableRow>
          </TableHeader>

          {secciones.map((s) => {
            const tone = UNIDAD_SECCION_TONE[s.key];
            return (
              <TableBody key={s.key} className="bg-white text-[12.5px] text-[#3F3F46] dark:bg-[#111827] dark:text-[#D6DEEA]">
                <TableRow>
                  <TableCell colSpan={COLS} className={cn("border-y border-[#EDEDF0] px-4 py-2.5 dark:border-[#1F2A3C]", tone.band)}>
                    <span id={`caa-sec-${s.key}`} className="block scroll-mt-24">
                      <CaaSeccionHeader seccion={s} tone={tone} />
                    </span>
                  </TableCell>
                </TableRow>
                {s.rows.map((entry) => {
                  const nombre = entry.name || "Sin nombre";
                  return (
                    <TableRow
                      key={entry.unit_id}
                      style={{ "--caa-i": i++ } as CSSProperties}
                      className={cn(
                        "caa-row-in group/row border-b border-[#F1F1F3] transition-colors duration-150 last:border-b-0 hover:bg-[#FAFAFB] dark:border-[#1A2335] dark:hover:bg-white/[0.025]",
                        canEdit && "cursor-pointer",
                      )}
                      onClick={canEdit ? () => onOpen(entry) : undefined}
                    >
                      <TableCell className={cn(caaTdCellClass, "py-3 pl-4")}>
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-[12px]", tone.tile)} aria-hidden>
                            <Car className="size-4" />
                          </span>
                          <div className="min-w-0">
                            {canEdit ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpen(entry);
                                }}
                                className="block max-w-full truncate text-left text-[13.5px] font-semibold text-[#09090B] transition-colors duration-150 hover:text-[#1B5CFF] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:text-[#F8FAFC] dark:hover:text-[#7EA0FF]"
                                title={nombre}
                              >
                                {nombre}
                              </button>
                            ) : (
                              <span className="block truncate text-[13.5px] font-semibold text-[#09090B] dark:text-[#F8FAFC]" title={nombre}>
                                {nombre}
                              </span>
                            )}
                            <span className="mt-0.5 block font-mono text-[11.5px] tabular-nums text-[#8A8A93] dark:text-[#7F8DAB]">ID {entry.unit_id}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className={cn(caaTdCellClass, "py-3")}>
                        <CaaUnidadEstado activa={unidadActiva(entry)} />
                      </TableCell>

                      <TableCell className={cn(caaTdCellClass, "py-3")}>
                        <span className="block max-w-[200px] truncate font-mono text-[12px] tabular-nums text-[#27272A] dark:text-[#E2E8F0]" title={entry.uid || undefined}>
                          {entry.uid?.trim() ? entry.uid : <span className={cn(caaEmptyCellClass, "font-sans")}>Sin IMEI</span>}
                        </span>
                        <span className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11.5px] tabular-nums text-[#8A8A93] dark:text-[#7F8DAB]">
                          <Phone className="size-3 shrink-0" aria-hidden />
                          {entry.phone?.trim() ? entry.phone : <span className="font-sans">Sin SIM</span>}
                        </span>
                      </TableCell>

                      <TableCell className={cn(caaTdCellClass, "max-w-[280px] py-3")}>
                        <CaaUnitOwners users={entry.users} />
                      </TableCell>

                      <TableCell className={cn(caaTdCellClass, "max-w-[240px] py-3")}>
                        <span className="block line-clamp-2 leading-snug text-[#71717A] dark:text-[#8EA0B8]" title={entry.custom_fields || undefined}>
                          {entry.custom_fields?.trim() ? entry.custom_fields : <span className={caaEmptyCellClass}>—</span>}
                        </span>
                      </TableCell>

                      <TableCell className={cn(caaTdCellClass, "py-3 pr-4 text-right")}>
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpen(entry);
                            }}
                            className="cot-press inline-flex size-8 items-center justify-center rounded-[9px] text-[#A1A1AA] opacity-70 hover:bg-[#EEF3FF] hover:text-[#1B5CFF] group-hover/row:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.3)] dark:hover:bg-[#1B2A63]/60 dark:hover:text-[#9BB6FF]"
                            title="Abrir unidad"
                            aria-label={`Abrir unidad ${entry.name || entry.uid || entry.unit_id}`}
                          >
                            <Pencil className="size-4" aria-hidden />
                          </button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            );
          })}
        </Table>
      </div>
    </div>
  );
}
