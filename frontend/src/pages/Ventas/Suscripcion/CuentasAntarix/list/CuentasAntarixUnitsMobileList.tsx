/**
 * Unidades en tarjetas (celular / tablet), en las mismas secciones que la
 * tabla: Inactivas → Sin cuenta → Activas. Entrada escalonada
 * (`caa-row-in`); cada sección usa `content-visibility` para no pintar lo que
 * está fuera de pantalla.
 */
import type { CSSProperties } from "react";
import { Car, ChevronRight, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { erpSansStyle } from "../shared/cuentasAntarixStyles";
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

export default function CuentasAntarixUnitsMobileList({ secciones, canEdit = true, onOpen }: Props) {
  let i = 0;
  return (
    <div className="space-y-4 sm:space-y-5" style={erpSansStyle}>
      {secciones.map((s) => {
        const tone = UNIDAD_SECCION_TONE[s.key];
        return (
          <section key={s.key} className="caa-section space-y-2" aria-label={`${s.label}: ${s.rows.length}`}>
            <div id={`caa-sec-${s.key}-m`} className={cn("scroll-mt-20 rounded-[10px] px-2.5 py-1.5 sm:scroll-mt-24 sm:rounded-2xl sm:px-3 sm:py-2", tone.band)}>
              <CaaSeccionHeader seccion={s} tone={tone} />
            </div>
            {s.rows.map((entry) => {
              const Wrapper = canEdit ? "button" : "div";
              return (
                <Wrapper
                  key={entry.unit_id}
                  {...(canEdit
                    ? { type: "button" as const, onClick: () => onOpen(entry), "aria-label": `Abrir unidad ${entry.name || entry.uid || entry.unit_id}` }
                    : {})}
                  style={{ "--caa-i": i++ } as CSSProperties}
                  className={cn(
                    "caa-row-in group flex w-full min-w-0 items-start gap-2.5 rounded-[14px] border border-[#E7E7EA] bg-white p-3 text-left transition-[border-color,box-shadow] duration-150 sm:items-center sm:gap-3 sm:rounded-3xl sm:p-3.5 dark:border-[#273244] dark:bg-[#111827]",
                    canEdit &&
                      "cot-press hover:border-[#BFD3FF] hover:shadow-[0_6px_18px_-12px_rgba(27,92,255,0.45)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] dark:hover:border-[#2C3F7A]",
                  )}
                >
                  <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] sm:size-10 sm:rounded-2xl", tone.tile)} aria-hidden>
                    <Car className="size-4 sm:size-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-[#09090B] sm:text-[14.5px] dark:text-[#F8FAFC]">{entry.name || "Sin nombre"}</span>
                    <span className="mt-0.5 flex min-w-0 flex-col gap-0.5 font-mono text-[11px] tabular-nums text-[#71717A] sm:flex-row sm:items-center sm:gap-2 sm:text-[11.5px] dark:text-[#8EA0B8]">
                      <span className="truncate">{entry.uid?.trim() ? entry.uid : "Sin IMEI"}</span>
                      {entry.phone?.trim() ? (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <Phone className="size-3 shrink-0" aria-hidden />
                          <span className="truncate">{entry.phone}</span>
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
                      <CaaUnidadEstado activa={unidadActiva(entry)} />
                      <span className="min-w-0 max-w-full">
                        <CaaUnitOwners users={entry.users} />
                      </span>
                    </span>
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
        );
      })}
    </div>
  );
}
