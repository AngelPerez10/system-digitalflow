import { MailIcon, PencilIcon, TrashBinIcon } from "@/icons";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  erpRowActionBarClass,
  erpRowActionBtnClass,
  erpTableRowHoverClass,
} from "../../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import {
  displayCotizacionFolio,
  displayProyectoFolio,
  estadoProyectoBadgeClass,
  estadoProyectoLabel,
} from "../shared/proyectoFormUtils";
import { formatProyectoFecha, proyectoOrigenBadgeClass } from "../shared/proyectoPageStyles";
import type { ProyectoRow } from "../shared/proyectoTypes";

type Props = {
  row: ProyectoRow;
  canEdit: boolean;
  canDelete: boolean;
  onPdf: (row: ProyectoRow) => void;
  onEnviarPdf: (row: ProyectoRow) => void;
  onEdit: (row: ProyectoRow) => void;
  onDelete: (row: ProyectoRow) => void;
  headingId?: string;
};

function teamFromRow(row: ProyectoRow) {
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
  const tecnicoNombre = responsable?.nombre?.trim() || "";
  const tecnicoExtra = tecnicos.length > 1 ? ` +${tecnicos.length - 1}` : "";
  const auxiliarNombre = auxiliares[0]?.nombre?.trim() || "";
  const auxiliarExtra = auxiliares.length > 1 ? ` +${auxiliares.length - 1}` : "";
  const tecnicoTitle = tecnicos
    .map((t) => {
      const n = t.nombre?.trim() || `#${t.id}`;
      return "responsable" in t && t.responsable ? `${n} (resp.)` : n;
    })
    .join(", ");
  const auxiliarTitle = auxiliares.map((a) => a.nombre?.trim() || `#${a.id}`).join(", ");
  return { tecnicoNombre, tecnicoExtra, auxiliarNombre, auxiliarExtra, tecnicoTitle, auxiliarTitle };
}

const folioChipClass =
  "inline-flex items-center rounded-md border border-[#BBD0FF]/70 bg-[rgba(27,92,255,0.08)] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#1B5CFF] dark:border-[#4B7CFF]/35 dark:bg-[rgba(75,124,255,0.14)] dark:text-[#4B7CFF] sm:text-[11px]";

