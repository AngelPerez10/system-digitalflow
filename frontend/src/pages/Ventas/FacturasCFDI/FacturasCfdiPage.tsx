import PageMeta from "@/components/common/PageMeta";
import { PdfDocGlyph } from "@/components/icons/PdfDocGlyph";
import { fetchSicarApi } from "./sicarApi";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { OrdenPdfLoadingModal } from "@/pages/Operacion/OrdenesTrabajo/OrdenServicio/list/OrdenPdfLoadingModal";
import { useAuth } from "@/context/AuthContext";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import NuevaFacturaCfdiModal from "./NuevaFacturaCfdiModal";
import { FacturaCfdiBadge, facturaHintClass } from "./facturaTabUi";

/* Mismo sistema visual que Servicios / Clientes / Perfil:
   marino + dorado, azul eléctrico como acento de acción. */

const sheetFontStyle = { fontFamily: "Geist, Outfit, system-ui, sans-serif" } as const;

const sectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]";

const panelClass =
  "overflow-hidden rounded-[24px] border border-[#E7E7EA] bg-white shadow-[0_6px_20px_-10px_rgba(9,9,11,0.14)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_10px_28px_-12px_rgba(0,0,0,0.6)]";

const inputFieldToneClass =
  "border-[#E7E7EA] bg-white text-[#09090B] caret-[#09090B] scheme-light placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:caret-[#F8FAFC] dark:scheme-dark dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)]";

const searchInputClass = `h-12 w-full rounded-[10px] border pl-10 pr-10 text-[15px] tracking-[-0.1px] outline-none transition-colors sm:h-11 ${inputFieldToneClass}`;

const primaryBtnClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[#1B5CFF] bg-[#1B5CFF] px-6 text-[15px] font-medium tracking-[-0.1px] text-white transition-[background-color,border-color,transform] duration-150 hover:border-[#1244D1] hover:bg-[#1244D1] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:border-[#DCE7FF] disabled:bg-[#DCE7FF] disabled:text-[#2F4899] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:border-[#3B6AF0] dark:hover:bg-[#3B6AF0] max-sm:w-full sm:h-11";

const secondaryBtnClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-[#E7E7EA] bg-white px-5 text-[15px] font-medium tracking-[-0.1px] text-[#09090B] transition-[background-color,border-color,transform] duration-150 hover:border-[#D3D3D8] hover:bg-[#FAFAFA] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:hover:bg-[#243048] max-sm:w-full sm:h-11";

const pagerBtnClass =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-[#E7E7EA] bg-white text-[#09090B] transition-colors hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] disabled:cursor-not-allowed disabled:opacity-45 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:bg-[#243048]";

const actionBtnClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E7E7EA] bg-white text-[#6E6E77] transition-colors hover:border-[#1B5CFF]/50 hover:text-[#1B5CFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] disabled:pointer-events-none disabled:opacity-50 dark:border-[#273244] dark:bg-[#111827] dark:text-[#8EA0B8] dark:hover:border-[#4B7CFF]/50 dark:hover:text-[#4B7CFF]";

const tableWrapClass =
  "overflow-x-auto rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#1B2539]";

const tableHeaderClass =
  "sticky top-0 z-10 border-b border-[#E7E7EA] bg-white text-[11px] font-semibold text-[#09090B] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC]";

const thClass = "px-3 py-2 text-left align-middle text-[#52525B] dark:text-[#B7C1D1]";

const tableBodyClass =
  "divide-y divide-[#EDEDED] bg-white text-[12px] text-[#44403c] dark:divide-[#273244] dark:bg-[#111827] dark:text-[#e5e7eb]";

const modalHeaderIconClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]";

const iconSvgProps = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

type AlertVariant = "success" | "error" | "warning" | "info";

const alertTone: Record<AlertVariant, { border: string; bg: string; dot: string; title: string; msg: string }> = {
  success: {
    border: "border-[#BFE6D4] dark:border-[#1E5A42]",
    bg: "bg-[#E9F8F0] dark:bg-[#0F2A1C]",
    dot: "bg-[#04724D] dark:bg-[#4ADE80]",
    title: "text-[#04724D] dark:text-[#4ADE80]",
    msg: "text-[#04724D]/85 dark:text-[#4ADE80]/80",
  },
  error: {
    border: "border-[#F6CFCF] dark:border-[#7F1D1D]",
    bg: "bg-[#FEF2F2] dark:bg-[#3F1518]",
    dot: "bg-[#C22B2B] dark:bg-[#F87171]",
    title: "text-[#C22B2B] dark:text-[#F87171]",
    msg: "text-[#C22B2B]/85 dark:text-[#F87171]/80",
  },
  warning: {
    border: "border-[rgba(230,162,60,0.4)] dark:border-[rgba(230,162,60,0.3)]",
    bg: "bg-[rgba(230,162,60,0.10)] dark:bg-[rgba(230,162,60,0.10)]",
    dot: "bg-[#9A6B15] dark:bg-[#E6A23C]",
    title: "text-[#9A6B15] dark:text-[#E6A23C]",
    msg: "text-[#9A6B15]/85 dark:text-[#E6A23C]/85",
  },
  info: {
    border: "border-[rgba(27,92,255,0.28)] dark:border-[rgba(75,124,255,0.3)]",
    bg: "bg-[rgba(27,92,255,0.06)] dark:bg-[rgba(75,124,255,0.10)]",
    dot: "bg-[#1B5CFF] dark:bg-[#4B7CFF]",
    title: "text-[#1B5CFF] dark:text-[#4B7CFF]",
    msg: "text-[#1B5CFF]/85 dark:text-[#4B7CFF]/85",
  },
};

function InlineAlert({ variant, title, message }: { variant: AlertVariant; title: string; message: string }) {
  const tone = alertTone[variant];
  const assertive = variant === "error" || variant === "warning";
  return (
    <div
      role={assertive ? "alert" : "status"}
      aria-live={assertive ? "assertive" : "polite"}
      className={`flex items-start gap-3 rounded-[14px] border px-4 py-3 ${tone.border} ${tone.bg}`}
    >
      <span className={`mt-1.5 size-[7px] shrink-0 rounded-full ${tone.dot}`} aria-hidden />
      <div className="min-w-0">
        <p className={`text-[15px] font-medium ${tone.title}`}>{title}</p>
        <p className={`mt-0.5 text-[13px] ${tone.msg}`}>{message}</p>
      </div>
    </div>
  );
}

function CfdiRowActions({
  label,
  disabled,
  onDetail,
  onXml,
  onPdf,
}: {
  label: string;
  disabled: boolean;
  onDetail: () => void;
  onXml: () => void;
  onPdf: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-[8px] bg-[#FAFAFA] px-1.5 py-1 dark:bg-white/[0.06]">
      <button type="button" title="Ver detalle" aria-label={`Ver detalle del CFDI ${label}`} onClick={onDetail} className={actionBtnClass}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
      <button
        type="button"
        title="Descargar XML"
        aria-label={`Descargar XML ${label}`}
        disabled={disabled}
        onClick={onXml}
        className={actionBtnClass}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M8 3h8l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
          <path d="M9 13h6M9 17h4M9 9h1" strokeLinecap="round" />
        </svg>
      </button>
      <button
        type="button"
        title="Descargar PDF"
        aria-label={`Descargar PDF ${label}`}
        disabled={disabled}
        onClick={onPdf}
        className={actionBtnClass}
      >
        <PdfDocGlyph className="h-4 w-4" />
      </button>
    </div>
  );
}

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
  "my-2 flex max-h-[min(92dvh,52rem)] w-[calc(100vw-0.75rem)] max-w-[44rem] min-h-0 flex-col overflow-hidden rounded-t-[20px] border border-[#E7E7EA] bg-white p-0 shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:!bg-[#111827] sm:my-6 sm:w-[min(94vw,48rem)] sm:max-w-3xl sm:rounded-[20px] lg:max-w-4xl";

const detailSectionClass =
  "overflow-hidden rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#1B2539]";

const detailSectionHeadClass = "border-b border-[#E7E7EA] px-4 py-3 dark:border-[#273244] sm:px-5";

const detailMetaGridClass =
  "grid grid-cols-1 gap-px bg-[#E7E7EA] dark:bg-[#273244] sm:grid-cols-2 lg:grid-cols-4";

const detailMetaCellClass = "min-w-0 bg-white px-3.5 py-3 dark:bg-[#111827] sm:px-4 sm:py-3.5";

const detailLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8] sm:text-[11px]";

const detailValueClass = "mt-1 break-words text-sm font-medium text-[#09090B] dark:text-[#F8FAFC]";

const detailDownloadBtnClass = `${secondaryBtnClass} !min-h-[44px] !w-full !justify-start !gap-3 !px-3.5 !py-3 !text-left`;

const modalHeaderClass = "relative shrink-0 bg-[#17235B] px-5 py-5 pr-14 dark:bg-[#1B2A63] sm:px-6";
const modalFooterClass =
  "shrink-0 border-t border-[#E7E7EA] bg-[#FAFAFA] px-5 py-4 dark:border-[#273244] dark:bg-[#151E32] sm:px-6";
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
  const detailModalTitleId = useId();
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
  const [flashSuccess, setFlashSuccess] = useState("");

  useEffect(() => {
    if (!flashSuccess) return;
    const t = window.setTimeout(() => setFlashSuccess(""), 3500);
    return () => window.clearTimeout(t);
  }, [flashSuccess]);

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
    <div className="min-h-[calc(100dvh-5rem)] w-full min-w-0 overflow-x-hidden">
      <div
        className="mx-auto w-full max-w-[min(100%,1400px)] space-y-5 px-3 pb-10 pt-4 sm:px-5 sm:pb-12 sm:pt-6 md:px-6 lg:px-8"
        style={sheetFontStyle}
      >
        <PageMeta title="Facturas CFDI | Ventas" description="Facturas CFDI timbradas desde SICAR" />

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
          <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]">Facturas CFDI</span>
        </nav>

        {flashSuccess ? (
          <div className="mb-4">
            <InlineAlert variant="success" title="Factura timbrada" message={flashSuccess} />
          </div>
        ) : null}

        {error ? (
          <div className="mb-4">
            <InlineAlert
              variant="error"
              title="No se pudieron cargar las facturas"
              message={
                /tiempo de espera|vpn|red corporativa/i.test(error)
                  ? `${error} Conecta la VPN o la red de la oficina (192.168.10.x) y recarga.`
                  : `${error} Verifica la conexión a SICAR y que el servidor Django pueda alcanzar la base MySQL.`
              }
            />
          </div>
        ) : null}

        <div className="space-y-5">
          <header className="relative overflow-hidden rounded-[24px] bg-[#17235B] px-5 py-6 dark:bg-[#1B2A63] sm:px-8 sm:py-8">
            <div
              className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#E6A23C]/15 blur-3xl"
              aria-hidden
            />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
              <div className="flex min-w-0 items-start gap-4">
                <span className={modalHeaderIconClass}>
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinejoin="round"
                    />
                    <path d="M14 2v6h6M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">Ventas · SICAR</p>
                  <h1 className="mt-1 text-[26px] font-bold leading-[1.15] tracking-[-0.9px] text-white sm:text-[32px] sm:tracking-[-1.1px]">
                    Facturas CFDI
                  </h1>
                  <p className="mt-1.5 max-w-[58ch] text-[15px] leading-[22px] tracking-[-0.1px] text-white/70">
                    Consulta facturas timbradas desde SICAR. Navega mes a mes o busca por folio, cliente, RFC o UUID.
                  </p>
                </div>
              </div>

              <div className="flex w-full shrink-0 flex-wrap items-center gap-2 lg:w-auto" role="group" aria-label="Resumen del periodo">
                <div className="inline-flex h-[3.25rem] items-center gap-3 rounded-[16px] bg-white/10 px-4">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-white/10 text-[#E6A23C]">
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/55">
                      {isSearching ? "Importe" : `Importe · ${mesVisibleLabel}`}
                    </p>
                    <p className="text-[18px] font-semibold tabular-nums leading-none text-white">{money(importeMesVisible)}</p>
                  </div>
                </div>
                <div className="inline-flex h-[3.25rem] items-center gap-3 rounded-[16px] bg-white/10 px-4">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-white/10 text-[#E6A23C]">
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/55">
                      {isSearching ? "Resultados" : "Comprobantes"}
                    </p>
                    <p className="text-[18px] font-semibold tabular-nums leading-none text-white">
                      {facturasEnMesVisible.toLocaleString("es-MX")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <form onSubmit={handleSearch} className="relative min-w-0">
              <label htmlFor="cfdi-search-input" className="sr-only">
                Buscar facturas CFDI
              </label>
              <svg
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#A1A1AA]"
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
                className={searchInputClass}
              />
              {busquedaInput ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Limpiar búsqueda"
                  className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-9 w-10 items-center justify-center rounded-[8px] text-[#A1A1AA] transition-colors hover:bg-[#FAFAFA] hover:text-[#52525B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:hover:bg-white/[0.06] dark:hover:text-[#F8FAFC]"
                >
                  <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden>
                    <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
                  </svg>
                </button>
              ) : null}
            </form>
            {canCreateFactura ? (
              <button type="button" onClick={() => setCreateOpen(true)} className={primaryBtnClass}>
                <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
                Nueva factura
              </button>
            ) : null}
          </div>

          <section className={panelClass} aria-labelledby="cfdi-listado-heading">
            <div className="border-b border-[#E7E7EA] px-4 py-4 dark:border-[#273244] sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="inline-flex size-7 items-center justify-center rounded-[9px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                    <svg {...iconSvgProps} className="size-4">
                      <rect x="3" y="4" width="18" height="17" rx="2.2" />
                      <path d="M3 9.5h18" />
                    </svg>
                  </span>
                  <h2 id="cfdi-listado-heading" className={sectionLabelClass}>
                    Listado de facturas CFDI
                  </h2>
                </div>
                <p className="text-[12px] font-medium tabular-nums text-[#6E6E77] dark:text-[#8EA0B8]">
                  {isSearching
                    ? `${total.toLocaleString("es-MX")} resultado${total === 1 ? "" : "s"}`
                    : currentMonthBucket
                      ? `${monthLabel(currentMonthBucket.month_key)} · ${currentMonthTotal.toLocaleString("es-MX")}`
                      : "Sin mes seleccionado"}
                </p>
              </div>
              <p className="mt-2 text-[14px] leading-[20px] text-[#52525B] dark:text-[#B7C1D1]">
                {isSearching
                  ? `Resultados para «${busqueda}».`
                  : "Comprobantes del mes visible."}
              </p>
            </div>

            <div className="p-2 sm:p-3">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] text-[#6E6E77] dark:text-[#8EA0B8] sm:hidden">
                <span className="inline-block h-px w-4 bg-[#1B5CFF]/70" aria-hidden />
                Desliza horizontalmente para ver el listado completo
              </p>
              <div className={tableWrapClass}>
                <Table className="w-full min-w-[1020px] table-fixed sm:min-w-0 xl:min-w-full">
                  <TableHeader className={tableHeaderClass}>
                    <TableRow>
                      <TableCell isHeader scope="col" className={`${thClass} w-[72px]`}>
                        Folio
                      </TableCell>
                      <TableCell isHeader scope="col" className={`${thClass} w-[160px]`}>
                        Cliente
                      </TableCell>
                      <TableCell isHeader scope="col" className={`${thClass} w-[108px]`}>
                        RFC
                      </TableCell>
                      <TableCell isHeader scope="col" className={`${thClass} w-[120px]`}>
                        Fecha
                      </TableCell>
                      <TableCell isHeader scope="col" className={`${thClass} w-[108px] text-right`}>
                        Total
                      </TableCell>
                      <TableCell isHeader scope="col" className={`${thClass} w-[120px]`}>
                        Forma de pago
                      </TableCell>
                      <TableCell isHeader scope="col" className={`${thClass} w-[120px]`}>
                        Método de pago
                      </TableCell>
                      <TableCell isHeader scope="col" className={`${thClass} w-[118px] text-center`}>
                        Acciones
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className={tableBodyClass}>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="px-3 py-10 text-center text-[#6E6E77] dark:text-[#8EA0B8]">
                          <div className="inline-flex items-center gap-2 text-[15px]" role="status">
                            <svg {...iconSvgProps} className="size-4 animate-spin" strokeWidth={2}>
                              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                            Cargando facturas CFDI…
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : displayRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="px-3 py-12 text-center">
                          <div className="flex flex-col items-center gap-4 py-6">
                            <span className="inline-flex size-14 items-center justify-center rounded-[16px] bg-[rgba(230,162,60,0.16)] text-[#9A6B15] dark:text-[#E6A23C]">
                              <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" strokeLinejoin="round" />
                                <path d="M14 2v6h6" strokeLinejoin="round" />
                              </svg>
                            </span>
                            <div>
                              <p className="text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                                {isSearching ? "Ningún CFDI coincide con la búsqueda" : "No hay facturas CFDI en este mes"}
                              </p>
                              <p className="mt-1 text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">
                                {isSearching ? "Ajusta la búsqueda o limpia el filtro." : "Cambia de mes o crea una nueva factura."}
                              </p>
                            </div>
                            {canCreateFactura && !isSearching ? (
                              <button type="button" onClick={() => setCreateOpen(true)} className={primaryBtnClass}>
                                <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                                </svg>
                                Nueva factura
                              </button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayRows.map((r) => {
                        const rowLabel = String(r.serie_folio || r.fcf_id);
                        return (
                          <TableRow key={r.fcf_id} className="transition-colors hover:bg-[#FAFAFA] dark:hover:bg-white/[0.04]">
                            <TableCell className="px-3 py-2 align-middle">
                              <div className="font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
                                {r.serie_folio || r.folio || `#${r.fcf_id}`}
                              </div>
                              <div className="mt-0.5 text-[10px] text-[#6E6E77] dark:text-[#8EA0B8]">ID {r.fcf_id}</div>
                            </TableCell>
                            <TableCell className="max-w-[160px] overflow-hidden px-3 py-2 align-middle">
                              <span className="block truncate font-medium text-[#09090B] dark:text-[#F8FAFC]" title={r.nombre_c}>
                                {r.nombre_c || "—"}
                              </span>
                            </TableCell>
                            <TableCell className="px-3 py-2 align-middle whitespace-nowrap font-mono text-[11px]">
                              {r.rfc_c || "—"}
                            </TableCell>
                            <TableCell className="px-3 py-2 align-middle whitespace-nowrap">
                              <div className="text-[#09090B] dark:text-[#F8FAFC]">{dateOnly(r.fecha)}</div>
                              <div className="text-[10px] text-[#6E6E77] dark:text-[#8EA0B8]">{timeOnly(r.fecha)}</div>
                            </TableCell>
                            <TableCell className="px-3 py-2 align-middle text-right font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
                              {money(r.total)}
                            </TableCell>
                            <TableCell className="max-w-[120px] overflow-hidden px-3 py-2 align-middle">
                              <span className="block truncate text-[11px]" title={r.forma_pago}>
                                {r.forma_pago || "—"}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-[120px] overflow-hidden px-3 py-2 align-middle">
                              <span className="block truncate text-[11px]" title={r.metodo_pago}>
                                {r.metodo_pago || "—"}
                              </span>
                            </TableCell>
                            <TableCell className="px-3 py-2 text-center align-middle">
                              <CfdiRowActions
                                label={rowLabel}
                                disabled={pdfLoadingOpen}
                                onDetail={() => void openDetail(r)}
                                onXml={() => void handleDownloadCfdi(r, "xml")}
                                onPdf={() => void handleDownloadPdf(r)}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {!loading && !error && (isSearching ? total > 0 : displayRows.length > 0) ? (
                <div className="mt-3 border-t border-[#E7E7EA] px-2 pt-4 dark:border-[#273244] sm:px-3">
                  {isSearching ? (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-[#6E6E77] dark:text-[#8EA0B8]">
                        Mostrando{" "}
                        <span className="font-medium text-[#09090B] dark:text-[#F8FAFC]">{startIndex + 1}</span> a{" "}
                        <span className="font-medium text-[#09090B] dark:text-[#F8FAFC]">{endIndex}</span> de{" "}
                        <span className="font-medium text-[#09090B] dark:text-[#F8FAFC]">{total.toLocaleString("es-MX")}</span>{" "}
                        CFDI
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page <= 1}
                          aria-label="Página anterior"
                          className={pagerBtnClass}
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
                              aria-label={`Ir a la página ${p}`}
                              aria-current={p === page ? "page" : undefined}
                              className={`inline-flex size-10 items-center justify-center rounded-[10px] border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] ${
                                page === p
                                  ? "border-[#1B5CFF] bg-[#1B5CFF] text-white dark:border-[#4B7CFF] dark:bg-[#4B7CFF]"
                                  : "border-[#E7E7EA] bg-white text-[#09090B] hover:bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:hover:bg-white/[0.06]"
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
                          className={pagerBtnClass}
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-[#6E6E77] dark:text-[#8EA0B8]">
                        <span className="font-medium text-[#09090B] dark:text-[#F8FAFC]">
                          {currentMonthBucket ? monthLabel(currentMonthBucket.month_key) : "—"}
                        </span>
                        {months.length > 0 && monthIndex >= 0 ? (
                          <>
                            {" "}
                            · mes {monthIndex + 1} de {months.length}
                          </>
                        ) : null}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={goOlderMonth} disabled={!canGoOlder || loading} className={secondaryBtnClass}>
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M15 18l-6-6 6-6" />
                          </svg>
                          Mes anterior
                        </button>
                        <button type="button" onClick={goNewerMonth} disabled={!canGoNewer || loading} className={secondaryBtnClass}>
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
            </div>
          </section>
        </div>

        <Modal
          isOpen={detailOpen}
          onClose={closeDetailModal}
          ariaLabelledBy={detailModalTitleId}
          className={detailModalShellClass}
          mobileBottomSheet
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <header className={modalHeaderClass}>
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
                <span className={modalHeaderIconClass}>
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinejoin="round"
                    />
                    <path d="M14 2v6h6M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  </svg>
                </span>
                <div className="relative min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">Ventas · SICAR · CFDI</p>
                    <FacturaCfdiBadge>Timbrado</FacturaCfdiBadge>
                    {selectedFactura?.uuid ? (
                      <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/80">
                        CFDI 4.0
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 id={detailModalTitleId} className="text-[20px] font-semibold leading-[1.25] tracking-[-0.5px] text-white">
                        Detalle del comprobante
                      </h3>
                      {selectedFactura ? (
                        <p className="mt-2 font-mono text-[clamp(1rem,2vw,1.2rem)] font-semibold tabular-nums tracking-tight text-white">
                          {selectedFactura.serie_folio || `Folio #${selectedFactura.fcf_id}`}
                        </p>
                      ) : null}
                      {selectedFactura?.nombre_c ? (
                        <p className="mt-1 text-sm leading-snug text-white/70">{selectedFactura.nombre_c}</p>
                      ) : !selectedFactura ? (
                        <p className="mt-1.5 text-sm text-white/70">Comprobante fiscal digital timbrado.</p>
                      ) : null}
                    </div>
                    {selectedFactura ? (
                      <dl className="grid w-full shrink-0 grid-cols-2 gap-2 sm:w-auto sm:min-w-[14rem]">
                        <div className="rounded-[12px] border border-white/15 bg-white/10 px-3 py-2.5">
                          <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">Subtotal</dt>
                          <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-white">
                            {money(selectedFactura.subtotal)}
                          </dd>
                        </div>
                        <div className="rounded-[12px] border border-[#E6A23C]/35 bg-[rgba(230,162,60,0.16)] px-3 py-2.5">
                          <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#E6A23C]">Total</dt>
                          <dd className="mt-0.5 font-mono text-base font-semibold tabular-nums text-[#E6A23C]">
                            {money(selectedFactura.total)}
                          </dd>
                        </div>
                      </dl>
                    ) : null}
                  </div>
                </div>
              </div>
            </header>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-white px-4 py-4 dark:bg-[#111827] sm:px-5 sm:py-5">
              {detailLoading ? (
                <div className="space-y-4" role="status" aria-live="polite" aria-label="Cargando detalle de CFDI">
                  <div className={`${detailSectionClass} p-5`}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="h-12 w-12 shrink-0 animate-pulse rounded-[12px] bg-[#E7E7EA] dark:bg-[#273244]" />
                      <div className="flex-1 space-y-2.5">
                        <div className="h-4 w-2/5 animate-pulse rounded-lg bg-[#E7E7EA] dark:bg-[#273244]" />
                        <div className="h-3.5 w-3/5 animate-pulse rounded-lg bg-[#E7E7EA]/80 dark:bg-[#273244]/80" />
                      </div>
                    </div>
                    <div className={`${detailMetaGridClass} mt-5`}>
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-14 animate-pulse bg-white dark:bg-[#111827]" />
                      ))}
                    </div>
                  </div>
                  <p className="flex items-center justify-center gap-2 py-2 text-sm text-[#6E6E77] dark:text-[#8EA0B8]">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                    </svg>
                    Cargando detalle del CFDI…
                  </p>
                </div>
              ) : null}

              {!detailLoading && detailError ? (
                <InlineAlert
                  variant="error"
                  title="No se pudo cargar el detalle"
                  message={`${detailError} Verifica la conexión a SICAR e intenta de nuevo.`}
                />
              ) : null}

              {!detailLoading && !detailError && selectedFactura ? (
                <div className="min-w-0 space-y-4">
                  <section className={detailSectionClass} aria-labelledby="cfdi-resumen-heading">
                    <div className={detailSectionHeadClass}>
                      <h4 id="cfdi-resumen-heading" className="text-sm font-semibold text-[#09090B] dark:text-[#F8FAFC]">
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
                            <span className="ml-1.5 text-xs font-normal text-[#6E6E77] dark:text-[#8ea0b8]">
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
                    <div className="border-t border-[#E7E7EA]/80 px-4 py-3 dark:border-white/[0.06] sm:px-5">
                      <dt className={detailLabelClass}>UUID (folio fiscal)</dt>
                      <dd className="mt-1.5 break-all rounded-[10px] border border-[#E7E7EA] bg-white px-3 py-2 font-mono text-[11px] leading-relaxed text-[#52525B] dark:border-[#273244] dark:bg-[#0f172a]/60 dark:text-[#cbd5e1] sm:text-xs">
                        {selectedFactura.uuid || "—"}
                      </dd>
                    </div>
                  </section>

                  <section className={detailSectionClass} aria-labelledby="cfdi-archivos-heading">
                    <div className={`${detailSectionHeadClass} flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between`}>
                      <h4 id="cfdi-archivos-heading" className="text-sm font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                        Archivos fiscales
                      </h4>
                      <span className="text-xs text-[#6E6E77] dark:text-[#8ea0b8]">XML timbrado y PDF de representación</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 sm:p-5">
                      <button
                        type="button"
                        disabled={downloadingFile !== null}
                        aria-busy={downloadingFile === "xml"}
                        onClick={() => selectedFactura && void handleDownloadCfdi(selectedFactura, "xml")}
                        className={detailDownloadBtnClass}
                      >
                        <svg className="h-5 w-5 shrink-0 text-[#6E6E77] dark:text-[#8ea0b8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                          <path d="M8 3h8l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
                          <path d="M9 13h6M9 17h4M9 9h1" strokeLinecap="round" />
                        </svg>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-[#09090B] dark:text-[#F8FAFC]">
                            {downloadingFile === "xml" ? "Descargando XML…" : "Descargar XML"}
                          </span>
                          <span className="mt-0.5 block text-xs text-[#6E6E77] dark:text-[#8ea0b8]">Comprobante original SICAR</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={downloadingFile !== null}
                        aria-busy={downloadingFile === "pdf"}
                        onClick={() => selectedFactura && void handleDownloadCfdi(selectedFactura, "pdf")}
                        className={detailDownloadBtnClass}
                      >
                        <PdfDocGlyph className="h-5 w-5 shrink-0 text-[#6E6E77] dark:text-[#8ea0b8]" />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-[#09090B] dark:text-[#F8FAFC]">
                            {downloadingFile === "pdf" ? "Generando PDF…" : "Descargar PDF"}
                          </span>
                          <span className="mt-0.5 block text-xs text-[#6E6E77] dark:text-[#8ea0b8]">Representación impresa del CFDI</span>
                        </span>
                      </button>
                    </div>
                    {downloadError ? (
                      <div className="mx-4 mb-4 sm:mx-5">
                        <InlineAlert variant="error" title="Error al descargar" message={downloadError} />
                      </div>
                    ) : null}
                  </section>

                  {mainCfdiRecord ? (
                    <section className={`${detailSectionClass} space-y-0`} aria-labelledby="cfdi-datos-heading">
                      <div className={`${detailSectionHeadClass} flex flex-wrap items-center justify-between gap-2`}>
                        <div>
                          <h4 id="cfdi-datos-heading" className="text-sm font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                            Datos del comprobante
                          </h4>
                          <p className={`mt-0.5 ${facturaHintClass}`}>Campos devueltos por SICAR</p>
                        </div>
                        <span className="rounded-full border border-[#E7E7EA] bg-white px-2.5 py-1 text-[11px] font-medium text-[#6E6E77] dark:border-[#273244] dark:bg-[#111827] dark:text-[#8EA0B8]">
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
                            <h4 id={`cfdi-table-${tableName}`} className="text-sm font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                              {sectionLabel}
                            </h4>
                            <span className="rounded-full bg-[rgba(27,92,255,0.10)] px-2.5 py-0.5 text-[11px] font-semibold text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                              {items.length} registro{items.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          {items.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-[#6E6E77] dark:text-[#8ea0b8] sm:px-5">
                              Sin registros en esta sección.
                            </p>
                          ) : (
                            <>
                              <p className="flex items-center gap-1.5 px-4 pb-2 text-[11px] text-[#6E6E77] dark:text-[#8ea0b8] sm:hidden">
                                <span className="inline-block h-px w-4 bg-[#1B5CFF]/70" aria-hidden />
                                Desliza para ver todas las columnas
                              </p>
                              <div className={`${tableWrapClass} min-w-0 rounded-none border-0 border-t border-[#E7E7EA] dark:border-[#273244]`}>
                                <Table className="min-w-[36rem] table-auto text-left text-xs sm:min-w-full">
                                  <TableHeader className={tableHeaderClass}>
                                    <TableRow>
                                      {columns.map((c) => (
                                        <TableCell key={c} isHeader scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">
                                          {c}
                                        </TableCell>
                                      ))}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody className="divide-y divide-[#f5f0e8] dark:divide-[#334155]/80">
                                    {items.map((row, idx) => (
                                      <TableRow key={`${tableName}-${idx}`} className="hover:bg-[#FAFAFA] dark:hover:bg-white/[0.04]">
                                        {columns.map((c) => (
                                          <TableCell
                                            key={`${tableName}-${idx}-${c}`}
                                            className="max-w-[18rem] break-words px-3 py-2 align-middle text-[#52525B] dark:text-[#e5e7eb]"
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

            <footer className={modalFooterClass}>
              <button type="button" onClick={closeDetailModal} className={`${secondaryBtnClass} min-h-[44px] w-full sm:ml-auto sm:w-auto`}>
                Cerrar
              </button>
            </footer>
          </div>
        </Modal>

        <NuevaFacturaCfdiModal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(result) => {
            const folio = result.serie_folio || (result.fcf_id != null ? `#${result.fcf_id}` : "");
            setFlashSuccess(
              folio
                ? `La factura ${folio} se timbró correctamente y ya aparece en el listado.`
                : "La factura se timbró correctamente y ya aparece en el listado."
            );
            void loadFacturas();
          }}
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
