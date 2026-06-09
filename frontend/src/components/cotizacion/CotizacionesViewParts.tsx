import { Link } from "react-router-dom";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

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
  const numero = row.idx || row.id || "—";
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

export type CotizacionRow = {
  id: number;
  idx: number;
  fecha: string;
  medioContacto: string;
  status: string;
  creadaPor: string;
  editadaPor: string;
  cliente: string;
  clienteTelefono?: string;
  contacto: string;
  tipoTrabajo: string;
  monto: string;
  totalAmount: number;
};

const sectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#78716c] dark:text-[#8ea0b8] sm:text-xs";

const heroHeadingClass =
  "[font-family:Georgia,'Times_New_Roman',serif] text-[clamp(1.85rem,2.8vw,2.6rem)] font-medium leading-[1.2] tracking-[-0.01em] text-[#1c1917] dark:text-[#f8fafc]";

const bodyClass = "text-sm leading-relaxed text-[#57534e] dark:text-[#b7c1d1]";

export type CotizacionRowActions = {
  onOpenPdf: (id: number) => void;
  onEdit: (r: CotizacionRow) => void;
  onDelete: (r: CotizacionRow) => void;
  onDownloadExcel?: (r: CotizacionRow) => void;
};

type HeaderProps = {
  cardShellClass: string;
};