export function ProyectosListTableRow({
  row,
  canEdit,
  canDelete,
  onPdf,
  onEnviarPdf,
  onEdit,
  onDelete,
  headingId,
}: Props) {
  const {
    tecnicoNombre,
    tecnicoExtra,
    auxiliarNombre,
    auxiliarExtra,
    tecnicoTitle,
    auxiliarTitle,
  } = teamFromRow(row);

  return (
    <TableRow className={erpTableRowHoverClass} aria-labelledby={headingId}>
      <TableCell className="whitespace-nowrap px-3 py-2 align-middle">
        <span className={folioChipClass}>{displayProyectoFolio(row.folio)}</span>
      </TableCell>
      <TableCell className="px-3 py-2 align-top">
        <span
          className="block truncate font-medium text-[#09090B] dark:text-white sm:text-[12px]"
          title={row.cliente}
        >
          {row.cliente}
        </span>
      </TableCell>
      <TableCell className="px-3 py-2 align-top">
        {tecnicoNombre ? (
          <span className="block truncate text-[#09090B] dark:text-white" title={tecnicoTitle}>
            {tecnicoNombre}
            {tecnicoExtra ? <span className="text-[#6E6E77] dark:text-[#8EA0B8]">{tecnicoExtra}</span> : null}
          </span>
        ) : (
          <span className="text-[#A1A1AA]">—</span>
        )}
      </TableCell>
      <TableCell className="px-3 py-2 align-top">
        {auxiliarNombre ? (
          <span className="block truncate text-[#09090B] dark:text-white" title={auxiliarTitle}>
            {auxiliarNombre}
            {auxiliarExtra ? <span className="text-[#6E6E77] dark:text-[#8EA0B8]">{auxiliarExtra}</span> : null}
          </span>
        ) : (
          <span className="text-[#A1A1AA]">—</span>
        )}
      </TableCell>
      <TableCell className="px-3 py-2 align-top">
        {row.cotizacionFolio === "—" ? (
          <span className="text-[#A1A1AA]">—</span>
        ) : (
          <div className="leading-tight">
            <span className={proyectoOrigenBadgeClass(row.cotizacionOrigen)}>
              {row.cotizacionOrigen === "digitalflow" ? "DigitalFlow" : "SICAR"}
            </span>
            <div className="mt-1 tabular-nums text-[#09090B] dark:text-white">
              {row.cotizacionesCount > 1
                ? row.cotizacionFolio
                : displayCotizacionFolio(row.cotizacionFolio, row.cotizacionOrigen)}
            </div>
            {row.cotizacionesCount > 1 ? (
              <div className="text-[11px] text-[#6E6E77] dark:text-[#8EA0B8]">
                {row.cotizacionesCount} vinculadas
              </div>
            ) : null}
          </div>
        )}
      </TableCell>
      <TableCell className="px-3 py-2 align-top">
        {row.equiposTotal === 0 ? (
          <span className="text-[#A1A1AA]">—</span>
        ) : (
          <div className="leading-tight">
            <div className="tabular-nums text-[#09090B] dark:text-white">
              {row.equiposEntregados}/{row.equiposTotal} entregados
            </div>
            <div className="text-[11px] text-[#6E6E77] dark:text-[#8EA0B8]">
              {row.equiposInstalados} instalados
            </div>
          </div>
        )}
      </TableCell>
      <TableCell className="px-3 py-2 text-center align-middle">
        <span className={estadoProyectoBadgeClass(row.estado)}>
          {estadoProyectoLabel(row.estado)}
        </span>
      </TableCell>
      <TableCell className="whitespace-nowrap px-3 py-2 align-middle tabular-nums text-[#52525B] dark:text-[#B7C1D1]">
        {formatProyectoFecha(row.fecha)}
      </TableCell>
      <TableCell className="px-3 py-2 text-center align-middle">
        <div className={erpRowActionBarClass}>
          <button
            type="button"
            className={`${erpRowActionBtnClass} hover:border-red-400 hover:text-red-600`}
            onClick={() => onPdf(row)}
            aria-label={`Ver PDF del proyecto ${displayProyectoFolio(row.folio)}`}
            title="Ver PDF"
          >
            <svg className="h-4 w-4" viewBox="0 0 512 512" fill="currentColor" aria-hidden>
              <path d="M378.413,0H208.297h-13.182L185.8,9.314L57.02,138.102l-9.314,9.314v13.176v265.514 c0,47.36,38.528,85.895,85.895,85.895h244.811c47.353,0,85.881-38.535,85.881-85.895V85.896C464.294,38.528,425.766,0,378.413,0z M432.497,426.105c0,29.877-24.214,54.091-54.084,54.091H133.602c-29.884,0-54.098-24.214-54.098-54.091V160.591h83.716 c24.885,0,45.077-20.178,45.077-45.07V31.804h170.116c29.87,0,54.084,24.214,54.084,54.092V426.105Z" />
              <path d="M171.947,252.785h-28.529c-5.432,0-8.686,3.533-8.686,8.825v73.754c0,6.388,4.204,10.599,10.041,10.599 c5.711,0,9.914-4.21,9.914-10.599v-22.406c0-0.545,0.279-0.817,0.824-0.817h16.436c20.095,0,32.188-12.226,32.188-29.612 C204.136,264.871,192.182,252.785,171.947,252.785z M170.719,294.888h-15.208c-0.545,0-0.824-0.272-0.824-0.81v-23.23 c0-0.545,0.279-0.816,0.824-0.816h15.208c8.42,0,13.447,5.027,13.447,12.498C184.167,290,179.139,294.888,170.719,294.888z" />
              <path d="M250.191,252.785h-21.868c-5.432,0-8.686,3.533-8.686,8.825v74.843c0,5.3,3.253,8.693,8.686,8.693h21.868 c19.69,0,31.923-6.249,36.81-21.324c1.76-5.3,2.723-11.681,2.723-24.857c0-13.175-0.964-19.557-2.723-24.856 C282.113,259.034,269.881,252.785,250.191,252.785z M267.856,316.896c-2.318,7.331-8.965,10.459-18.21,10.459h-9.23 c-0.545,0-0.824-0.272-0.824-0.816v-55.146c0-0.545,0.279-0.817,0.824-0.817h9.23c9.245,0,15.892,3.128,18.21,10.46 c0.95,3.128,1.62,8.56,1.62,17.93C269.476,308.336,268.805,313.768,267.856,316.896z" />
              <path d="M361.167,252.785h-44.812c-5.432,0-8.7,3.533-8.7,8.825v73.754c0,6.388,4.218,10.599,10.055,10.599 c5.697,0,9.914-4.21,9.914-10.599v-26.351c0-0.538,0.265-0.81,0.81-0.81h26.086c5.837,0,9.23-3.532,9.23-8.56 c0-5.028-3.393-8.553-9.23-8.553h-26.086c-0.545,0-0.81-0.272-0.81-0.817v-19.425c0-0.545,0.265-0.816,0.81-0.816h32.733 c5.572,0,9.245-3.666,9.245-8.553C370.411,256.45,366.738,252.785,361.167,252.785z" />
            </svg>
          </button>
          <button
            type="button"
            className={`${erpRowActionBtnClass} hover:border-sky-400 hover:text-sky-600`}
            onClick={() => onEnviarPdf(row)}
            aria-label={`Enviar PDF del proyecto ${displayProyectoFolio(row.folio)} por correo`}
            title="Enviar PDF por correo"
          >
            <MailIcon className="h-4 w-4" />
          </button>
          {canEdit ? (
            <button
              type="button"
              className={erpRowActionBtnClass}
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
              className={erpRowActionBtnClass}
              onClick={() => onDelete(row)}
              aria-label={`Eliminar proyecto ${displayProyectoFolio(row.folio)}`}
              title="Eliminar"
            >
              <TrashBinIcon className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}
