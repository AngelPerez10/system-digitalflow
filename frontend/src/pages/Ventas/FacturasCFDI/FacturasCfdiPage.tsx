import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import { PdfDocGlyph } from "@/components/icons/PdfDocGlyph";
import { fetchSicarApi } from "./sicarApi";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import {
  erpBodyClass,
  erpCardShellClass,
  erpCardShellMutedClass,
  erpHeroHeadingClass,
  erpSansStyle,
  erpSearchInputClass,
  erpSecondaryBtnClass,
  erpSectionLabelClass,
  erpTableHeaderClass,
  erpTableWrapClass,
} from "@/layout/erpPageStyles";
import { OrdenPdfLoadingModal } from "@/pages/Operacion/OrdenesTrabajo/OrdenServicio/OrdenPdfLoadingModal";
import { useAuth } from "@/context/AuthContext";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import NuevaFacturaCfdiModal from "./NuevaFacturaCfdiModal";
import { FacturaCfdiBadge, FacturaNeutralBadge, facturaHintClass } from "./facturaTabUi";

type SicarFacturaRow = {
  fcf_id: number;
  serie_folio: string;
  folio: number | null;
  fecha: string | null;
  nombre_c: string;
  rfc_c: string;
  subtotal: number | null;
  total: number | null;
  status: number | null;
  cli_id: number | null;
  uuid: string;
  forma_pago: string;
  metodo_pago: string;
};

type SicarDetailTables = Record<string, Record<string, unknown>[]>;
type MonthBucket = { month_key: string; total: number };

const SEARCH_DEBOUNCE_MS = 400;
const MONTH_PAGE_SIZE = 100;
const SEARCH_PAGE_SIZE = 25;

const money = (value: number | null) =>
  Number(value ?? 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

const dateOnly = (value: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
};

const timeOnly = (value: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
};

const monthLabel = (key: string) => {
  const m = /^(\d{4})-(\d{2})$/.exec(key.trim());
  if (!m) return key.includes("%") ? "Mes" : key;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return d.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
};

/** YYYY-MM en hora local a partir de la fecha del CFDI (para validar el mes visible). */
const fechaMonthKey = (value: string | null) => {
  if (!value) return "";
  const m = /^(\d{4})-(\d{2})/.exec(value.trim());
  if (m) return `${m[1]}-${m[2]}`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

function mapRow(raw: Record<string, unknown>): SicarFacturaRow {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k];
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return undefined;
  };

  return {
    fcf_id: Number(pick("fcf_id", "FCF_ID") ?? 0),
    serie_folio: String(pick("serie_folio", "serieFolio") ?? ""),
    folio: pick("folio") != null ? Number(pick("folio")) : null,
    fecha: (pick("fecha") as string | null) ?? null,
    nombre_c: String(pick("nombre_c", "nombreC") ?? ""),
    rfc_c: String(pick("rfc_c", "rfcC") ?? ""),
    subtotal: pick("subtotal") != null ? Number(pick("subtotal")) : null,
    total: pick("total") != null ? Number(pick("total")) : null,
    status: pick("status") != null ? Number(pick("status")) : null,
    cli_id: pick("cli_id") != null ? Number(pick("cli_id")) : null,
    uuid: String(pick("uuid", "UUID") ?? ""),
    forma_pago: String(pick("forma_pago", "formaPago") ?? ""),
    metodo_pago: String(pick("metodo_pago", "metodoPago") ?? ""),
  };
}

const DETAIL_MODAL_TITLE_ID = "facturas-cfdi-detalle-title";

const TABLE_LABELS: Record<string, string> = {
  facturacfdi: "Comprobante",
  facturacfdiimp: "Impuestos",
  facturacfdiven: "Ventas relacionadas",
};

const formatDetailValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString("es-MX") : String(value);
  return String(value);
};

const isMoneyField = (key: string) =>
  /^(subtotal|total|importe|monto|precio|descuento|iva|isr|ieps)/i.test(key.replace(/[^a-z]/gi, ""));

const formatDetailField = (key: string, value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (isMoneyField(key) && !Number.isNaN(Number(value))) {
    return money(Number(value));
  }
  return formatDetailValue(value);
};

type CfdiDownloadKind = "xml" | "pdf";

const detailModalShellClass =
  "my-2 flex max-h-[min(92dvh,52rem)] w-[calc(100vw-0.75rem)] max-w-[44rem] min-h-0 flex-col overflow-hidden rounded-t-3xl border border-[#e7ded0] bg-[#fffdfa] p-0 shadow-[0_24px_64px_-16px_rgba(28,25,23,0.22)] dark:border-[#273244] dark:bg-[#111a2b] dark:shadow-[0_24px_64px_-16px_rgba(0,0,0,0.55)] sm:my-6 sm:w-[min(94vw,48rem)] sm:max-w-3xl sm:rounded-2xl lg:max-w-4xl";

const detailSectionClass =
  "overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] dark:border-[#334155] dark:bg-[#0f172a]/90";

const detailSectionHeadClass =
  "border-b border-[#e7ded0]/80 px-4 py-3 dark:border-white/[0.06] sm:px-5";

const detailMetaGridClass =
  "grid grid-cols-1 gap-px bg-[#e7ded0]/90 dark:bg-[#334155] sm:grid-cols-2 lg:grid-cols-4";

