import { PencilIcon } from "@/icons";
import {
  estadoPolizaBadgeClass,
  estadoPolizaLabel,
  formatPolizaFecha,
  nextVisitIso,
} from "./polizaDemoData";
import { PolizaPdfGlyph } from "./PolizaPdfGlyph";
import type { PolizaRow } from "./polizaListTypes";

const actionBtnClass =
  "inline-flex h-10 w-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-[#e2d9ca] bg-white text-[#57534e] transition hover:border-[#ff801f] hover:text-[#ea580c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/35 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb]";

type Props = {
  rows: PolizaRow[];
  hasSearch: boolean;
  loading?: boolean;
  onEdit: (row: PolizaRow) => void;
  onPdf: (row: PolizaRow) => void;
};

export function PolizasMobileList({ rows, hasSearch, loading = false, onEdit, onPdf }: Props) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[#78716c] dark:text-[#8ea0b8] md:hidden" role="status">
        {hasSearch
          ? "No hay pólizas que coincidan con la búsqueda."
          : loading
            ? "Cargando pólizas…"
            : "Aún no hay pólizas registradas."}
      </p>
    );
  }

  return (
    <ul className="space-y-3 md:hidden" aria-label="Listado de pólizas">
      {rows.map((row) => {
        const proxima = nextVisitIso(row);
        return (
          <li
            key={row.id}
            className="rounded-2xl border border-[#e7ded0] bg-[#fffdfa] p-4 shadow-[0_12px_32px_-24px_rgba(28,25,23,0.25)] dark:border-[#273244] dark:bg-[#111827]/80"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-md border border-[#e2d9ca] bg-[#fcfaf6] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#1c1917] dark:border-[#334155] dark:bg-[#0f172a] dark:text-white">
                    {row.folio}
                  </span>
                  <span className={estadoPolizaBadgeClass(row.estado)}>{estadoPolizaLabel(row.estado)}</span>
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-[#1c1917] dark:text-white" title={row.cliente}>
                  {row.cliente}
                </p>
                <p className="mt-0.5 text-xs text-[#78716c] dark:text-[#8ea0b8]">{row.tipoLabel}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className={`${actionBtnClass} hover:border-red-400 hover:text-red-600`}
                  onClick={() => onPdf(row)}
                  aria-label={`Ver plantilla PDF de la póliza ${row.folio}`}
                  title="Ver plantilla PDF"
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
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[#e7ded0] pt-3 text-[11px] dark:border-[#273244]">
              <div>
                <dt className="text-[#78716c] dark:text-[#8ea0b8]">Cotización</dt>
                <dd className="mt-0.5 font-medium tabular-nums text-[#1c1917] dark:text-white">
                  {row.cotizacionFolio}
                </dd>
              </div>
              <div>
                <dt className="text-[#78716c] dark:text-[#8ea0b8]">Próxima visita</dt>
                <dd className="mt-0.5 font-medium tabular-nums text-[#1c1917] dark:text-white">
                  {formatPolizaFecha(proxima)}
                </dd>
              </div>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}
