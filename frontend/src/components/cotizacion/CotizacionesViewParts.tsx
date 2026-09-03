import { useMemo } from "react";
import { Link } from "react-router-dom";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { FOLIO_SERIE, formatDocumentFolio } from "@/utils/documentFolio";
import {
  groupCotizacionesByStatus,
  getStatusSectionStyles,
  normalizeCotizacionStatus,
  type CotizacionRow,
  type CotizacionStatusSectionKey,
} from "./cotizacionStatusSections";

export type { CotizacionRow };

function StatusSectionIcon({ statusKey }: { statusKey: CotizacionStatusSectionKey }) {
  if (statusKey === "AUTORIZADA") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (statusKey === "CANCELADA") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (statusKey === "PENDIENTE") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6h12M6 12h12M6 18h12" strokeLinecap="round" />
    </svg>
  );
}

function CotizacionStatusSectionHeader({
  statusKey,
  label,
  count,
  headingId,
  as = "div",
}: {
  statusKey: CotizacionStatusSectionKey;
  label: string;
  count: number;
  headingId: string;
  as?: "div" | "h2";
}) {
  const tone = getStatusSectionStyles(statusKey);
  const TitleTag = as;

  return (
    <div
      className={`relative flex items-center justify-between gap-3 overflow-hidden rounded-xl border px-3 py-2.5 sm:px-3.5 sm:py-3 ${tone.shell}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${tone.accent}`} aria-hidden />
      <div className="flex min-w-0 items-center gap-2.5 pl-1.5 sm:gap-3">
        <span
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black/[0.06] bg-white/80 dark:border-white/10 dark:bg-black/20 ${tone.icon}`}
        >
          <StatusSectionIcon statusKey={statusKey} />
        </span>
        <TitleTag
          id={headingId}
          className={`min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.12em] sm:text-xs ${tone.label}`}
        >
          {label}
        </TitleTag>
      </div>
      <span
        className={`inline-flex min-h-7 shrink-0 items-center rounded-full border px-2.5 text-[11px] font-semibold tabular-nums ${tone.badge}`}
        aria-label={`${count} cotizaciones`}
      >
        {count}
      </span>
    </div>
  );
}

/** LibreICONS / Diemen Design (MIT) — icono de hoja Excel */
function CotizacionExcelIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 14 14"
      fill="currentColor"
      role="img"
      focusable="false"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="m 12.7765,2.551 -4.02,0 0,0.744 1.185,0 0,1.177 -1.185,0 0,0.375 1.185,0 0,1.1785 -1.185,0 0,0.3855 1.185,0 0,1.1145 -1.185,0 0,0.4465 1.185,0 0,1.117 -1.185,0 0,0.4465 1.185,0 0,1.1235 -1.185,0 0,0.8195 4.02,0 c 0.0635,-0.019 0.1165,-0.094 0.159,-0.224 C 12.978,11.1235 13,11.017 13,10.9365 L 13,2.687 C 13,2.623 12.978,2.5845 12.9355,2.571 12.893,2.558 12.84,2.551 12.7765,2.551 Z m -0.5215,8.107 -1.9285,0 0,-1.1225 1.9285,0 0,1.1235 0,-0.001 z m 0,-1.569 -1.9285,0 0,-1.1175 1.9285,0 0,1.1175 z m 0,-1.564 -1.9285,0 0,-1.1095 1.9285,0 0,1.1105 0,-10e-4 z m 0,-1.5 -1.9285,0 0,-1.177 1.9285,0 0,1.1775 0,-5e-4 z m 0,-1.5595 -1.9285,0 0,-1.17 1.9285,0 0,1.1775 0,-0.0075 z M 1,2.3655 1,11.666 8.08,12.8905 8.08,1.1095 1,2.3695 1,2.3655 Z M 5.1965,9.401 C 5.1695,9.328 5.0425,9.018 4.8175,8.4695 4.593,7.9215 4.4575,7.6025 4.418,7.5115 l -0.0125,0 L 3.646,9.319 2.631,9.2505 l 1.204,-2.25 -1.1025,-2.25 1.035,-0.0545 0.684,1.7605 0.0135,0 L 5.2375,4.616 6.307,4.5485 5.0335,6.9835 6.346,9.4675 5.1965,9.4 l 0,10e-4 z" />
    </svg>
  );
}

const normalizePhoneForWhatsapp = (raw?: string) => {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("52")) return digits;
  if (digits.length === 10) return `52${digits}`;
  return digits;
};

const buildWhatsappMessage = (row: CotizacionRow) => {
  const numero = formatDocumentFolio(FOLIO_SERIE.cotizacion, row.idx || row.id);
  const tipo = String(row.tipoTrabajo || "Sin tipo").trim();
  return `Hola estimado(a), espero se encuentre muy bien.

Le doy seguimiento a la cotización No. ${numero} del sistema: "${tipo}", para saber si pudo revisar la propuesta y conocer si le gustaría avanzar con el proyecto.

Quedo a atento para resolver cualquier duda o realizar los ajustes necesarios para adaptar la solución a sus necesidades y presupuesto.

Gracias y saludos!`;
};

const buildWhatsappUrl = (row: CotizacionRow) => {
  const phone = normalizePhoneForWhatsapp(row.clienteTelefono);
  if (!phone) return "";
  const text = encodeURIComponent(buildWhatsappMessage(row));
  return `https://wa.me/${phone}?text=${text}`;
};

