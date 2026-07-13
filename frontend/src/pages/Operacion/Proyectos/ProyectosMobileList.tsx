import { PencilIcon } from "@/icons";
import { erpMobileCardClass } from "../OrdenesTrabajo/ordenTrabajoStyles";
import {
  estadoProyectoBadgeClass,
  estadoProyectoLabel,
} from "./proyectoFormUtils";
import { formatProyectoFecha, proyectoOrigenBadgeClass } from "./proyectoPageStyles";
import type { ProyectoRow } from "./proyectoTypes";

const mobileActionBtnClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2d9ca] bg-white text-[#57534e] transition hover:border-[#ff801f] hover:text-[#ea580c] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:hover:border-[#ff801f]";

type Props = {
  rows: ProyectoRow[];
  hasSearch: boolean;
  canEdit: boolean;
  onEdit: (row: ProyectoRow) => void;
};

export function ProyectosMobileList({ rows, hasSearch, canEdit, onEdit }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#e7ded0] bg-[#fcfaf6]/50 px-4 py-10 text-center text-sm text-[#78716c] dark:border-[#334155] dark:bg-[#0f172a]/30 dark:text-[#8ea0b8] md:hidden">
        {hasSearch
          ? "No hay proyectos que coincidan con la búsqueda."
          : "Aún no hay proyectos registrados."}
      </div>
    );
  }

  return (
    <ul className="space-y-3 md:hidden" aria-label="Listado de proyectos">
      {rows.map((row) => (
        <li key={row.id}>
          <article className={erpMobileCardClass}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-md border border-[#e2d9ca] bg-[#fcfaf6] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#1c1917] dark:border-[#334155] dark:bg-[#0f172a] dark:text-white">
                    {row.folio}
                  </span>
                  <span className={estadoProyectoBadgeClass(row.estado)}>
                    {estadoProyectoLabel(row.estado)}
                  </span>
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-gray-900 dark:text-white" title={row.cliente}>
                  {row.cliente}
                </p>
              </div>
              {canEdit ? (
                <button
                  type="button"
                  className={mobileActionBtnClass}
                  onClick={() => onEdit(row)}
                  aria-label={`Editar proyecto ${row.folio}`}
                  title="Editar"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
              <div>
                <dt className="text-[#78716c] dark:text-[#8ea0b8]">Cotización</dt>
                <dd className="mt-0.5 font-medium text-gray-900 dark:text-white">
                  {row.cotizacionFolio === "—" ? (
                    "—"
                  ) : (
                    <>
                      <span className={proyectoOrigenBadgeClass(row.cotizacionOrigen)}>
                        {row.cotizacionOrigen === "digitalflow" ? "DF" : "SICAR"}
                      </span>
                      <span className="ml-1 tabular-nums">#{row.cotizacionFolio}</span>
                    </>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[#78716c] dark:text-[#8ea0b8]">Fecha</dt>
                <dd className="mt-0.5 tabular-nums text-gray-900 dark:text-white">{formatProyectoFecha(row.fecha)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[#78716c] dark:text-[#8ea0b8]">Equipos</dt>
                <dd className="mt-0.5 text-gray-900 dark:text-white">
                  {row.equiposTotal === 0
                    ? "—"
                    : `${row.equiposEntregados}/${row.equiposTotal} entregados · ${row.equiposInstalados} instalados`}
                </dd>
              </div>
            </dl>
          </article>
        </li>
      ))}
    </ul>
  );
}