export function CotizacionPageHeader({ cardShellClass }: HeaderProps) {
  return (
    <>
      <nav
        className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-[#78716c] dark:text-[#8ea0b8] sm:text-[13px]"
        aria-label="Migas de pan"
      >
        <Link
          to="/"
          className="rounded-md px-1.5 py-1 text-[#57534e] transition-colors hover:bg-black/[0.03] hover:text-[#1c1917] dark:text-[#aeb8c8] dark:hover:bg-white/5 dark:hover:text-white"
        >
          Inicio
        </Link>
        <span className="text-[#d6d3d1] dark:text-[#334155]" aria-hidden>
          /
        </span>
        <span className="text-[#44403c] dark:text-[#cbd5e1]">Cotizaciones</span>
      </nav>

      <header className={`relative flex w-full flex-col gap-4 ${cardShellClass} p-4 sm:p-6`}>
        <div className="pointer-events-none absolute right-4 top-4 h-20 w-20 rounded-full bg-[#ff801f]/10 blur-2xl sm:right-6 sm:top-6" />
        <div className="relative z-[1] flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff801f] text-black sm:h-11 sm:w-11">
            <svg className="h-[18px] w-[18px] sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ea580c] dark:text-[#fb923c] sm:text-[11px]">Ventas</p>
            <h1 className={`mt-0.5 ${heroHeadingClass}`}>Cotizaciones</h1>
            <p className={`mt-1 max-w-2xl ${bodyClass}`}>
              Consulta el historial, filtra por cliente o folio, abre el PDF y administra el estado de cada cotización.
            </p>
            <div className="mt-3 h-px w-full max-w-xl bg-gradient-to-r from-[#ff801f]/35 via-[#ffbf8d]/30 to-transparent dark:from-[#ff9a52]/35 dark:via-[#64748b]/25 dark:to-transparent" />
          </div>
        </div>
      </header>
    </>
  );
}

export type CotizacionStats = {
  total: string;
  autorizadas: string;
  pendientes: string;
  canceladas: string;
};

type StatsProps = {
  cardShellClass: string;
  stats: CotizacionStats;
};

export function CotizacionStatsCards({ stats }: StatsProps) {
  const items = [
    {
      label: "Total",
      value: stats.total,
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 6h12M6 12h12M6 18h12" strokeLinecap="round" />
        </svg>
      ),
      tone: "text-[#ea580c] dark:text-[#fb923c]",
      border: "border-[#e7ded0] bg-white/90 dark:border-[#334155] dark:bg-[#0f172a]",
    },
    {
      label: "Autorizadas",
      value: stats.autorizadas,
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      tone: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-200/70 bg-emerald-50/80 dark:border-emerald-500/25 dark:bg-emerald-500/[0.08]",
    },
    {
      label: "Pendientes",
      value: stats.pendientes,
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      tone: "text-amber-800 dark:text-amber-200",
      border: "border-amber-200/70 bg-amber-50/80 dark:border-amber-500/25 dark:bg-amber-500/[0.08]",
    },
    {
      label: "Canceladas",
      value: stats.canceladas,
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      tone: "text-rose-700 dark:text-rose-300",
      border: "border-rose-200/70 bg-rose-50/80 dark:border-rose-500/25 dark:bg-rose-500/[0.08]",
    },
  ] as const;

  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-4 xl:gap-5">
      {items.map((item) => (
        <div key={item.label} className={`rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-3 dark:border-[#273244] dark:bg-[#111a2b]/90 sm:p-4`}>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border sm:h-10 sm:w-10 ${item.border} ${item.tone}`}>
              {item.icon}
            </span>
            <div className="min-w-0">
              <p className={sectionLabelClass}>{item.label}</p>
              <p
                className="mt-0.5 truncate text-base font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc] sm:text-lg"
                title={item.value}
              >
                {item.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
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
  if (loading) {
    return <p className="py-6 text-center text-sm text-[#78716c] dark:text-[#8ea0b8] lg:hidden">Cargando…</p>;
  }

  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-[#78716c] dark:text-[#8ea0b8] lg:hidden">No hay cotizaciones.</p>;
  }

  return (
    <ul className="space-y-3 lg:hidden">
      {rows.map((r) => {
        const statusUpper = String(r.status || "PENDIENTE").toUpperCase();
        return (
          <li
            key={r.id}
            className="rounded-2xl border border-[#e7ded0] bg-[#fffdfa] p-4 shadow-[0_12px_32px_-24px_rgba(28,25,23,0.25)] dark:border-[#273244] dark:bg-[#111827]/80"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-md border border-[#e2d9ca] bg-[#fcfaf6] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#1c1917] dark:border-[#334155] dark:bg-[#0f172a] dark:text-white">
                    #{r.idx || "—"}
                  </span>
                  <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${statusChipClass(r.status)}`}>
                    {statusUpper === "PENDIENTE"
                      ? "Pendiente"
                      : String(r.status || "—").charAt(0).toUpperCase() + String(r.status || "—").slice(1).toLowerCase()}
                  </span>
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-[#1c1917] dark:text-white">{r.cliente}</p>
                {r.clienteTelefono && r.clienteTelefono !== "—" ? (
                  <a
                    href={buildWhatsappUrl(r) || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className={`mt-0.5 text-xs text-[#78716c] dark:text-[#8ea0b8] ${
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
                  <p className="mt-1 line-clamp-2 text-xs text-[#57534e] dark:text-[#cbd5e1]" title={r.tipoTrabajo}>
                    {r.tipoTrabajo}
                  </p>
                ) : null}
                <p className="mt-0.5 text-xs text-[#78716c] dark:text-[#8ea0b8]">{formatDMY(r.fecha)}</p>
                <span className={`mt-2 inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${medioChipClass}`}>
                  {normalizeMedioLabel(r.medioContacto)}
                </span>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums text-[#1c1917] dark:text-white">{r.monto}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-[#e7ded0] pt-3 dark:border-[#273244]">
              <button
                type="button"
                disabled={excelLoading}
                onClick={() => actions.onOpenPdf(r.id)}
                className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-lg border border-[#e2d9ca] bg-white text-xs font-medium text-[#57534e] hover:border-[#ff801f] hover:text-[#ea580c] disabled:opacity-50 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb]"
              >
                PDF
              </button>
              <button
                type="button"
                disabled={excelLoading}
                onClick={() => actions.onEdit(r)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#e2d9ca] bg-white hover:border-[#ff801f] dark:border-[#334155] dark:bg-[#0f172a]"
                title="Editar"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={excelLoading}
                onClick={() => actions.onDelete(r)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#e2d9ca] bg-white hover:border-rose-400 hover:text-rose-600 dark:border-[#334155] dark:bg-[#0f172a]"
                title="Eliminar"
              >
                <TrashBinIcon className="h-4 w-4" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
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
  return (
    <div className="hidden lg:block">
      <div className="touch-pan-x overflow-x-auto overscroll-x-contain rounded-xl border border-[#e7ded0] bg-[#fffdfa]/70 [-webkit-overflow-scrolling:touch] dark:border-[#273244] dark:bg-[#111a2b]/40">
        <Table className="w-full min-w-[1180px] border-collapse">
          <TableHeader className="sticky top-0 z-10 border-b border-[#e7ded0] bg-[#fcfaf6]/95 text-[10px] font-semibold text-[#57534e] backdrop-blur-sm dark:border-[#273244] dark:bg-[#0f172a]/95 dark:text-[#cbd5e1] sm:text-[11px]">
            <TableRow>
              <TableCell isHeader className="w-[80px] min-w-[80px] whitespace-nowrap px-2 py-2 text-left sm:px-3">Folio</TableCell>
              <TableCell isHeader className="w-[104px] min-w-[104px] whitespace-nowrap px-2 py-2 text-left sm:px-3">Fecha</TableCell>
              <TableCell isHeader className="min-w-[120px] max-w-[160px] px-2 py-2 text-left sm:px-3">Medio</TableCell>
              <TableCell isHeader className="w-[108px] min-w-[108px] whitespace-nowrap px-2 py-2 text-left sm:px-3">Status</TableCell>
              <TableCell isHeader className="min-w-[132px] max-w-[180px] px-2 py-2 text-left sm:px-3">Creada por</TableCell>
              <TableCell isHeader className="min-w-[132px] max-w-[180px] px-2 py-2 text-left sm:px-3">Editada por</TableCell>
              <TableCell isHeader className="min-w-[160px] px-2 py-2 text-left sm:px-3">Cliente</TableCell>
              <TableCell isHeader className="min-w-[160px] max-w-[220px] px-2 py-2 text-left sm:px-3">Tipo de trabajo</TableCell>
              <TableCell isHeader className="w-[132px] min-w-[132px] whitespace-nowrap px-2 py-2 text-right sm:px-3">Monto</TableCell>
              <TableCell isHeader className="w-[132px] min-w-[132px] whitespace-nowrap px-2 py-2 text-center sm:px-3">Acciones</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#f1e8db] text-[11px] text-[#44403c] dark:divide-[#273244] dark:text-[#e5e7eb] sm:text-[12px]">
            {loading ? (
              <TableRow>
                <TableCell className="px-3 py-3 text-[#78716c]" colSpan={10}>
                  Cargando…
                </TableCell>
              </TableRow>
            ) : !rows.length ? (
              <TableRow>
                <TableCell className="px-3 py-2" colSpan={10}>
                  <div className="py-8 text-center text-sm text-[#78716c] dark:text-[#8ea0b8]">No hay cotizaciones.</div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const statusUpper = String(r.status || "PENDIENTE").toUpperCase();
                return (
                  <TableRow key={r.id} className="align-top transition-colors hover:bg-[#fff8f1]/80 dark:hover:bg-[#1e293b]/40">
                    <TableCell className="whitespace-nowrap px-2 py-2 align-middle sm:px-3">
                      <span className="inline-flex items-center justify-center rounded-md border border-[#e2d9ca] bg-[#fcfaf6] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#1c1917] dark:border-[#334155] dark:bg-[#0f172a] dark:text-white sm:text-[11px]">
                        {r.idx ? r.idx : "—"}
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
                        <span className="shrink-0 text-[10px] leading-tight text-[#78716c] dark:text-[#8ea0b8]">Creada</span>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-0 max-w-[180px] px-2 py-2 align-top sm:px-3">
                      <div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
                        <span className="truncate sm:text-[12px]" title={r.editadaPor}>
                          {r.editadaPor}
                        </span>
                        <span className="shrink-0 text-[10px] leading-tight text-[#78716c] dark:text-[#8ea0b8]">Última edición</span>
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
                          className={`mt-0.5 block text-[11px] text-[#cc785c] dark:text-[#cc785c] ${
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
                        className="block line-clamp-2 text-[11px] leading-snug text-[#57534e] dark:text-[#cbd5e1] sm:text-[12px]"
                        title={r.tipoTrabajo}
                      >
                        {r.tipoTrabajo || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="w-[132px] min-w-[132px] whitespace-nowrap px-2 py-2 text-right align-middle sm:px-3">
                      <span className="inline-flex max-w-full justify-end rounded-md border border-[#e2d9ca] bg-[#fcfaf6] px-2 py-0.5 text-[11px] font-semibold tabular-nums dark:border-[#334155] dark:bg-[#0f172a] sm:text-[12px]">
                        {r.monto}
                      </span>
                    </TableCell>
                    <TableCell className="w-[132px] min-w-[132px] whitespace-nowrap px-2 py-2 text-center align-middle sm:px-3">
                      <div className="inline-flex items-center gap-1 rounded-md bg-[#f5f0e8] px-1.5 py-1 dark:bg-white/10">
                        <button
                          type="button"
                          disabled={excelLoading}
                          onClick={() => actions.onOpenPdf(r.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#e2d9ca] bg-white transition hover:border-[#ffa057] hover:text-[#ff801f] disabled:opacity-50 dark:border-white/10 dark:bg-[#111a2b] dark:hover:border-[#ff801f]"
                          title="PDF"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <path d="M14 2v6h6" />
                          </svg>
                        </button>
                        {actions.onDownloadExcel && (
                          <button
                            type="button"
                            disabled={excelLoading}
                            onClick={() => actions.onDownloadExcel!(r)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#e2d9ca] bg-white transition hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50 dark:border-white/10 dark:bg-[#111a2b] dark:hover:border-emerald-500"
                            title="Excel"
                          >
                            <CotizacionExcelIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={excelLoading}
                          onClick={() => actions.onEdit(r)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#e2d9ca] bg-white transition hover:border-[#ffa057] hover:text-[#ff801f] disabled:opacity-50 dark:border-white/10 dark:bg-[#111a2b]"
                          title="Editar"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={excelLoading}
                          onClick={() => actions.onDelete(r)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded border border-[#e2d9ca] bg-white transition hover:border-rose-400 hover:text-rose-600 disabled:opacity-50 dark:border-white/10 dark:bg-[#111a2b]"
                          title="Eliminar"
                        >
                          <TrashBinIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
