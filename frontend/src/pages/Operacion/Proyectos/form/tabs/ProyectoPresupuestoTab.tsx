import { useId } from "react";
import {
  erpChipNeutralClass,
  erpTableHeaderClass,
  erpTableWrapClass,
} from "@/layout/erpPageStyles";
import { displayCotizacionFolio } from "../../shared/proyectoFormUtils";
import {
  proyectoEmptyPanelClass,
  proyectoOrigenBadgeClass,
} from "../../shared/proyectoPageStyles";
import type { ProyectoCotizacionBloque, ProyectoEquipoLinea } from "../../shared/proyectoTypes";
import { ProyectoEquiposSection } from "../fields/ProyectoEquiposSection";
import { ProyectoProductoThumb } from "../fields/ProyectoProductoThumb";
import { ProyectoFormSection, proyectoSectionIconClass } from "../ProyectoFormSection";

export type ProyectoPresupuestoTabProps = {
  panelId: string;
  labelledBy: string;
  presupuestoCargado: boolean;
  cotizaciones: ProyectoCotizacionBloque[];
  isAdmin: boolean;
  assignedTechnicianLocked?: boolean;
  equipos: ProyectoEquipoLinea[];
  equiposPorCotizacion: Map<string, ProyectoEquipoLinea[]>;
  onUpdateEquipo: (lineaId: string, patch: Partial<ProyectoEquipoLinea>) => void;
  onCambiarModelo: (lineaId: string) => void;
  onRestaurarModelo: (eq: ProyectoEquipoLinea) => void;
};

const iconDoc = (
  <svg className={proyectoSectionIconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const iconBox = (
  <svg className={proyectoSectionIconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function ProyectoPresupuestoTab({
  panelId,
  labelledBy,
  presupuestoCargado,
  cotizaciones,
  isAdmin,
  assignedTechnicianLocked = false,
  equipos,
  equiposPorCotizacion,
  onUpdateEquipo,
  onCambiarModelo,
  onRestaurarModelo,
}: ProyectoPresupuestoTabProps) {
  const presupuestoHintId = useId();

  return (
    <div id={panelId} role="tabpanel" aria-labelledby={labelledBy} className="space-y-5">
      <ProyectoFormSection
        titleId="proyecto-sec-presupuesto"
        eyebrow="Paso 4"
        title="Presupuesto por cotización"
        hint="Cada cotización mantiene sus partidas por separado — sin precios."
        icon={iconDoc}
        actions={
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${erpChipNeutralClass}`}>
            {cotizaciones.length
              ? `${cotizaciones.length} ${cotizaciones.length === 1 ? "sección" : "secciones"}`
              : "Sin precios"}
          </span>
        }
      >
        <p id={presupuestoHintId} className="sr-only">
          Solo descripción, cantidad y unidad, agrupadas por cotización.
        </p>

        {!presupuestoCargado ? (
          <div className={proyectoEmptyPanelClass} role="status">
            Carga una o más cotizaciones en la pestaña «Cliente».
          </div>
        ) : (
          <div className="space-y-5">
            {cotizaciones.map((bloque) => (
              <section
                key={bloque.vinculoId}
                className="overflow-hidden rounded-xl border border-[#e7ded0] dark:border-[#334155]"
                aria-labelledby={`proyecto-presupuesto-cot-${bloque.vinculoId}`}
              >
                <header className="flex flex-wrap items-center gap-2 border-b border-[#e7ded0] bg-gradient-to-r from-[#fff8f1] to-[#fffdfa] px-3 py-2.5 dark:border-[#334155] dark:from-[#ff801f]/10 dark:to-[#0f172a]">
                  <span
                    className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-[#ff801f]/15 px-2 text-[11px] font-bold tabular-nums text-[#9a3412] dark:bg-[#ff801f]/20 dark:text-[#fdba74]"
                    aria-hidden
                  >
                    {bloque.orden}
                  </span>
                  <h5
                    id={`proyecto-presupuesto-cot-${bloque.vinculoId}`}
                    className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]"
                  >
                    Cotización {bloque.orden}
                  </h5>
                  <span className={proyectoOrigenBadgeClass(bloque.cotizacion.origen)}>
                    {bloque.cotizacion.origen === "digitalflow" ? "DigitalFlow" : "SICAR"}
                  </span>
                  <span className="text-xs font-medium tabular-nums text-[#78716c] dark:text-[#8ea0b8]">
                    {displayCotizacionFolio(bloque.cotizacion.folio, bloque.cotizacion.origen)}
                  </span>
                </header>
                {bloque.lineas.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400" role="status">
                    Esta cotización no tiene partidas.
                  </p>
                ) : (
                  <div className={`${erpTableWrapClass} !rounded-none !border-0 !shadow-none`}>
                    <table className="min-w-full text-left text-sm">
                      <thead className={erpTableHeaderClass}>
                        <tr>
                          <th scope="col" className="px-3 py-2.5 font-semibold">
                            Descripción
                          </th>
                          <th scope="col" className="w-16 px-2 py-2.5 text-center font-semibold">
                            Cant.
                          </th>
                          <th scope="col" className="w-14 px-2 py-2.5 text-center font-semibold">
                            Ud.
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {bloque.lineas.map((linea) => (
                          <tr
                            key={linea.id}
                            className="transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[0.03]"
                          >
                            <td className="px-3 py-2.5">
                              <div className="flex items-start gap-2.5">
                                <ProyectoProductoThumb
                                  src={linea.imagenUrl}
                                  alt={linea.descripcion}
                                  size="sm"
                                  className="mt-0.5 border-[#e7ded0] bg-[#fcfaf6] dark:border-[#334155] dark:bg-[#0f172a]"
                                />
                                <div className="min-w-0">
                                  {linea.categoria ? (
                                    <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-[#ff801f]">
                                      {linea.categoria}
                                    </span>
                                  ) : null}
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {linea.descripcion}
                                  </span>
                                  {linea.detalle ? (
                                    <p className="mt-0.5 text-[11px] text-[#78716c] dark:text-[#8ea0b8]">
                                      {linea.detalle}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-2.5 text-center tabular-nums">
                              {linea.cantidad}
                            </td>
                            <td className="px-2 py-2.5 text-center text-xs uppercase">
                              {linea.unidad}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </ProyectoFormSection>

      <ProyectoEquiposSection
        icon={iconBox}
        presupuestoCargado={presupuestoCargado}
        isAdmin={isAdmin}
        assignedTechnicianLocked={assignedTechnicianLocked}
        cotizaciones={cotizaciones}
        equipos={equipos}
        equiposPorCotizacion={equiposPorCotizacion}
        onUpdateEquipo={onUpdateEquipo}
        onCambiarModelo={onCambiarModelo}
        onRestaurarModelo={onRestaurarModelo}
      />
    </div>
  );
}
