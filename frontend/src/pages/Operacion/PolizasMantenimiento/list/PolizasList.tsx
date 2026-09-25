/**
 * Listado de pólizas: tabla en escritorio (≥1024 px) y tarjetas en pantallas
 * menores. Solo se monta una de las dos. Filas con entrada escalonada breve
 * (máx. 10 pasos) y estados de carga / vacío que reservan su espacio.
 */
import { memo, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { FileText, Pencil, SearchX, ShieldCheck, Trash2 } from "lucide-react";
import { polIconBtnClass, polIconBtnDangerClass, polPrimaryBtnClass } from "../shared/polizaStyles";
import EstadoPolizaBadge from "./EstadoPolizaBadge";
import PolizaVisitasTrack from "./PolizaVisitasTrack";
import type { PolizaRow } from "./polizaListTypes";

function useIsDesktop() {
  const query = "(min-width: 1024px)";
  const [desktop, setDesktop] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setDesktop(mq.matches);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return desktop;
}

type Props = {
  rows: PolizaRow[];
  loading: boolean;
  /** Hay búsqueda o filtro: el vacío es «sin resultados», no «sin pólizas». */
  filtered: boolean;
  onEdit: (row: PolizaRow) => void;
  onPdf: (row: PolizaRow) => void;
  onDelete?: (row: PolizaRow) => void;
  onNew: () => void;
  onClearFilters: () => void;
};

const stagger = (i: number) => ({ "--cot-i": Math.min(i, 10) }) as CSSProperties;

function RowActions({
  row,
  onEdit,
  onPdf,
  onDelete,
}: Pick<Props, "onEdit" | "onPdf" | "onDelete"> & { row: PolizaRow }) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      <button type="button" className={polIconBtnClass} onClick={() => onPdf(row)} aria-label={`Ver PDF de ${row.folio}`} title="Ver PDF">
        <FileText className="size-[18px]" aria-hidden />
      </button>
      <button type="button" className={polIconBtnClass} onClick={() => onEdit(row)} aria-label={`Editar ${row.folio}`} title="Editar">
        <Pencil className="size-[18px]" aria-hidden />
      </button>
      {onDelete ? (
        <button
          type="button"
          className={polIconBtnDangerClass}
          onClick={() => onDelete(row)}
          aria-label={`Eliminar ${row.folio}`}
          title="Eliminar"
        >
          <Trash2 className="size-[18px]" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action: ReactNode }) {
  return (
    <div className="cot-fade flex flex-col items-center px-6 py-14 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-[14px] bg-[#F4F4F5] text-[#6E6E77] dark:bg-[#1B2539] dark:text-[#8EA0B8]">
        {icon}
      </span>
      <p className="mt-4 text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{title}</p>
      <p className="mt-1 max-w-sm text-[13.5px] leading-relaxed text-[#6E6E77] dark:text-[#8EA0B8]">{body}</p>
      <div className="mt-5">{action}</div>
    </div>
  );
}

function SkeletonRows({ desktop }: { desktop: boolean }) {
  return (
    <div aria-hidden className={desktop ? "divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]" : "grid gap-3 p-3 sm:grid-cols-2"}>
      {Array.from({ length: desktop ? 6 : 4 }, (_, i) => (
        <div
          key={i}
          className={desktop ? "flex items-center gap-6 px-5 py-4" : "space-y-3 rounded-[16px] border border-[#E7E7EA] p-4 dark:border-[#273244]"}
        >
          <span className="block h-4 w-24 animate-pulse rounded bg-[#F4F4F5] dark:bg-[#1B2539]" />
          <span className="block h-4 flex-1 animate-pulse rounded bg-[#F4F4F5] dark:bg-[#1B2539]" />
          <span className="block h-4 w-32 animate-pulse rounded bg-[#F4F4F5] dark:bg-[#1B2539]" />
          <span className="block h-6 w-24 animate-pulse rounded-full bg-[#F4F4F5] dark:bg-[#1B2539]" />
        </div>
      ))}
    </div>
  );
}

function PolizasList({ rows, loading, filtered, onEdit, onPdf, onDelete, onNew, onClearFilters }: Props) {
  const desktop = useIsDesktop();

  if (loading) {
    return (
      <>
        <p className="sr-only" role="status">
          Cargando pólizas
        </p>
        <SkeletonRows desktop={desktop} />
      </>
    );
  }

  if (rows.length === 0) {
    return filtered ? (
      <EmptyState
        icon={<SearchX className="size-6" aria-hidden />}
        title="Sin resultados"
        body="Ninguna póliza coincide con la búsqueda o el filtro de estado."
        action={
          <button type="button" onClick={onClearFilters} className="text-[14px] font-semibold text-[#1244D1] underline-offset-2 hover:underline dark:text-[#9BB6FF]">
            Limpiar búsqueda y filtros
          </button>
        }
      />
    ) : (
      <EmptyState
        icon={<ShieldCheck className="size-6" aria-hidden />}
        title="Aún no hay pólizas"
        body="Registra la primera póliza: cliente, cotización y hasta 4 visitas al año."
        action={
          <button type="button" onClick={onNew} className={polPrimaryBtnClass}>
            Nueva póliza
          </button>
        }
      />
    );
  }

  if (!desktop) {
    return (
      <ul className="grid gap-3 p-3 sm:grid-cols-2">
        {rows.map((row, i) => (
          <li
            key={row.id}
            className="cot-rise flex flex-col rounded-[16px] border border-[#E7E7EA] bg-white p-4 dark:border-[#273244] dark:bg-[#111827]"
            style={stagger(i)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[12.5px] font-semibold text-[#1244D1] dark:text-[#9BB6FF]">{row.folio}</p>
                <p className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug text-[#09090B] dark:text-[#F8FAFC]">
                  {row.cliente}
                </p>
              </div>
              <EstadoPolizaBadge estado={row.estado} />
            </div>
            <p className="mt-1.5 line-clamp-1 text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">
              {[row.servicioTipo || row.tipoLabel, row.equiposAtendidos].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-3 rounded-[12px] bg-[#FAFAFA] px-3 py-2.5 dark:bg-[#1B2539]">
              <PolizaVisitasTrack visitas={row.visitas} />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="font-mono text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">{row.cotizacionFolio}</span>
              <RowActions row={row} onEdit={onEdit} onPdf={onPdf} onDelete={onDelete} />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  const th = "px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6E6E77] dark:text-[#8EA0B8]";
  return (
    <table className="w-full table-fixed border-collapse text-[14px]">
      <colgroup>
        <col className="w-[9.5rem]" />
        <col />
        <col className="w-[22%]" />
        <col className="w-[13rem]" />
        <col className="w-[9rem]" />
        <col className="w-[8.5rem]" />
      </colgroup>
      <thead className="border-b border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#0F172A]/60">
        <tr>
          <th scope="col" className={th}>Póliza</th>
          <th scope="col" className={th}>Cliente</th>
          <th scope="col" className={th}>Servicio</th>
          <th scope="col" className={th}>Visitas</th>
          <th scope="col" className={th}>Estado</th>
          <th scope="col" className={`${th} text-right`}>
            <span className="sr-only">Acciones</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]">
        {rows.map((row, i) => (
          <tr key={row.id} className="cot-rise transition-colors hover:bg-[#FAFAFB] dark:hover:bg-white/[0.02]" style={stagger(i)}>
            <td className="px-5 py-3.5 align-middle">
              <p className="font-mono text-[13px] font-semibold text-[#1244D1] dark:text-[#9BB6FF]">{row.folio}</p>
              <p className="mt-0.5 font-mono text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">{row.cotizacionFolio}</p>
            </td>
            <td className="px-5 py-3.5 align-middle">
              <p className="truncate font-medium text-[#09090B] dark:text-[#F8FAFC]" title={row.cliente}>
                {row.cliente}
              </p>
              <p className="mt-0.5 truncate text-[12.5px] text-[#6E6E77] dark:text-[#8EA0B8]">{row.tipoLabel}</p>
            </td>
            <td className="px-5 py-3.5 align-middle">
              <p className="truncate text-[#3F3F46] dark:text-[#CBD5E1]" title={row.servicioTipo || undefined}>
                {row.servicioTipo || "—"}
              </p>
              <p className="mt-0.5 truncate text-[12.5px] text-[#6E6E77] dark:text-[#8EA0B8]" title={row.equiposAtendidos || undefined}>
                {row.equiposAtendidos || "—"}
              </p>
            </td>
            <td className="px-5 py-3.5 align-middle">
              <PolizaVisitasTrack visitas={row.visitas} />
            </td>
            <td className="px-5 py-3.5 align-middle">
              <EstadoPolizaBadge estado={row.estado} />
            </td>
            <td className="px-3 py-3.5 align-middle">
              <RowActions row={row} onEdit={onEdit} onPdf={onPdf} onDelete={onDelete} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default memo(PolizasList);