const detailMetaCellClass =
  "min-w-0 bg-[#fffdfa] px-3.5 py-3 dark:bg-[#111827] sm:px-4 sm:py-3.5";

const detailLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.12em] text-[#78716c] dark:text-[#8ea0b8] sm:text-[11px]";

const detailValueClass =
  "mt-1 break-words text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]";

const detailDownloadBtnClass =
  `${erpSecondaryBtnClass} !min-h-[44px] !w-full !justify-start !gap-3 !px-3.5 !py-3 !text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff801f]/40`;

const cfdiActionIconBtnClass =
  "inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-[#57534e] transition hover:border-[#ff801f] hover:text-[#ea580c] disabled:pointer-events-none disabled:opacity-50 dark:border-white/10 dark:bg-gray-800 dark:text-[#cbd5e1] dark:hover:border-[#ffa057] dark:hover:text-[#ffa057]";

function parseContentDispositionFilename(header: string | null): string | null {
  const match = header?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ? String(match[1]) : null;
}

function cfdiFallbackFilename(row: SicarFacturaRow, kind: CfdiDownloadKind) {
  const base = (row.serie_folio || `CFDI_${row.fcf_id}`).replace(/[^\w.-]+/g, "_");
  const uid = (row.uuid || "").replace(/[^\w.-]+/g, "_");
  const suffix = uid ? `${base}_${uid}` : base;
  return kind === "xml" ? `${suffix}.xml` : `${suffix}.pdf`;
}

async function downloadCfdiFile(
  fcfId: number,
  kind: CfdiDownloadKind,
  fallbackName: string
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetchSicarApi(`/api/cotizaciones-sicar/facturas/${fcfId}/${kind}/`, {
      method: "GET",
      cache: "no-store" as RequestCache,
    });
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    if (!res.ok) {
      let message = `No se pudo descargar el ${kind.toUpperCase()}.`;
      try {
        if (contentType.includes("application/json")) {
          const data = (await res.json()) as { detail?: string };
          message = data?.detail || message;
        } else {
          message = (await res.text()) || message;
        }
      } catch {
        /* ignore */
      }
      return { ok: false, message };
    }

    const filename =
      parseContentDispositionFilename(res.headers.get("content-disposition")) ||
      fallbackName;

    if (kind === "pdf" && contentType.includes("text/html")) {
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      URL.revokeObjectURL(url);
      return { ok: true };
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return { ok: true };
  } catch {
    return { ok: false, message: `No se pudo descargar el ${kind.toUpperCase()}.` };
  }
}

export default function FacturasCfdiPage() {
  const { permissions } = useAuth();
  const canCreateFactura = permissions?.cotizaciones?.create === true;
  const [rows, setRows] = useState<SicarFacturaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [months, setMonths] = useState<MonthBucket[]>([]);
  const [activeMonthKey, setActiveMonthKey] = useState("");
  const [loadedMonthKey, setLoadedMonthKey] = useState("");
  const [busquedaInput, setBusquedaInput] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchSeqRef = useRef(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [selectedFactura, setSelectedFactura] = useState<SicarFacturaRow | null>(null);
  const [detailTables, setDetailTables] = useState<SicarDetailTables>({});
  const [downloadingFile, setDownloadingFile] = useState<CfdiDownloadKind | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const [pdfLoadingOpen, setPdfLoadingOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const isSearching = Boolean(busqueda.trim());

  const loadFacturas = useCallback(async () => {
    const fetchId = ++fetchSeqRef.current;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (isSearching) {
        params.set("q", busqueda.trim());
        params.set("page", String(page));
        params.set("page_size", String(SEARCH_PAGE_SIZE));
      } else {
        if (activeMonthKey) {
          params.set("month", activeMonthKey);
        }
        params.set("page", "1");
        params.set("page_size", String(MONTH_PAGE_SIZE));
      }

      const res = await fetchSicarApi(`/api/cotizaciones-sicar/facturas/?${params.toString()}`, {
        method: "GET",
        cache: "no-store" as RequestCache,
      });
      const data = await res.json().catch(() => null);
      if (fetchId !== fetchSeqRef.current) return;

      if (!res.ok) {
        setRows([]);
        setError(String(data?.detail || `Error HTTP ${res.status}`));
        return;
      }

      const list = Array.isArray(data?.rows) ? data.rows.map((r: Record<string, unknown>) => mapRow(r)) : [];
      const monthBuckets: MonthBucket[] = Array.isArray(data?.months) ? data.months : [];
      const resolvedMonth = String(data?.month || "").trim();

      if (!isSearching && resolvedMonth) {
        setLoadedMonthKey(resolvedMonth);
        if (!activeMonthKey) {
          setActiveMonthKey(resolvedMonth);
        }
      }

      setRows(list);
      setMonths(monthBuckets);

      const p = data?.pagination || {};
      if (isSearching) {
        setPage(Number(p.page || page));
        setTotal(Number(p.total || 0));
        setTotalPages(Number(p.total_pages || 1));
      } else {
        setPage(1);
        setTotal(Number(p.total || list.length));
        setTotalPages(1);
      }
    } catch {
      if (fetchId !== fetchSeqRef.current) return;
      setRows([]);
      setError(
        "No se pudo consultar SICAR. Si en la consola aparece CORS, suele ser timeout del backend " +
          "al intentar MySQL (red privada o VPN). Revisa SICAR_DB_* en Render y conectividad."
      );
    } finally {
      if (fetchId === fetchSeqRef.current) {
        setLoading(false);
      }
    }
  }, [activeMonthKey, busqueda, isSearching, page]);

  useEffect(() => {
    void loadFacturas();
  }, [loadFacturas]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const applySearchQuery = useCallback((raw: string) => {
    setBusqueda(raw.trim());
    setPage(1);
  }, []);

  const handleSearchInputChange = useCallback(
    (raw: string) => {
      setBusquedaInput(raw);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        applySearchQuery(raw);
      }, SEARCH_DEBOUNCE_MS);
    },
    [applySearchQuery]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    applySearchQuery(busquedaInput);
  };

  const clearSearch = () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setBusquedaInput("");
    setBusqueda("");
    setPage(1);
  };

  const effectiveMonthKey = isSearching ? "" : activeMonthKey || loadedMonthKey;

  const displayRows = useMemo(() => {
    if (isSearching) return rows;
    if (!effectiveMonthKey) return [];
    return rows.filter((r) => fechaMonthKey(r.fecha) === effectiveMonthKey);
  }, [effectiveMonthKey, isSearching, rows]);

  const currentMonthBucket = useMemo(
    () => months.find((m) => m.month_key === effectiveMonthKey),
    [effectiveMonthKey, months]
  );
  const monthIndex = useMemo(
    () => months.findIndex((m) => m.month_key === effectiveMonthKey),
    [effectiveMonthKey, months]
  );
  const currentMonthTotal = currentMonthBucket?.total ?? displayRows.length;
  const facturasEnMesVisible = isSearching ? total : currentMonthTotal;
  const mesVisibleLabel = effectiveMonthKey ? monthLabel(effectiveMonthKey) : "—";
  const importeMesVisible = useMemo(
    () => displayRows.reduce((acc, r) => acc + Number(r.total ?? 0), 0),
    [displayRows]
  );

  const goOlderMonth = () => {
    if (isSearching || monthIndex < 0 || monthIndex >= months.length - 1) return;
    setActiveMonthKey(months[monthIndex + 1].month_key);
  };

  const goNewerMonth = () => {
    if (isSearching || monthIndex <= 0) return;
    setActiveMonthKey(months[monthIndex - 1].month_key);
  };

  const canGoOlder = !isSearching && monthIndex >= 0 && monthIndex < months.length - 1;
  const canGoNewer = !isSearching && monthIndex > 0;

  const startIndex = isSearching ? (page - 1) * SEARCH_PAGE_SIZE : 0;
  const endIndex = isSearching ? Math.min(startIndex + displayRows.length, total) : displayRows.length;

  const searchPaginationButtons = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    return Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => Math.abs(p - page) <= 2);
  }, [page, totalPages]);

  const openDetail = async (row: SicarFacturaRow) => {
    setSelectedFactura(row);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError("");
    setDetailTables({});
    try {
      const res = await fetchSicarApi(`/api/cotizaciones-sicar/facturas/${row.fcf_id}/detalle/`, {
        method: "GET",
        cache: "no-store" as RequestCache,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setDetailError(String(data?.detail || `Error HTTP ${res.status}`));
        return;
      }
      setDetailTables((data?.tables || {}) as SicarDetailTables);
    } catch {
      setDetailError("No se pudo cargar el detalle del CFDI.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setDetailOpen(false);
    setSelectedFactura(null);
    setDetailTables({});
    setDetailError("");
    setDownloadError("");
    setDownloadingFile(null);
  };

  const handleDownloadCfdi = async (row: SicarFacturaRow, kind: CfdiDownloadKind) => {
    if (kind === "pdf") {
      await handleDownloadPdf(row, true);
      return;
    }
    setDownloadingFile(kind);
    setDownloadError("");
    const result = await downloadCfdiFile(row.fcf_id, kind, cfdiFallbackFilename(row, kind));
    if (!result.ok) {
      setDownloadError(result.message || `No se pudo descargar el ${kind.toUpperCase()}.`);
    }
    setDownloadingFile(null);
  };

  const handleDownloadPdf = async (row: SicarFacturaRow, fromDetail = false) => {
    setPdfLoadingOpen(true);
    if (fromDetail) setDownloadError("");
    try {
      const result = await downloadCfdiFile(row.fcf_id, "pdf", cfdiFallbackFilename(row, "pdf"));
      if (!result.ok) {
        const message = result.message || "No se pudo descargar el PDF.";
        if (fromDetail) setDownloadError(message);
        else setError(message);
      }
    } finally {
      setPdfLoadingOpen(false);
    }
  };

  const tableNames = useMemo(() => Object.keys(detailTables || {}), [detailTables]);
  const mainCfdiRecord = useMemo(() => {
    const items = detailTables.facturacfdi || [];
    return (items[0] || null) as Record<string, unknown> | null;
  }, [detailTables]);

  return (
    <div className="min-h-[calc(100dvh-5rem)] overflow-x-hidden">
      <div
        className="mx-auto w-full max-w-[min(100%,1920px)] space-y-5 px-3 pb-10 pt-5 text-sm sm:space-y-6 sm:px-5 sm:pb-12 sm:pt-6 sm:text-base md:px-6 lg:px-8 xl:px-10 2xl:max-w-[min(100%,2200px)]"
        style={erpSansStyle}
      >
        <PageMeta title="Facturas CFDI | Ventas" description="Facturas CFDI timbradas desde SICAR" />

        <nav
          className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-[#78716c] dark:text-[#8ea0b8] sm:text-[13px]"
          aria-label="Migas de pan"
        >
          <Link
            to="/"
            className="rounded-md px-1.5 py-0.5 text-[#57534e] transition-colors hover:bg-black/[0.03] hover:text-[#1c1917] dark:text-[#aeb8c8] dark:hover:bg-white/5 dark:hover:text-white"
          >
            Inicio
          </Link>
          <span className="text-[#d6d3d1] dark:text-[#334155]" aria-hidden>
            /
          </span>
          <Link
            to="/cotizacion"
            className="rounded-md px-1.5 py-0.5 text-[#57534e] transition-colors hover:bg-black/[0.03] hover:text-[#1c1917] dark:text-[#aeb8c8] dark:hover:bg-white/5 dark:hover:text-white"
          >
            Ventas
          </Link>
          <span className="text-[#d6d3d1] dark:text-[#334155]" aria-hidden>
            /
          </span>
          <span className="text-[#44403c] dark:text-[#cbd5e1]">Facturas CFDI</span>
        </nav>

        <header className={`relative flex w-full flex-col gap-4 ${erpCardShellClass} p-4 sm:p-6`}>
          <div className="pointer-events-none absolute right-4 top-4 h-20 w-20 rounded-full bg-[#ff801f]/10 blur-2xl sm:right-6 sm:top-6" />
          <div className="relative z-[1] flex min-w-0 flex-1 flex-wrap items-start justify-between gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff801f] text-black sm:h-11 sm:w-11">
              <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
                <path d="M14 2v6h6M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ea580c] dark:text-[#fb923c] sm:text-[11px]">
                Ventas · SICAR
              </p>
              <h1 className={`mt-0.5 ${erpHeroHeadingClass}`}>Facturas CFDI</h1>
              <p className={`mt-1 max-w-2xl ${erpBodyClass}`}>
                Consulta facturas timbradas desde la base{" "}
                <span className="font-medium text-[#ea580c] dark:text-[#fb923c]">SICAR</span>. Navega mes a mes o
                busca por folio, cliente, RFC o UUID.
              </p>
              <div className="mt-3 h-px w-full max-w-xl bg-gradient-to-r from-[#ff801f]/35 via-[#ffbf8d]/30 to-transparent dark:from-[#ff9a52]/35 dark:via-[#64748b]/25 dark:to-transparent" />
            </div>
          </div>
        </header>

        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:max-w-2xl">
          <div className={`${erpCardShellMutedClass} p-3 sm:p-4`}>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e7ded0] bg-white/90 text-[#ea580c] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#fb923c] sm:h-10 sm:w-10">
                <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#78716c] dark:text-[#8ea0b8] sm:text-[11px]">
                  {isSearching ? "Importe en resultados" : `Importe en ${mesVisibleLabel}`}
                </p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc] sm:text-xl">
                  {money(importeMesVisible)}
                </p>
              </div>
            </div>
          </div>
          <div className={`${erpCardShellMutedClass} p-3 sm:p-4`}>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e7ded0] bg-white/90 text-[#ea580c] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#fb923c] sm:h-10 sm:w-10">
                <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#78716c] dark:text-[#8ea0b8] sm:text-[11px]">
                  {isSearching ? "Facturas encontradas" : `Facturas en ${mesVisibleLabel}`}
                </p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc] sm:text-xl">
                  {facturasEnMesVisible.toLocaleString("es-MX")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
          <form onSubmit={handleSearch} className="min-w-0 flex-1">
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78716c] dark:text-[#64748b] sm:left-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                id="cfdi-search-input"
                type="search"
                value={busquedaInput}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                placeholder="Buscar por folio, cliente, RFC o UUID…"
                className={`${erpSearchInputClass} pr-11`}
              />
              {busquedaInput ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Limpiar búsqueda"
                  className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-8 min-w-[40px] items-center justify-center rounded-md text-gray-400 hover:bg-gray-200/60 hover:text-gray-600 dark:hover:bg-white/[0.06] sm:h-9 sm:min-w-[44px] sm:rounded-lg"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                    <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
                  </svg>
                </button>
              ) : null}
            </div>
          </form>
          {canCreateFactura ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-[#ff801f] px-4 text-sm font-semibold text-black transition-colors hover:bg-[#ff6a00] sm:h-auto sm:min-h-[44px] sm:w-auto sm:self-stretch sm:px-5"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Nueva factura
            </button>
          ) : null}
        </div>

        {error ? (
          <div
            className="rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/30"
            role="alert"
          >
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
            <p className="mt-1 text-xs text-red-700/90 dark:text-red-300/80">
              {/tiempo de espera|vpn|red corporativa/i.test(error)
                ? "Conecta la VPN o la red de la oficina (192.168.10.x) y recarga la página."
                : "Verifica la conexión a SICAR y que el servidor Django pueda alcanzar la base MySQL."}
            </p>
          </div>
        ) : null}

        <ComponentCard
          compact
          title="Listado de facturas CFDI"
          desc={
            isSearching
              ? `${total.toLocaleString("es-MX")} resultado${total === 1 ? "" : "s"} para «${busqueda}»${totalPages > 1 ? ` · página ${page} de ${totalPages}` : ""}.`
              : currentMonthBucket
                ? `${monthLabel(currentMonthBucket.month_key)} · ${currentMonthTotal.toLocaleString("es-MX")} comprobante${currentMonthTotal === 1 ? "" : "s"}`
                : "Selecciona un mes para ver los comprobantes."
          }
          className="overflow-hidden border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.22)] dark:border-[#273244] dark:bg-[#111827]/80 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.5)]"
        >
          <p className="mb-2 flex items-center gap-1.5 text-[11px] text-[#78716c] dark:text-[#8ea0b8] sm:hidden">
            <span className="inline-block h-px w-4 bg-[#ea580c]/70 dark:bg-[#fb923c]/70" aria-hidden />
            Desliza horizontalmente para ver el listado completo
          </p>

          <div className={erpTableWrapClass}>
            <Table className="w-full min-w-[1020px] table-fixed sm:min-w-0 xl:min-w-full">
              <TableHeader className={erpTableHeaderClass}>
                <TableRow>
                  <TableCell isHeader scope="col" className="w-[72px] px-2 py-2 text-left">
                    Folio
                  </TableCell>
                  <TableCell isHeader scope="col" className="w-[160px] px-2 py-2 text-left">
                    Cliente
                  </TableCell>
                  <TableCell isHeader scope="col" className="w-[108px] px-2 py-2 text-left">
                    RFC
                  </TableCell>
                  <TableCell isHeader scope="col" className="w-[120px] px-2 py-2 text-left">
                    Fecha
                  </TableCell>
                  <TableCell isHeader scope="col" className="w-[108px] px-2 py-2 text-right">
                    Total
                  </TableCell>
                  <TableCell isHeader scope="col" className="w-[120px] px-2 py-2 text-left">
                    Forma de pago
                  </TableCell>
                  <TableCell isHeader scope="col" className="w-[120px] px-2 py-2 text-left">
                    Método de pago
                  </TableCell>
                  <TableCell isHeader scope="col" className="w-[118px] px-2 py-2 text-center">
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#f5f0e8] text-[12px] text-[#44403c] dark:divide-[#334155]/80 dark:text-[#e5e7eb]">
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-2 py-8 text-center text-sm text-[#78716c] dark:text-[#8ea0b8]">
                      Cargando facturas CFDI…
                    </TableCell>
                  </TableRow>
                ) : displayRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-2 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      {isSearching ? "Ningún CFDI coincide con la búsqueda." : "No hay facturas CFDI en este mes."}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayRows.map((r) => (
                    <TableRow key={r.fcf_id} className="transition-colors hover:bg-[#fffdf8] dark:hover:bg-[#1e293b]/50">
                      <TableCell className="px-2 py-2 align-top">
                        <div className="font-semibold tabular-nums text-gray-900 dark:text-white">
                          {r.serie_folio || r.folio || `#${r.fcf_id}`}
                        </div>
                        <div className="mt-0.5 text-[10px] text-[#78716c] dark:text-[#8ea0b8]">ID {r.fcf_id}</div>
                      </TableCell>
                      <TableCell className="px-2 py-2 align-top">
                        <span className="block truncate font-medium text-gray-900 dark:text-white" title={r.nombre_c}>
                          {r.nombre_c || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="px-2 py-2 align-top whitespace-nowrap font-mono text-[11px]">
                        {r.rfc_c || "—"}
                      </TableCell>
                      <TableCell className="px-2 py-2 align-top whitespace-nowrap">
                        <div className="text-gray-900 dark:text-white">{dateOnly(r.fecha)}</div>
                        <div className="text-[10px] text-[#78716c] dark:text-[#8ea0b8]">{timeOnly(r.fecha)}</div>
                      </TableCell>
                      <TableCell className="px-2 py-2 align-top text-right tabular-nums font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                        {money(r.total)}
                      </TableCell>
                      <TableCell className="px-2 py-2 align-top">
                        <span className="block truncate text-[11px] text-[#57534e] dark:text-[#cbd5e1]" title={r.forma_pago}>
                          {r.forma_pago || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="px-2 py-2 align-top">
                        <span className="block truncate text-[11px] text-[#57534e] dark:text-[#cbd5e1]" title={r.metodo_pago}>
                          {r.metodo_pago || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="px-2 py-2 text-center align-top">
                        <div className="inline-flex items-center justify-center gap-1 rounded-md bg-gray-100 px-1 py-1 dark:bg-white/10">
                          <button
                            type="button"
                            title="Ver detalle"
                            aria-label={`Ver detalle del CFDI ${r.serie_folio || r.fcf_id}`}
                            onClick={() => void openDetail(r)}
                            className={cfdiActionIconBtnClass}
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            title="Descargar XML"
                            aria-label={`Descargar XML ${r.serie_folio || r.fcf_id}`}
                            disabled={pdfLoadingOpen}
                            onClick={() => void handleDownloadCfdi(r, "xml")}
                            className={cfdiActionIconBtnClass}
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                              <path d="M8 3h8l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
                              <path d="M9 13h6M9 17h4M9 9h1" strokeLinecap="round" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            title="Descargar PDF"
                            aria-label={`Descargar PDF ${r.serie_folio || r.fcf_id}`}
                            disabled={pdfLoadingOpen}
                            onClick={() => void handleDownloadPdf(r)}
                            className={`${cfdiActionIconBtnClass} hover:border-red-400 hover:text-red-600 dark:hover:border-red-500`}
                          >
                            <PdfDocGlyph className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && !error && (isSearching ? total > 0 : displayRows.length > 0) ? (
            <div className="mt-4 border-t border-[#e7ded0] pt-4 dark:border-[#334155]">
              {isSearching ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Mostrando{" "}
                    <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> a{" "}
                    <span className="font-medium text-gray-900 dark:text-white">{endIndex}</span> de{" "}
                    <span className="font-medium text-gray-900 dark:text-white">{total.toLocaleString("es-MX")}</span>{" "}
                    CFDI
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      aria-label="Página anterior"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    <div className="flex items-center gap-1">
                      {searchPaginationButtons.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPage(p)}
                          aria-current={p === page ? "page" : undefined}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                            page === p
                              ? "border-[#ff801f]/30 bg-[#ff801f] text-black"
                              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      aria-label="Página siguiente"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {currentMonthBucket ? monthLabel(currentMonthBucket.month_key) : "—"}
                    </span>
                    {months.length > 0 && monthIndex >= 0 ? (
                      <>
                        {" "}
                        · mes {monthIndex + 1} de {months.length}
                      </>
                    ) : null}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={goOlderMonth}
                      disabled={!canGoOlder || loading}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#e7ded0] bg-white px-4 py-2 text-sm font-medium text-[#57534e] transition-colors hover:bg-[#fffdf8] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#e5e7eb] dark:hover:bg-[#1e293b]/80"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                      Mes anterior
                    </button>
                    <button
                      type="button"
                      onClick={goNewerMonth}
                      disabled={!canGoNewer || loading}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#e7ded0] bg-white px-4 py-2 text-sm font-medium text-[#57534e] transition-colors hover:bg-[#fffdf8] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#e5e7eb] dark:hover:bg-[#1e293b]/80"
                    >
                      Mes siguiente
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </ComponentCard>

        <Modal
          isOpen={detailOpen}
          onClose={closeDetailModal}
          ariaLabelledBy={DETAIL_MODAL_TITLE_ID}
          className={detailModalShellClass}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <header className="relative shrink-0 border-b border-[#e7ded0] bg-[#fcfaf6] px-4 py-4 pr-12 dark:border-[#334155] dark:bg-[#111827] sm:px-5 sm:py-5 sm:pr-14">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-[#ff801f]" aria-hidden />
              <div className="relative space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={erpSectionLabelClass}>Ventas · SICAR · CFDI</p>
                  <FacturaCfdiBadge>Timbrado</FacturaCfdiBadge>
                  {selectedFactura?.uuid ? <FacturaNeutralBadge>CFDI 4.0</FacturaNeutralBadge> : null}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h3
                      id={DETAIL_MODAL_TITLE_ID}
                      className="[font-family:Georgia,'Times_New_Roman',serif] text-[clamp(1.15rem,2.2vw,1.45rem)] font-medium leading-[1.15] tracking-[-0.02em] text-[#1c1917] dark:text-[#f8fafc]"
                    >
                      Detalle del comprobante
                    </h3>
                    {selectedFactura ? (
                      <p className="mt-2 font-mono text-[clamp(1rem,2vw,1.2rem)] font-semibold tabular-nums tracking-tight text-[#1c1917] dark:text-[#f8fafc]">
                        {selectedFactura.serie_folio || `Folio #${selectedFactura.fcf_id}`}
                      </p>
                    ) : null}
                    {selectedFactura?.nombre_c ? (
                      <p className="mt-1 text-sm leading-snug text-[#57534e] dark:text-[#b7c1d1]">{selectedFactura.nombre_c}</p>
                    ) : !selectedFactura ? (
                      <p className={`mt-1.5 text-sm ${erpBodyClass}`}>Comprobante fiscal digital timbrado.</p>
                    ) : null}
                  </div>
                  {selectedFactura ? (
                    <dl className="grid w-full shrink-0 grid-cols-2 gap-2 sm:w-auto sm:min-w-[14rem]">
                      <div className="rounded-xl border border-[#e7ded0]/80 bg-[#fffdfa]/90 px-3 py-2.5 dark:border-[#334155] dark:bg-[#0f172a]/80">
                        <dt className={detailLabelClass}>Subtotal</dt>
                        <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc]">
                          {money(selectedFactura.subtotal)}
                        </dd>
                      </div>
                      <div className="rounded-xl border border-[#ff801f]/25 bg-[#fff8f1]/90 px-3 py-2.5 dark:border-[#fb923c]/30 dark:bg-[#ff801f]/8">
                        <dt className={detailLabelClass}>Total</dt>
                        <dd className="mt-0.5 font-mono text-base font-semibold tabular-nums text-[#c2410c] dark:text-[#fb923c]">
                          {money(selectedFactura.total)}
                        </dd>
                      </div>
                    </dl>
                  ) : null}
                </div>
              </div>
            </header>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-[#faf9f5] px-4 py-4 dark:bg-[#0f172a]/40 sm:px-5 sm:py-5">
              {detailLoading ? (
                <div className="space-y-4" role="status" aria-live="polite" aria-label="Cargando detalle de CFDI">
                  <div className={`${detailSectionClass} p-5`}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-[#e7ded0]/80 dark:bg-[#334155]" />
                      <div className="flex-1 space-y-2.5">
                        <div className="h-4 w-2/5 animate-pulse rounded-lg bg-[#e7ded0]/80 dark:bg-[#334155]" />
                        <div className="h-3.5 w-3/5 animate-pulse rounded-lg bg-[#e7ded0]/60 dark:bg-[#334155]/80" />
                      </div>
                    </div>
                    <div className={`${detailMetaGridClass} mt-5`}>
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-14 animate-pulse bg-[#fffdfa] dark:bg-[#111827]" />
                      ))}
                    </div>
                  </div>
                  <p className="flex items-center justify-center gap-2 py-2 text-sm text-[#78716c] dark:text-[#8ea0b8]">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                    </svg>
                    Cargando detalle del CFDI…
                  </p>
                </div>
              ) : null}

              {!detailLoading && detailError ? (
                <div
                  className="rounded-2xl border border-red-200/80 bg-red-50/90 px-5 py-4 dark:border-red-900/40 dark:bg-red-950/30"
                  role="alert"
                >
                  <p className="text-sm font-semibold text-red-800 dark:text-red-300">{detailError}</p>
                  <p className="mt-1 text-sm text-red-700/90 dark:text-red-300/80">
                    Verifica la conexión a SICAR e intenta de nuevo.
                  </p>
                </div>
              ) : null}

              {!detailLoading && !detailError && selectedFactura ? (
                <div className="min-w-0 space-y-4">
                  <section className={detailSectionClass} aria-labelledby="cfdi-resumen-heading">
                    <div className={detailSectionHeadClass}>
                      <h4 id="cfdi-resumen-heading" className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                        Resumen fiscal
                      </h4>
                      <p className={`mt-0.5 ${facturaHintClass}`}>Receptor, emisión y condiciones de pago</p>
                    </div>
                    <dl className={detailMetaGridClass}>
                      <div className={detailMetaCellClass}>
                        <dt className={detailLabelClass}>RFC receptor</dt>
                        <dd className={`${detailValueClass} font-mono text-[13px]`}>{selectedFactura.rfc_c || "—"}</dd>
                      </div>
                      <div className={detailMetaCellClass}>
                        <dt className={detailLabelClass}>Fecha de emisión</dt>
                        <dd className={detailValueClass}>
                          {dateOnly(selectedFactura.fecha)}
                          {selectedFactura.fecha ? (
                            <span className="ml-1.5 text-xs font-normal text-[#78716c] dark:text-[#8ea0b8]">
                              {timeOnly(selectedFactura.fecha)}
                            </span>
                          ) : null}
                        </dd>
                      </div>
                      <div className={`${detailMetaCellClass} sm:col-span-1 lg:col-span-1`}>
                        <dt className={detailLabelClass}>Forma de pago</dt>
                        <dd className={`${detailValueClass} text-pretty`}>{selectedFactura.forma_pago || "—"}</dd>
                      </div>
                      <div className={detailMetaCellClass}>
                        <dt className={detailLabelClass}>Método de pago</dt>
                        <dd className={`${detailValueClass} text-pretty`}>{selectedFactura.metodo_pago || "—"}</dd>
                      </div>
                    </dl>
                    <div className="border-t border-[#e7ded0]/80 px-4 py-3 dark:border-white/[0.06] sm:px-5">
                      <dt className={detailLabelClass}>UUID (folio fiscal)</dt>
                      <dd className="mt-1.5 break-all rounded-lg border border-[#e7ded0]/70 bg-[#faf9f5] px-3 py-2 font-mono text-[11px] leading-relaxed text-[#44403c] dark:border-[#334155] dark:bg-[#0f172a]/60 dark:text-[#cbd5e1] sm:text-xs">
                        {selectedFactura.uuid || "—"}
                      </dd>
                    </div>
                  </section>

                  <section className={detailSectionClass} aria-labelledby="cfdi-archivos-heading">
                    <div className={`${detailSectionHeadClass} flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between`}>
                      <h4 id="cfdi-archivos-heading" className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                        Archivos fiscales
                      </h4>
                      <span className="text-xs text-[#78716c] dark:text-[#8ea0b8]">XML timbrado y PDF de representación</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 sm:p-5">
                      <button
                        type="button"
                        disabled={downloadingFile !== null}
                        aria-busy={downloadingFile === "xml"}
                        onClick={() => selectedFactura && void handleDownloadCfdi(selectedFactura, "xml")}
                        className={detailDownloadBtnClass}
                      >
                        <svg className="h-5 w-5 shrink-0 text-[#78716c] dark:text-[#8ea0b8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                          <path d="M8 3h8l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
                          <path d="M9 13h6M9 17h4M9 9h1" strokeLinecap="round" />
                        </svg>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]">
                            {downloadingFile === "xml" ? "Descargando XML…" : "Descargar XML"}
                          </span>
                          <span className="mt-0.5 block text-xs text-[#78716c] dark:text-[#8ea0b8]">Comprobante original SICAR</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={downloadingFile !== null}
                        aria-busy={downloadingFile === "pdf"}
                        onClick={() => selectedFactura && void handleDownloadCfdi(selectedFactura, "pdf")}
                        className={detailDownloadBtnClass}
                      >
                        <PdfDocGlyph className="h-5 w-5 shrink-0 text-[#78716c] dark:text-[#8ea0b8]" />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]">
                            {downloadingFile === "pdf" ? "Generando PDF…" : "Descargar PDF"}
                          </span>
                          <span className="mt-0.5 block text-xs text-[#78716c] dark:text-[#8ea0b8]">Representación impresa del CFDI</span>
                        </span>
                      </button>
                    </div>
                    {downloadError ? (
                      <p
                        className="mx-4 mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 sm:mx-5"
                        role="alert"
                      >
                        {downloadError}
                      </p>
                    ) : null}
                  </section>

                  {mainCfdiRecord ? (
                    <section className={`${detailSectionClass} space-y-0`} aria-labelledby="cfdi-datos-heading">
                      <div className={`${detailSectionHeadClass} flex flex-wrap items-center justify-between gap-2`}>
                        <div>
                          <h4 id="cfdi-datos-heading" className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                            Datos del comprobante
                          </h4>
                          <p className={`mt-0.5 ${facturaHintClass}`}>Campos devueltos por SICAR</p>
                        </div>
                        <span className="rounded-full border border-[#e7ded0] bg-[#fffdfa] px-2.5 py-1 text-[11px] font-medium text-[#78716c] dark:border-[#334155] dark:bg-[#111827] dark:text-[#8ea0b8]">
                          {Object.keys(mainCfdiRecord).length} campos
                        </span>
                      </div>
                      <dl className={`${detailMetaGridClass} min-w-0 sm:grid-cols-2`}>
                        {Object.entries(mainCfdiRecord).map(([key, value]) => (
                          <div key={key} className={detailMetaCellClass}>
                            <dt className={`${detailLabelClass} break-all`}>{key}</dt>
                            <dd className={detailValueClass} title={formatDetailValue(value)}>
                              {formatDetailField(key, value)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  ) : null}

                  {tableNames
                    .filter((name) => name !== "facturacfdi")
                    .map((tableName) => {
                      const items = detailTables[tableName] || [];
                      const first = items[0] || {};
                      const columns = Object.keys(first);
                      const sectionLabel = TABLE_LABELS[tableName] || tableName;

                      return (
                        <section key={tableName} className={detailSectionClass} aria-labelledby={`cfdi-table-${tableName}`}>
                          <div className={`${detailSectionHeadClass} flex flex-wrap items-center gap-2`}>
                            <h4 id={`cfdi-table-${tableName}`} className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                              {sectionLabel}
                            </h4>
                            <span className="rounded-full bg-[#ff801f]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#ea580c] dark:bg-[#ff801f]/15 dark:text-[#fb923c]">
                              {items.length} registro{items.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          {items.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-[#78716c] dark:text-[#8ea0b8] sm:px-5">
                              Sin registros en esta sección.
                            </p>
                          ) : (
                            <>
                              <p className="flex items-center gap-1.5 px-4 pb-2 text-[11px] text-[#78716c] dark:text-[#8ea0b8] sm:hidden">
                                <span className="inline-block h-px w-4 bg-[#ea580c]/70 dark:bg-[#fb923c]/70" aria-hidden />
                                Desliza para ver todas las columnas
                              </p>
                              <div className={`${erpTableWrapClass} min-w-0 rounded-none border-0 border-t border-[#e7ded0] dark:border-[#334155]`}>
                                <Table className="min-w-[36rem] table-auto text-left text-xs sm:min-w-full">
                                  <TableHeader className={erpTableHeaderClass}>
                                    <TableRow>
                                      {columns.map((c) => (
                                        <TableCell key={c} isHeader scope="col" className="whitespace-nowrap px-3 py-2.5 font-semibold">
                                          {c}
                                        </TableCell>
                                      ))}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody className="divide-y divide-[#f5f0e8] dark:divide-[#334155]/80">
                                    {items.map((row, idx) => (
                                      <TableRow key={`${tableName}-${idx}`} className="hover:bg-[#fffdf8] dark:hover:bg-[#1e293b]/40">
                                        {columns.map((c) => (
                                          <TableCell
                                            key={`${tableName}-${idx}-${c}`}
                                            className="max-w-[18rem] break-words px-3 py-2.5 align-top text-[#44403c] dark:text-[#e5e7eb]"
                                          >
                                            <span title={formatDetailValue((row as Record<string, unknown>)[c])}>
                                              {formatDetailField(c, (row as Record<string, unknown>)[c])}
                                            </span>
                                          </TableCell>
                                        ))}
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </>
                          )}
                        </section>
                      );
                    })}
                </div>
              ) : null}
            </div>

            <footer className="shrink-0 border-t border-[#e7ded0] bg-[#fcfaf6] px-4 py-3 dark:border-[#334155] dark:bg-[#111827] sm:px-5">
              <button
                type="button"
                onClick={closeDetailModal}
                className={`${erpSecondaryBtnClass} min-h-[44px] w-full sm:ml-auto sm:w-auto`}
              >
                Cerrar
              </button>
            </footer>
          </div>
        </Modal>

        <NuevaFacturaCfdiModal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => void loadFacturas()}
        />

        <OrdenPdfLoadingModal
          open={pdfLoadingOpen}
          downloading
          title="Generando PDF"
          hint="Preparando la representación impresa del CFDI. No cierre esta ventana."
          footerHint="Preparando archivo…"
        />
      </div>
    </div>
  );
}