export type CotizacionRowActions = {
  onOpenPdf: (id: number) => void;
  onEdit: (r: CotizacionRow) => void;
  onDelete: (r: CotizacionRow) => void;
  onDownloadExcel?: (r: CotizacionRow) => void;
};

export type CotizacionStats = {
  total: string;
  autorizadas: string;
  pendientes: string;
  canceladas: string;
};

export function CotizacionPageHeader({ stats }: { stats?: CotizacionStats }) {
  return (
    <>
      <nav
        className="mb-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]"
        aria-label="Migas de pan"
      >
        <Link
          to="/"
          className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-black/[0.04] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC]"
        >
          Inicio
        </Link>
        <span className="text-[#D3D3D8] dark:text-[#3A4661]" aria-hidden>
          /
        </span>
        <Link
          to="/cotizacion"
          className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-black/[0.04] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC]"
        >
          Ventas
        </Link>
        <span className="text-[#D3D3D8] dark:text-[#3A4661]" aria-hidden>
          /
        </span>
        <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]">Cotizaciones</span>
      </nav>

      <header className="relative overflow-hidden rounded-[24px] bg-[#17235B] px-5 py-6 dark:bg-[#1B2A63] sm:px-8 sm:py-8">
        <div
          className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#E6A23C]/15 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div className="flex min-w-0 items-start gap-4">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">Ventas</p>
              <h1 className="mt-1 text-[26px] font-bold leading-[1.15] tracking-[-0.9px] text-white sm:text-[32px] sm:tracking-[-1.1px]">
                Cotizaciones
              </h1>
              <p className="mt-1.5 max-w-[62ch] text-[15px] leading-[22px] tracking-[-0.1px] text-white/70">
                Consulta el historial, filtra por cliente o folio, abre el PDF y administra el estado de cada cotización.
              </p>
            </div>
          </div>

          {stats ? (
            <div className="flex w-full shrink-0 flex-wrap items-center gap-2 lg:w-auto" role="group" aria-label="Resumen del periodo">
              {(
                [
                  { label: "Total", value: stats.total, gold: false },
                  { label: "Autorizadas", value: stats.autorizadas, gold: true },
                  { label: "Pendientes", value: stats.pendientes, gold: false },
                  { label: "Canceladas", value: stats.canceladas, gold: false },
                ] as const
              ).map((item) => (
                <div key={item.label} className="inline-flex h-[3.25rem] items-center gap-3 rounded-[16px] bg-white/10 px-4">
                  <span
                    className={`inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-white/10 ${
                      item.gold ? "text-[#E6A23C]" : "text-white/80"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                      {item.label === "Autorizadas" ? (
                        <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                      ) : item.label === "Canceladas" ? (
                        <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                      ) : item.label === "Pendientes" ? (
                        <>
                          <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </>
                      ) : (
                        <path d="M6 6h12M6 12h12M6 18h12" strokeLinecap="round" />
                      )}
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/55">{item.label}</p>
                    <p className="text-[18px] font-semibold tabular-nums leading-none text-white">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </header>
    </>
  );
}

type ListProps = {
  rows: CotizacionRow[];
  loading: boolean;
  formatDMY: (iso: string) => string;
  normalizeMedioLabel: (raw: string) => string;
  statusChipClass: (raw: string) => string;
  medioChipClass: string;
  actions: CotizacionRowActions;
  excelLoading?: boolean;
};

export function CotizacionesMobileList({
  rows,
  loading,
  formatDMY,
  normalizeMedioLabel,
  statusChipClass,
  medioChipClass,
  actions,
  excelLoading = false,
}: ListProps) {
  const sections = useMemo(() => groupCotizacionesByStatus(rows), [rows]);

  if (loading) {
    return <p className="py-6 text-center text-sm text-[#6E6E77] dark:text-[#8ea0b8] lg:hidden">Cargando…</p>;
  }

  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-[#6E6E77] dark:text-[#8ea0b8] lg:hidden">No hay cotizaciones.</p>;
  }

  return (
    <div className="space-y-5 lg:hidden">
      {sections.map((section) => {
        const headingId = `cotizaciones-mobile-${section.key.toLowerCase()}`;
        return (
          <section key={section.key} aria-labelledby={headingId} className="space-y-3">
            <CotizacionStatusSectionHeader
              statusKey={section.key}
              label={section.label}
              count={section.rows.length}
              headingId={headingId}
              as="h2"
            />
            <ul className="space-y-3">
              {section.rows.map((r) => {
                const statusUpper = normalizeCotizacionStatus(r.status) || "PENDIENTE";
                return (
                  <li
                    key={r.id}
                    className="rounded-[16px] border border-[#E7E7EA] bg-white p-4 shadow-[0_6px_20px_-14px_rgba(9,9,11,0.14)] dark:border-[#273244] dark:bg-[#111827]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-md border border-[#BBD0FF]/70 bg-[rgba(27,92,255,0.08)] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#1B5CFF] dark:border-[#4B7CFF]/35 dark:bg-[rgba(75,124,255,0.14)] dark:text-[#4B7CFF]">
                            {formatDocumentFolio(FOLIO_SERIE.cotizacion, r.idx)}
                          </span>
                          <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${statusChipClass(r.status)}`}>
                            {statusUpper === "PENDIENTE"
                              ? "Pendiente"
                              : String(r.status || "—").charAt(0).toUpperCase() + String(r.status || "—").slice(1).toLowerCase()}
                          </span>
                        </div>
                        <p className="mt-2 truncate text-sm font-semibold text-[#09090B] dark:text-white">{r.cliente}</p>
                        {r.clienteTelefono && r.clienteTelefono !== "—" ? (
                          <a
                            href={buildWhatsappUrl(r) || undefined}
                            target="_blank"
                            rel="noreferrer"
                            className={`mt-0.5 text-xs text-[#6E6E77] dark:text-[#8ea0b8] ${
                              buildWhatsappUrl(r)
                                ? "inline-flex hover:text-[#16a34a] hover:underline"
                                : "inline-flex cursor-default"
                            }`}
                            onClick={(e) => {
                              if (!buildWhatsappUrl(r)) e.preventDefault();
                            }}
                          >
                            {r.clienteTelefono}
                          </a>
                        ) : null}
                        {r.tipoTrabajo && r.tipoTrabajo !== "—" ? (
                          <p className="mt-1 line-clamp-2 text-xs text-[#52525B] dark:text-[#cbd5e1]" title={r.tipoTrabajo}>
                            {r.tipoTrabajo}
                          </p>
                        ) : null}
                        <p className="mt-0.5 text-xs text-[#6E6E77] dark:text-[#8ea0b8]">{formatDMY(r.fecha)}</p>
                        <span className={`mt-2 inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${medioChipClass}`}>
                          {normalizeMedioLabel(r.medioContacto)}
                        </span>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-[#09090B] dark:text-white">{r.monto}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-[#E7E7EA] pt-3 dark:border-[#273244]">
                      <button
                        type="button"
                        disabled={excelLoading}
                        onClick={() => actions.onEdit(r)}
                        className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#E7E7EA] bg-white hover:border-[#1B5CFF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B5CFF] disabled:opacity-50 dark:border-[#273244] dark:bg-[#0f172a]"
                        title="Editar"
                        aria-label="Editar"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      {actions.onDownloadExcel && (
                        <button
                          type="button"
                          disabled={excelLoading}
                          onClick={() => actions.onDownloadExcel!(r)}
                          className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#E7E7EA] bg-white hover:border-emerald-400 hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B5CFF] disabled:opacity-50 dark:border-[#273244] dark:bg-[#0f172a]"
                          title="Excel"
                          aria-label="Descargar Excel"
                        >
                          <CotizacionExcelIcon className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={excelLoading}
                        onClick={() => actions.onOpenPdf(r.id)}
                        className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#E7E7EA] bg-white hover:border-[#1B5CFF] hover:text-[#1B5CFF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B5CFF] disabled:opacity-50 dark:border-[#273244] dark:bg-[#0f172a] dark:hover:text-[#4B7CFF]"
                        title="PDF"
                        aria-label="Ver PDF"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <path d="M14 2v6h6" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        disabled={excelLoading}
                        onClick={() => actions.onDelete(r)}
                        className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#E7E7EA] bg-white hover:border-rose-400 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B5CFF] disabled:opacity-50 dark:border-[#273244] dark:bg-[#0f172a]"
                        title="Eliminar"
                        aria-label="Eliminar"
                      >
                        <TrashBinIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function CotizacionesTable({
  rows,
  loading,
  formatDMY,
  normalizeMedioLabel,
  statusChipClass,
  medioChipClass,
  actions,
  excelLoading = false,
}: ListProps) {
  const sections = useMemo(() => groupCotizacionesByStatus(rows), [rows]);

  return (
    <div className="hidden lg:block">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] text-[#6E6E77] dark:text-[#8EA0B8] xl:hidden">
        <span className="inline-block h-px w-4 bg-[#1B5CFF]/70" aria-hidden />
        Desliza horizontalmente para ver el listado completo
      </p>
      <div className="touch-pan-x overflow-x-auto overscroll-x-contain rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] [-webkit-overflow-scrolling:touch] dark:border-[#273244] dark:bg-[#1B2539]">
        <Table className="w-full min-w-[1180px] border-collapse">
          <TableHeader className="sticky top-0 z-10 border-b border-[#E7E7EA] bg-white text-[11px] font-semibold text-[#09090B] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC]">
            <TableRow>
              <TableCell isHeader scope="col" className="w-[80px] min-w-[80px] whitespace-nowrap px-2 py-2 text-left text-[#52525B] dark:text-[#B7C1D1] sm:px-3">Folio</TableCell>
              <TableCell isHeader scope="col" className="w-[104px] min-w-[104px] whitespace-nowrap px-2 py-2 text-left text-[#52525B] dark:text-[#B7C1D1] sm:px-3">Fecha</TableCell>
              <TableCell isHeader scope="col" className="min-w-[120px] max-w-[160px] px-2 py-2 text-left text-[#52525B] dark:text-[#B7C1D1] sm:px-3">Medio</TableCell>
              <TableCell isHeader scope="col" className="w-[108px] min-w-[108px] whitespace-nowrap px-2 py-2 text-left text-[#52525B] dark:text-[#B7C1D1] sm:px-3">Status</TableCell>
              <TableCell isHeader scope="col" className="min-w-[132px] max-w-[180px] px-2 py-2 text-left text-[#52525B] dark:text-[#B7C1D1] sm:px-3">Creada por</TableCell>
              <TableCell isHeader scope="col" className="min-w-[132px] max-w-[180px] px-2 py-2 text-left text-[#52525B] dark:text-[#B7C1D1] sm:px-3">Editada por</TableCell>
              <TableCell isHeader scope="col" className="min-w-[160px] px-2 py-2 text-left text-[#52525B] dark:text-[#B7C1D1] sm:px-3">Cliente</TableCell>
              <TableCell isHeader scope="col" className="min-w-[160px] max-w-[220px] px-2 py-2 text-left text-[#52525B] dark:text-[#B7C1D1] sm:px-3">Tipo de trabajo</TableCell>
              <TableCell isHeader scope="col" className="w-[132px] min-w-[132px] whitespace-nowrap px-2 py-2 text-right text-[#52525B] dark:text-[#B7C1D1] sm:px-3">Monto</TableCell>
              <TableCell isHeader scope="col" className="w-[160px] min-w-[160px] whitespace-nowrap px-2 py-2 text-center text-[#52525B] dark:text-[#B7C1D1] sm:px-3">Acciones</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#EDEDED] text-[11px] text-[#52525B] dark:divide-[#273244] dark:text-[#e5e7eb] sm:text-[12px]">
            {loading ? (
              <TableRow>
                <TableCell className="px-3 py-3 text-[#6E6E77]" colSpan={10}>
                  Cargando…
                </TableCell>
              </TableRow>
            ) : !rows.length ? (
              <TableRow>
                <TableCell className="px-3 py-2" colSpan={10}>
                  <div className="py-8 text-center text-sm text-[#6E6E77] dark:text-[#8ea0b8]">No hay cotizaciones.</div>
                </TableCell>
              </TableRow>
            ) : (
              sections.flatMap((section) => {
                const headingId = `cotizaciones-table-${section.key.toLowerCase()}`;
                const headerRow = (
                  <TableRow key={`${section.key}-header`} className="hover:bg-transparent dark:hover:bg-transparent">
                    <TableCell isHeader scope="colgroup" colSpan={10} className="border-y-0 bg-transparent p-0 text-left">
                      <div className="px-2 py-2 sm:px-3">
                        <CotizacionStatusSectionHeader
                          statusKey={section.key}
                          label={section.label}
                          count={section.rows.length}
                          headingId={headingId}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );

                const dataRows = section.rows.map((r) => {
                  const statusUpper = normalizeCotizacionStatus(r.status) || "PENDIENTE";
                  return (
                    <TableRow key={r.id} className="align-top transition-colors hover:bg-[#FAFAFA]/80 dark:hover:bg-[#243048]/40">
                      <TableCell className="whitespace-nowrap px-2 py-2 align-middle sm:px-3">
                        <span className="inline-flex items-center justify-center rounded-md border border-[#BBD0FF]/70 bg-[rgba(27,92,255,0.08)] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#1B5CFF] dark:border-[#4B7CFF]/35 dark:bg-[rgba(75,124,255,0.14)] dark:text-[#4B7CFF] sm:text-[11px]">
                          {formatDocumentFolio(FOLIO_SERIE.cotizacion, r.idx)}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-2 py-2 align-middle sm:px-3">{formatDMY(r.fecha)}</TableCell>
                      <TableCell className="min-w-0 max-w-[160px] px-2 py-2 align-middle sm:px-3">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium sm:text-[11px] ${medioChipClass}`}>
                          {normalizeMedioLabel(r.medioContacto)}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-2 py-2 align-middle sm:px-3">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium sm:text-[11px] ${statusChipClass(r.status)}`}>
                          {statusUpper === "PENDIENTE"
                            ? "Pendiente"
                            : String(r.status || "—").charAt(0).toUpperCase() + String(r.status || "—").slice(1).toLowerCase()}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-0 max-w-[180px] px-2 py-2 align-top sm:px-3">
                        <div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
                          <span className="truncate sm:text-[12px]" title={r.creadaPor}>
                            {r.creadaPor}
                          </span>
                          <span className="shrink-0 text-[10px] leading-tight text-[#6E6E77] dark:text-[#8ea0b8]">Creada</span>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-0 max-w-[180px] px-2 py-2 align-top sm:px-3">
                        <div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
                          <span className="truncate sm:text-[12px]" title={r.editadaPor}>
                            {r.editadaPor}
                          </span>
                          <span className="shrink-0 text-[10px] leading-tight text-[#6E6E77] dark:text-[#8ea0b8]">Última edición</span>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[160px] max-w-[280px] px-2 py-2 align-top sm:px-3">
                        <span className="block truncate font-medium sm:text-[12px]" title={r.cliente}>
                          {r.cliente}
                        </span>
                        {r.clienteTelefono && r.clienteTelefono !== "—" ? (
                          <a
                            href={buildWhatsappUrl(r) || undefined}
                            target="_blank"
                            rel="noreferrer"
                            className={`mt-0.5 block text-[11px] text-[#6E6E77] dark:text-[#8ea0b8] ${
                              buildWhatsappUrl(r)
                                ? "hover:text-[#16a34a] hover:underline"
                                : "cursor-default"
                            }`}
                            onClick={(e) => {
                              if (!buildWhatsappUrl(r)) e.preventDefault();
                            }}
                          >
                            {r.clienteTelefono}
                          </a>
                        ) : null}
                      </TableCell>
                      <TableCell className="min-w-[140px] max-w-[220px] px-2 py-2 align-top sm:px-3">
                        <span
                          className="block line-clamp-2 text-[11px] leading-snug text-[#52525B] dark:text-[#cbd5e1] sm:text-[12px]"
                          title={r.tipoTrabajo}
                        >
                          {r.tipoTrabajo || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="w-[132px] min-w-[132px] whitespace-nowrap px-2 py-2 text-right align-middle sm:px-3">
                        <span className="inline-flex max-w-full justify-end rounded-md border border-[#E7E7EA] bg-[#FAFAFA] px-2 py-0.5 text-[11px] font-semibold tabular-nums dark:border-[#273244] dark:bg-[#0f172a] sm:text-[12px]">
                          {r.monto}
                        </span>
                      </TableCell>
                      <TableCell className="w-[160px] min-w-[160px] whitespace-nowrap px-2 py-2 text-center align-middle sm:px-3">
                        <div className="inline-flex items-center gap-1 rounded-md bg-[#FAFAFA] px-1.5 py-1 dark:bg-white/10">
                          <button
                            type="button"
                            disabled={excelLoading}
                            onClick={() => actions.onEdit(r)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#E7E7EA] bg-white transition hover:border-[#4B7CFF] hover:text-[#1B5CFF] disabled:opacity-50 dark:border-white/10 dark:bg-[#111827]"
                            title="Editar"
                            aria-label="Editar"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          {actions.onDownloadExcel && (
                            <button
                              type="button"
                              disabled={excelLoading}
                              onClick={() => actions.onDownloadExcel!(r)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#E7E7EA] bg-white transition hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50 dark:border-white/10 dark:bg-[#111827] dark:hover:border-emerald-500"
                              title="Excel"
                              aria-label="Descargar Excel"
                            >
                              <CotizacionExcelIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={excelLoading}
                            onClick={() => actions.onOpenPdf(r.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#E7E7EA] bg-white transition hover:border-[#4B7CFF] hover:text-[#1B5CFF] disabled:opacity-50 dark:border-white/10 dark:bg-[#111827] dark:hover:border-[#1B5CFF]"
                            title="PDF"
                            aria-label="Ver PDF"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <path d="M14 2v6h6" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            disabled={excelLoading}
                            onClick={() => actions.onDelete(r)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#E7E7EA] bg-white transition hover:border-rose-400 hover:text-rose-600 disabled:opacity-50 dark:border-white/10 dark:bg-[#111827]"
                            title="Eliminar"
                            aria-label="Eliminar"
                          >
                            <TrashBinIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                });

                return [headerRow, ...dataRows];
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
