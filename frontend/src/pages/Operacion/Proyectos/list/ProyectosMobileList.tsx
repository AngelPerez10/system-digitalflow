import { MailIcon, PencilIcon, TrashBinIcon } from "@/icons";
import {
  displayCotizacionFolio,
  displayProyectoFolio,
  estadoProyectoBadgeClass,
  estadoProyectoLabel,
} from "../shared/proyectoFormUtils";
import { formatProyectoFecha, proyectoOrigenBadgeClass } from "../shared/proyectoPageStyles";
import type { ProyectoStatusSection } from "../shared/proyectoStatusSections";
import type { ProyectoRow } from "../shared/proyectoTypes";
import { ProyectoStatusSectionHeader } from "./ProyectoStatusSectionHeader";

const actionBtnClass =
  "inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#E7E7EA] bg-white text-[#52525B] transition hover:border-[#1B5CFF] hover:text-[#1B5CFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/35 dark:border-[#273244] dark:bg-[#111827] dark:text-[#B7C1D1] dark:hover:border-[#4B7CFF] dark:hover:text-[#4B7CFF]";

const folioChipClass =
  "inline-flex rounded-md border border-[#BBD0FF]/70 bg-[rgba(27,92,255,0.08)] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#1B5CFF] dark:border-[#4B7CFF]/35 dark:bg-[rgba(75,124,255,0.14)] dark:text-[#4B7CFF]";

function ProyectoPdfGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 512 512" fill="currentColor" aria-hidden>
      <path d="M378.413,0H208.297h-13.182L185.8,9.314L57.02,138.102l-9.314,9.314v13.176v265.514 c0,47.36,38.528,85.895,85.896,85.895h244.811c47.353,0,85.881-38.535,85.881-85.895V85.896C464.294,38.528,425.766,0,378.413,0z M432.497,426.105c0,29.877-24.214,54.091-54.084,54.091H133.602c-29.884,0-54.098-24.214-54.098-54.091V160.591h83.716 c24.885,0,45.077-20.178,45.077-45.07V31.804h170.116c29.87,0,54.084,24.214,54.084,54.092V426.105Z" />
      <path d="M171.947,252.785h-28.529c-5.432,0-8.686,3.533-8.686,8.825v73.754c0,6.388,4.204,10.599,10.041,10.599 c5.711,0,9.914-4.21,9.914-10.599v-22.406c0-0.545,0.279-0.817,0.824-0.817h16.436c20.095,0,32.188-12.226,32.188-29.612 C204.136,264.871,192.182,252.785,171.947,252.785z M170.719,294.888h-15.208c-0.545,0-0.824-0.272-0.824-0.81v-23.23 c0-0.545,0.279-0.816,0.824-0.816h15.208c8.42,0,13.447,5.027,13.447,12.498C184.167,290,179.139,294.888,170.719,294.888z" />
      <path d="M250.191,252.785h-21.868c-5.432,0-8.686,3.533-8.686,8.825v74.843c0,5.3,3.253,8.693,8.686,8.693h21.868 c19.69,0,31.923-6.249,36.81-21.324c1.76-5.3,2.723-11.681,2.723-24.857c0-13.175-0.964-19.557-2.723-24.856 C282.113,259.034,269.881,252.785,250.191,252.785z M267.856,316.896c-2.318,7.331-8.965,10.459-18.21,10.459h-9.23 c-0.545,0-0.824-0.272-0.824-0.816v-55.146c0-0.545,0.279-0.817,0.824-0.817h9.23c9.245,0,15.892,3.128,18.21,10.46 c0.95,3.128,1.62,8.56,1.62,17.93C269.476,308.336,268.805,313.768,267.856,316.896z" />
      <path d="M361.167,252.785h-44.812c-5.432,0-8.7,3.533-8.7,8.825v73.754c0,6.388,4.218,10.599,10.055,10.599 c5.697,0,9.914-4.21,9.914-10.599v-26.351c0-0.538,0.265-0.81,0.81-0.81h26.086c5.837,0,9.23-3.532,9.23-8.56 c0-5.028-3.393-8.553-9.23-8.553h-26.086c-0.545,0-0.81-0.272-0.81-0.817v-19.425c0-0.545,0.265-0.816,0.81-0.816h32.733 c5.572,0,9.245-3.666,9.245-8.553C370.411,256.45,366.738,252.785,361.167,252.785z" />
    </svg>
  );
}

type Props = {
  sections: ProyectoStatusSection[];
  loading?: boolean;
  hasSearch: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (row: ProyectoRow) => void;
  onDelete: (row: ProyectoRow) => void;
  onPdf: (row: ProyectoRow) => void;
  onEnviarPdf: (row: ProyectoRow) => void;
};

function teamLabel(row: ProyectoRow): { tecnico: string; auxiliar: string } {
  const tecnicos = row.draft?.tecnicos?.length
    ? row.draft.tecnicos
    : row.draft?.tecnico?.id != null
      ? [{ ...row.draft.tecnico, responsable: true }]
      : [];
  const auxiliares = row.draft?.auxiliares?.length
    ? row.draft.auxiliares
    : row.draft?.auxiliar?.id != null
      ? [row.draft.auxiliar]
      : [];
  const responsable = tecnicos.find((t) => "responsable" in t && t.responsable) || tecnicos[0];
  const tecnicoBase = responsable?.nombre?.trim() || "";
  const tecnico = tecnicoBase
    ? tecnicoBase + (tecnicos.length > 1 ? ` +${tecnicos.length - 1}` : "")
    : "—";
  const auxiliarBase = auxiliares[0]?.nombre?.trim() || "";
  const auxiliar = auxiliarBase
    ? auxiliarBase + (auxiliares.length > 1 ? ` +${auxiliares.length - 1}` : "")
    : "—";
  return { tecnico, auxiliar };
}

