/**
 * Cuentas en tarjetas (celular / tablet), en las mismas secciones que la
 * tabla: Bloqueadas → Sin unidades → Con unidades. Entrada escalonada
 * (`caa-row-in`); cada sección usa `content-visibility` para no pintar lo que
 * está fuera de pantalla.
 */
import type { CSSProperties } from "react";
import { Car, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { erpSansStyle } from "../shared/cuentasAntarixStyles";
import { unidadesDe, type CaaSeccion } from "../shared/cuentasAntarixFiltros";
import type { WialonUserRow } from "../shared/wialonTypes";
import { CaaAvatar, CaaDistribuidor, CaaEstado, CaaSeccionHeader, CaaUnidades } from "./CuentasAntarixBadges";
import { SECCION_TONE } from "../shared/cuentasAntarixTonos";

type Props = {
  secciones: CaaSeccion[];
  canEdit?: boolean;
  search?: string;
  matchedUnitsByUser?: Map<number, string[]>;
  onEdit: (row: WialonUserRow) => void;
};

export default function CuentasAntarixUsersMobileList({ secciones, canEdit = true, search = "", matchedUnitsByUser, onEdit }: Props) {
  let i = 0;
  return (
    <div className="space-y-4 sm:space-y-5" style={erpSansStyle}>
      {secciones.map((s) => (
        <section key={s.key} className="caa-section space-y-2" aria-label={`${s.label}: ${s.rows.length}`}>
          <div id={`caa-sec-${s.key}-m`} className={cn("scroll-mt-20 rounded-[10px] px-2.5 py-1.5 sm:scroll-mt-24 sm:rounded-2xl sm:px-3 sm:py-2", SECCION_TONE[s.key].band)}>
            <CaaSeccionHeader seccion={s} />
          </div>
          {s.rows.map((row) => {
            const matched = matchedUnitsByUser?.get(Number(row.wialon_id));
            const Wrapper = canEdit ? "button" : "div";
            return (
              <Wrapper
                key={row.wialon_id}
                {...(canEdit ? { type: "button" as const, onClick: () => onEdit(row), "aria-label": `Editar ${row.name || row.user_id}` } : {})}
                style={{ "--caa-i": i++ } as CSSProperties}
                className={cn(
                  "caa-row-in group flex w-full min-w-0 items-start gap-2.5 rounded-[14px] border border-[#E7E7EA] bg-white p-3 text-left transition-[border-color,box-shadow] duration-150 sm:items-center sm:gap-3 sm:rounded-3xl sm:p-3.5 dark:border-[#273244] dark:bg-[#111827]",
                  canEdit &&
                    "cot-press hover:border-[#BFD3FF] hover:shadow-[0_6px_18px_-12px_rgba(27,92,255,0.45)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] dark:hover:border-[#2C3F7A]",
                )}
              >
                <CaaAvatar row={row} className="size-9 text-[14px] sm:size-10 sm:text-[15px]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-[#09090B] sm:text-[14.5px] dark:text-[#F8FAFC]">{row.name || "Sin nombre"}</span>
                  <span className="mt-0.5 block truncate font-mono text-[11px] tabular-nums text-[#71717A] sm:text-[11.5px] dark:text-[#8EA0B8]">{row.user_id || "—"}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-1.5">
                    <CaaEstado row={row} conFecha={false} />
                    <CaaUnidades n={unidadesDe(row)} />
                    {row.dealer_rights === "Sí" ? <CaaDistribuidor /> : null}
                  </span>
                  {search.trim() && matched?.length ? (
                    <span className="mt-2 block line-clamp-2 wrap-break-word text-[12px] leading-snug text-[#1244D1] dark:text-[#9BB6FF]">
                      <Car className="mr-1 inline size-3 -translate-y-px" aria-hidden />
                      {matched.join(" · ")}
                    </span>
                  ) : null}
                </span>
                {canEdit ? (
                  <ChevronRight
                    className="mt-1 size-4 shrink-0 text-[#D4D4D8] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[#1B5CFF] sm:mt-0 dark:text-[#3A4661]"
                    aria-hidden
                  />
                ) : null}
              </Wrapper>
            );
          })}
        </section>
      ))}
    </div>
  );
}
