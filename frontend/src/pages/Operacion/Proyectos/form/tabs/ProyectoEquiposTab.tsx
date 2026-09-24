import { ChevronDown, ListChecks } from "lucide-react";
import { displayCotizacionFolio } from "../../shared/proyectoFormUtils";
import { SectionCard } from "../../shared/ProyectoUi";
import { emptyPanel, focusRing, metaChip, origenChip } from "../../shared/proyectoTokens";
import { ProyectoEquiposSection } from "../fields/ProyectoEquiposSection";
import { ProyectoProductoThumb } from "../fields/ProyectoProductoThumb";
import type { ProyectoFormApi } from "../useProyectoFormState";

type Props = { form: ProyectoFormApi; isAdmin: boolean };

export function ProyectoEquiposTab({ form, isAdmin }: Props) {
  const {
    presupuestoCargado,
    cotizaciones,
    equipos,
    equiposPorCotizacion,
    updateEquipo,
    setModeloPickerLineaId,
    handleRestaurarModeloOriginal,
  } = form;

  return (
    <>
      <ProyectoEquiposSection
        presupuestoCargado={presupuestoCargado}
        isAdmin={isAdmin}
        cotizaciones={cotizaciones}
        equipos={equipos}
        equiposPorCotizacion={equiposPorCotizacion}
        onUpdateEquipo={updateEquipo}
        onCambiarModelo={setModeloPickerLineaId}
        onRestaurarModelo={handleRestaurarModeloOriginal}
      />

      <SectionCard
        id="proyecto-sec-presupuesto"
        index={1}
        title="Presupuesto"
        icon={<ListChecks />}
        hint="Partidas de cada cotización, sin precios."
        flush
      >
        {!presupuestoCargado ? (
          <div className="p-4 sm:p-5">
            <p className={`${emptyPanel} py-8! text-[14px] text-[#6E6E77] dark:text-[#8EA0B8]`} role="status">
              Vincula cotizaciones en el paso General para ver sus partidas.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]">
            {cotizaciones.map((bloque, i) => (
              <details key={bloque.vinculoId} className="group/det" open={i === 0 && cotizaciones.length <= 2}>
                <summary
                  className={`flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 hover:bg-[#FAFAFA] dark:hover:bg-white/[0.02] sm:px-5 [&::-webkit-details-marker]:hidden ${focusRing}`}
                >
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[#F4F4F5] text-[12px] font-semibold tabular-nums text-[#3F3F46] dark:bg-[#1B2539] dark:text-[#D6DEEA]">
                    {bloque.orden}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                        {displayCotizacionFolio(bloque.cotizacion.folio, bloque.cotizacion.origen)}
                      </span>
                      <span className={origenChip[bloque.cotizacion.origen]}>
                        {bloque.cotizacion.origen === "digitalflow" ? "DigitalFlow" : "SICAR"}
                      </span>
                    </span>
                  </span>
                  <span className={metaChip}>
                    {bloque.lineas.length} {bloque.lineas.length === 1 ? "partida" : "partidas"}
                  </span>
                  <ChevronDown
                    className="size-4 shrink-0 text-[#A1A1AA] transition-transform duration-200 group-open/det:rotate-180 motion-reduce:transition-none"
                    aria-hidden
                  />
                </summary>
                {bloque.lineas.length === 0 ? (
                  <p className="px-5 pb-4 text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">Esta cotización no tiene partidas.</p>
                ) : (
                  <ul className="cot-fade space-y-1 px-3 pb-3 sm:px-4">
                    {bloque.lineas.map((linea) => (
                      <li
                        key={linea.id}
                        className="flex items-start gap-3 rounded-[12px] px-2 py-2 hover:bg-[#FAFAFA] dark:hover:bg-white/[0.02]"
                      >
                        <ProyectoProductoThumb src={linea.imagenUrl} alt={linea.descripcion} size="sm" className="mt-0.5" />
                        <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                          {linea.categoria ? (
                            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#1B5CFF] dark:text-[#7EA0FF]">
                              {linea.categoria}
                            </p>
                          ) : null}
                          <p className="text-[14px] font-medium leading-snug text-[#09090B] dark:text-[#F8FAFC]">
                            {linea.descripcion}
                          </p>
                          {linea.detalle ? (
                            <p className="mt-0.5 text-[12px] text-[#71717A] dark:text-[#8EA0B8]">{linea.detalle}</p>
                          ) : null}
                        </div>
                        <span className="shrink-0 pt-0.5 text-right text-[13px] tabular-nums text-[#3F3F46] dark:text-[#D6DEEA]">
                          <span className="font-semibold">{linea.cantidad}</span>{" "}
                          <span className="text-[12px] uppercase text-[#71717A] dark:text-[#8EA0B8]">{linea.unidad}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
