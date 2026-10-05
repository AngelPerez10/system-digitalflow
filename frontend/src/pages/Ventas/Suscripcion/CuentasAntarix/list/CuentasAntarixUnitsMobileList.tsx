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
    <div className="space-y-5" style={erpSansStyle}>
      {secciones.map((s) => {
        const tone = UNIDAD_SECCION_TONE[s.key];
        return (
          <section key={s.key} className="caa-section space-y-2" aria-label={`${s.label}: ${s.rows.length}`}>
            <div id={`caa-sec-${s.key}-m`} className={cn("scroll-mt-24 rounded-[12px] px-3 py-2", tone.band)}>
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
                    "caa-row-in group flex w-full min-w-0 items-center gap-3 rounded-[16px] border border-[#E7E7EA] bg-white p-3.5 text-left transition-[border-color,box-shadow] duration-150 dark:border-[#273244] dark:bg-[#111827]",
                    canEdit &&
                      "cot-press hover:border-[#BFD3FF] hover:shadow-[0_6px_18px_-12px_rgba(27,92,255,0.45)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] dark:hover:border-[#2C3F7A]",
                  )}
                >
                  <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-[12px]", tone.tile)} aria-hidden>
                    <Car className="size-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{entry.name || "Sin nombre"}</span>
                    <span className="mt-0.5 flex min-w-0 items-center gap-2 font-mono text-[11.5px] tabular-nums text-[#71717A] dark:text-[#8EA0B8]">
                      <span className="truncate">{entry.uid?.trim() ? entry.uid : "Sin IMEI"}</span>
                      {entry.phone?.trim() ? (
                        <span className="inline-flex shrink-0 items-center gap-1">
                          <Phone className="size-3" aria-hidden />
                          {entry.phone}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <CaaUnidadEstado activa={unidadActiva(entry)} />
                      <span className="min-w-0 max-w-full">
                        <CaaUnitOwners users={entry.users} />
                      </span>
                    </span>
                  </span>
                  {canEdit ? (
                    <ChevronRight
                      className="size-4 shrink-0 text-[#D4D4D8] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[#1B5CFF] dark:text-[#3A4661]"
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
