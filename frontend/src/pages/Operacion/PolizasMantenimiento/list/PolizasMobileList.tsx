import { memo } from "react";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { formatPolizaFecha, nextVisitIso } from "./polizaDemoData";
import { EstadoPolizaBadge } from "./EstadoPolizaBadge";
import { PolizaPdfGlyph } from "./PolizaPdfGlyph";
import { PolizaStatusSectionHeader } from "./PolizaStatusSectionHeader";
import type { PolizaStatusSection } from "./polizaStatusSections";
import type { PolizaRow } from "./polizaListTypes";

const actionBtnClass =
  "inline-flex h-10 w-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-[#E7E7EA] bg-white text-[#52525B] transition hover:border-[#1B5CFF] hover:text-[#1B5CFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/35 dark:border-[#273244] dark:bg-[#111827] dark:text-[#B7C1D1] dark:hover:border-[#4B7CFF] dark:hover:text-[#4B7CFF]";

type Props = {
  sections: PolizaStatusSection[];
  hasSearch: boolean;
  loading?: boolean;
  onEdit: (row: PolizaRow) => void;
  onPdf: (row: PolizaRow) => void;
  onDelete?: (row: PolizaRow) => void;
};

const PolizaCard = memo(function PolizaCard({
  row,
  onEdit,
  onPdf,
  onDelete,
}: {
  row: PolizaRow;
  onEdit: (row: PolizaRow) => void;
  onPdf: (row: PolizaRow) => void;
  onDelete?: (row: PolizaRow) => void;
}) {
  const proxima = nextVisitIso(row);
  return (
    <li className="rounded-2xl border border-[#E7E7EA] bg-white p-4 shadow-sm dark:border-[#273244] dark:bg-[#111827]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-md border border-[#BBD0FF]/70 bg-[rgba(27,92,255,0.08)] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#1B5CFF] dark:border-[#4B7CFF]/35 dark:bg-[rgba(75,124,255,0.14)] dark:text-[#4B7CFF]">
              {row.folio}
            </span>
            <EstadoPolizaBadge estado={row.estado} />
          </div>
          <p className="mt-2 truncate text-sm font-semibold text-[#09090B] dark:text-white" title={row.cliente}>
            {row.cliente}
          </p>
          <p className="mt-0.5 text-xs text-[#52525B] dark:text-[#8EA0B8]">{row.tipoLabel}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className={`${actionBtnClass} hover:border-red-400 hover:text-red-600`}
            onClick={() => onPdf(row)}
            aria-label={`Ver PDF de la póliza ${row.folio}`}
            title="Ver PDF"
          >
            <PolizaPdfGlyph className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={actionBtnClass}
            onClick={() => onEdit(row)}
            aria-label={`Ver póliza ${row.folio}`}
            title="Ver póliza"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          {onDelete ? (
            <button
              type="button"
              className={`${actionBtnClass} hover:border-rose-400 hover:text-rose-600 dark:hover:border-rose-500/60 dark:hover:text-rose-400`}
              onClick={() => onDelete(row)}
              aria-label={`Eliminar póliza ${row.folio}`}
              title="Eliminar"
            >
              <TrashBinIcon className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[#E7E7EA] pt-3 text-[11px] dark:border-[#273244]">
        <div>
          <dt className="text-[#6E6E77] dark:text-[#8EA0B8]">Cotización</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-[#09090B] dark:text-white">{row.cotizacionFolio}</dd>
        </div>
        <div>
          <dt className="text-[#6E6E77] dark:text-[#8EA0B8]">Próxima visita</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-[#09090B] dark:text-white">
            {formatPolizaFecha(proxima)}
          </dd>
        </div>
      </dl>
    </li>
  );
});

export const PolizasMobileList = memo(function PolizasMobileList({
  sections,
  hasSearch,
  loading = false,
  onEdit,
  onPdf,
  onDelete,
}: Props) {
  if (sections.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[#6E6E77] dark:text-[#8EA0B8]" role="status">
        {hasSearch
          ? "No hay pólizas que coincidan con la búsqueda."
          : loading
            ? "Cargando pólizas…"
            : "Aún no hay pólizas registradas."}
      </p>
    );
  }

  return (
    <div className="space-y-5" aria-label="Listado de pólizas">
      {sections.map((section) => {
        const headingId = `polizas-mobile-${section.key}`;
        return (
          <section key={section.key} aria-labelledby={headingId}>
            <PolizaStatusSectionHeader
              estado={section.key}
              label={section.label}
              count={section.rows.length}
              headingId={headingId}
              as="h2"
            />
            <ul className="mt-2.5 space-y-2.5">
              {section.rows.map((row) => (
                <PolizaCard key={row.id} row={row} onEdit={onEdit} onPdf={onPdf} onDelete={onDelete} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
});