function ProyectoCard({
  row,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onPdf,
  onEnviarPdf,
}: {
  row: ProyectoRow;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (row: ProyectoRow) => void;
  onDelete: (row: ProyectoRow) => void;
  onPdf: (row: ProyectoRow) => void;
  onEnviarPdf: (row: ProyectoRow) => void;
}) {
  const team = teamLabel(row);
  return (
    <li className="min-w-0 rounded-2xl border border-[#E7E7EA] bg-white p-3.5 shadow-sm dark:border-[#273244] dark:bg-[#111827] sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={folioChipClass}>{displayProyectoFolio(row.folio)}</span>
            <span className={estadoProyectoBadgeClass(row.estado)}>
              {estadoProyectoLabel(row.estado)}
            </span>
          </div>
          <p className="mt-2 truncate text-sm font-semibold text-[#09090B] dark:text-white" title={row.cliente}>
            {row.cliente}
          </p>
          <p className="mt-0.5 text-xs text-[#52525B] dark:text-[#8EA0B8]">
            {formatProyectoFecha(row.fecha)}
          </p>
        </div>
        {row.equiposTotal > 0 ? (
          <p className="shrink-0 text-right text-xs font-semibold tabular-nums text-[#09090B] dark:text-white">
            {row.equiposEntregados}/{row.equiposTotal}
            <span className="mt-0.5 block text-[10px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]">
              equipos
            </span>
          </p>
        ) : null}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[#E7E7EA] pt-3 text-[11px] dark:border-[#273244]">
        <div className="min-w-0">
          <dt className="text-[#6E6E77] dark:text-[#8EA0B8]">Técnico</dt>
          <dd className="mt-0.5 truncate font-medium text-[#09090B] dark:text-white">{team.tecnico}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[#6E6E77] dark:text-[#8EA0B8]">Auxiliar</dt>
          <dd className="mt-0.5 truncate font-medium text-[#09090B] dark:text-white">{team.auxiliar}</dd>
        </div>
        <div className="col-span-2 min-w-0">
          <dt className="text-[#6E6E77] dark:text-[#8EA0B8]">Cotización</dt>
          <dd className="mt-0.5 font-medium text-[#09090B] dark:text-white">
            {row.cotizacionFolio === "—" ? (
              "—"
            ) : (
              <>
                <span className={proyectoOrigenBadgeClass(row.cotizacionOrigen)}>
                  {row.cotizacionOrigen === "digitalflow" ? "DF" : "SICAR"}
                </span>
                <span className="ml-1.5 tabular-nums">
                  {row.cotizacionesCount > 1
                    ? row.cotizacionFolio
                    : displayCotizacionFolio(row.cotizacionFolio, row.cotizacionOrigen)}
                </span>
              </>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-[#E7E7EA] pt-3 dark:border-[#273244]">
        <button
          type="button"
          className={`${actionBtnClass} hover:border-red-400 hover:text-red-600`}
          onClick={() => onPdf(row)}
          aria-label={`Ver PDF del proyecto ${displayProyectoFolio(row.folio)}`}
          title="Ver PDF"
        >
          <ProyectoPdfGlyph className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={`${actionBtnClass} hover:border-sky-400 hover:text-sky-600`}
          onClick={() => onEnviarPdf(row)}
          aria-label={`Enviar PDF del proyecto ${displayProyectoFolio(row.folio)} por correo`}
          title="Enviar PDF por correo"
        >
          <MailIcon className="h-4 w-4" />
        </button>
        {canEdit ? (
          <button
            type="button"
            className={actionBtnClass}
            onClick={() => onEdit(row)}
            aria-label={`Editar proyecto ${displayProyectoFolio(row.folio)}`}
            title="Editar"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            className={`${actionBtnClass} hover:border-rose-400 hover:text-rose-600`}
            onClick={() => onDelete(row)}
            aria-label={`Eliminar proyecto ${displayProyectoFolio(row.folio)}`}
            title="Eliminar"
          >
            <TrashBinIcon className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </li>
  );
}

export function ProyectosMobileList({
  sections,
  loading = false,
  hasSearch,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onPdf,
  onEnviarPdf,
}: Props) {
  if (loading) {
    return (
      <p className="py-6 text-center text-sm text-[#6E6E77] dark:text-[#8EA0B8] md:hidden" role="status" aria-live="polite">
        Cargando…
      </p>
    );
  }

  if (sections.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[#6E6E77] dark:text-[#8EA0B8] md:hidden">
        {hasSearch
          ? "No hay proyectos que coincidan con la búsqueda o los filtros."
          : "Aún no hay proyectos registrados."}
      </p>
    );
  }

  return (
    <div className="space-y-5 md:hidden" aria-label="Listado de proyectos">
      {sections.map((section) => {
        const headingId = `proyectos-mobile-${section.key}`;
        return (
          <section key={section.key} aria-labelledby={headingId}>
            <ProyectoStatusSectionHeader
              statusKey={section.key}
              label={section.label}
              count={section.rows.length}
              headingId={headingId}
              as="h2"
            />
            <ul className="mt-2.5 space-y-2.5">
              {section.rows.map((row) => (
                <ProyectoCard
                  key={row.id}
                  row={row}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onPdf={onPdf}
                  onEnviarPdf={onEnviarPdf}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
