import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDropzone } from "react-dropzone";

import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import {
  buildProductosQuery,
  SYSCOM_BUSQUEDA_AMPLIA,
  fetchSyscomTipoCambio,
  formatPrecioPublicoMxnConIva,
  fetchSyscomProductoDetalle,
  fetchSyscomProductosSugerencia,
  fetchIntraxProductos,
  isCatalogAuthReady,
  getProductoImagenesUrls,
  getProductoLink,
  mapIntraxProductoToSyscom,
  type IntraxFuente,
  type IntraxProductosResponse,
  type SyscomCategoria,
  type SyscomMarca,
  type SyscomProducto,
  type SyscomProductoDetalle,
  type SyscomProductosResponse,
  type SyscomSearchParams,
  fetchSyscom,
  fetchTvc,
  fetchTvcProductos,
  fetchTvcProductoDetalle,
  fetchTvcTipoCambio,
  getCatalogProductoImageUrl,
} from "./syscomCatalog";
import { Modal } from "@/components/ui/modal";
import { fetchApi, resolveMediaUrl } from "@/config/api";
import { useAuth } from "@/context/AuthContext";

/* --------------------------------------------------------------------------
   Mismo sistema que Perfil/ProfilePage, Configuracion/GestionUsuario y
   MiEscritorio/Tareas: marino + dorado sobre lienzo blanco, azul eléctrico
   como único acento de acción, líneas de 1 px. En oscuro, la familia slate
   del contenedor de la app (lienzo #0f172a → panel #111827 → tarjeta #1B2539).
   -------------------------------------------------------------------------- */
const sheetFontStyle = { fontFamily: "Geist, Outfit, system-ui, sans-serif" } as const;

const claudeCardShell =
  "overflow-hidden rounded-[24px] border border-[#E7E7EA] bg-white shadow-[0_6px_20px_-10px_rgba(9,9,11,0.14)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_10px_28px_-12px_rgba(0,0,0,0.6)]";

const claudeSearchInput =
  "h-11 w-full rounded-[10px] border border-[#E7E7EA] bg-white pl-10 pr-10 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)]";

const claudeHeroHeading =
  "text-[26px] font-bold leading-[1.15] tracking-[-0.9px] text-white sm:text-[32px] sm:tracking-[-1.1px]";

const claudeBody = "text-[15px] leading-[22px] tracking-[-0.1px] text-white/70";

const claudeFieldLabel =
  "mb-2 block text-[13px] font-medium tracking-[-0.05px] text-[#52525B] dark:text-[#B7C1D1]";

const requiredMark = "ml-0.5 text-[#C22B2B] dark:text-[#F87171]";

const claudeInput =
  "h-11 w-full rounded-[10px] border border-[#E7E7EA] bg-white px-3 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)]";

const claudeTextarea =
  "min-h-[110px] w-full resize-none rounded-[10px] border border-[#E7E7EA] bg-white px-3 py-2.5 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)]";

const claudeSelect =
  "h-11 w-full rounded-[10px] border border-[#E7E7EA] bg-white px-3 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)]";

const claudePrimaryBtn =
  "inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#1B5CFF] bg-[#1B5CFF] px-6 text-[15px] font-medium tracking-[-0.1px] text-white transition-[background-color,border-color,transform] duration-150 hover:border-[#1244D1] hover:bg-[#1244D1] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:border-[#DCE7FF] disabled:bg-[#DCE7FF] disabled:text-[#2F4899] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:border-[#3B6AF0] dark:hover:bg-[#3B6AF0] dark:disabled:border-[#1A2748] dark:disabled:bg-[#1A2748] dark:disabled:text-[#9BB0F0] max-sm:h-12 max-sm:w-full";

const claudeSecondaryBtn =
  "inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#E7E7EA] bg-white px-5 text-[14px] font-medium tracking-[-0.1px] text-[#09090B] transition-[background-color,border-color,transform] duration-150 hover:border-[#D3D3D8] hover:bg-[#FAFAFA] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:hover:bg-[#243048] max-sm:h-12 max-sm:w-full";

const claudeDangerBtn =
  "inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#C22B2B] bg-[#C22B2B] px-5 text-[15px] font-medium tracking-[-0.1px] text-white transition-[background-color,transform] duration-150 hover:bg-[#A82424] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(194,43,43,0.22)] disabled:cursor-not-allowed disabled:opacity-60 max-sm:h-12 max-sm:w-full";

/* --- Sistema de modales — cascarón blanco, cabecera marina, cuerpo en
   lienzo y pie hundido con las acciones ancladas. Un solo lenguaje para
   los tres diálogos. --- */
const modalShellClass =
  "flex max-h-[min(92vh,820px)] w-[min(94vw,44rem)] flex-col overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white p-0 shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:!bg-[#111827] sm:max-w-2xl";
const modalSmallShellClass =
  "w-full max-w-md overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:!bg-[#111827]";
const modalHeaderClass = "relative shrink-0 bg-[#17235B] px-6 py-5 pr-16 dark:bg-[#1B2A63]";
const modalHeaderIconClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]";
const modalEyebrowClass = "text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55";
const modalTitleClass = "text-[20px] font-semibold leading-[1.25] tracking-[-0.5px] text-white";
const modalSubtitleClass = "mt-1 text-[14px] leading-[20px] text-white/70";
const modalBodyClass =
  "custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-white px-5 py-5 dark:bg-[#111827] sm:px-6";
const modalFooterClass =
  "shrink-0 border-t border-[#E7E7EA] bg-[#FAFAFA] px-5 py-4 dark:border-[#273244] dark:bg-[#151E32] sm:px-6";
const modalSectionClass =
  "rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] p-4 dark:border-[#273244] dark:bg-[#1B2539] sm:p-5";

/* --- Alertas — mismo tono y estructura que InlineAlert de Tareas. --- */
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

function InlineAlert({
  variant,
  title,
  message,
  onDismiss,
}: {
  variant: AlertVariant;
  title: string;
  message?: string;
  onDismiss?: () => void;
}) {
  const tone = alertTone[variant];
  const assertive = variant === "error" || variant === "warning";
  return (
    <div
      role={assertive ? "alert" : "status"}
      aria-live={assertive ? "assertive" : "polite"}
      className={`flex items-start gap-3 rounded-[14px] border px-4 py-3 ${tone.border} ${tone.bg}`}
    >
      <span className={`mt-1.5 size-[7px] shrink-0 rounded-full ${tone.dot}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={`text-[15px] font-medium ${tone.title}`}>{title}</p>
        {message ? <p className={`mt-0.5 text-[13px] leading-[18px] ${tone.msg}`}>{message}</p> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Descartar aviso"
          className={`-mr-1 -mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.06] ${tone.title}`}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
            <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

const ORDEN_OPTIONS: { value: NonNullable<SyscomSearchParams["orden"]>; label: string }[] = [
  { value: "relevancia", label: "Relevancia" },
  { value: "precio:asc", label: "Precio ascendente" },
  { value: "precio:desc", label: "Precio descendente" },
  { value: "modelo:asc", label: "Modelo A-Z" },
  { value: "marca:asc", label: "Marca A-Z" },
  { value: "topseller", label: "Más vendidos" },
];

const MARCAS_SELECT_LIMIT = 200;
const AUTO_DEFAULT_SEARCH = "camara";

type ManualProduct = {
  id: string;
  imagen_url: string;
  producto: string;
  caracteristicas?: string;
  marca: string;
  modelo: string;
  sat_key?: string;
  fuente: "manual";
  precio: number;
  stock: number;
};

const MANUAL_PRODUCTS_IMAGE_FOLDER = "productos/manuales";

const compressImage = async (file: File, maxSizeKB: number, maxWidth = 1400, maxHeight = 1400): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image(); img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) { const ratio = Math.min(maxWidth / width, maxHeight / height); width = Math.floor(width * ratio); height = Math.floor(height * ratio); }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, width, height); }
        ctx?.drawImage(img, 0, 0, width, height);
        const minQuality = 0.1; const maxQuality = 0.95; let attempts = 0; const maxAttempts = 8;
        const binarySearchCompress = (low: number, high: number) => {
          if (attempts >= maxAttempts || high - low < 0.01) {
            const finalQuality = (low + high) / 2;
            canvas.toBlob((blob) => { if (!blob) { reject(new Error("No se pudo comprimir")); return; } const r = new FileReader(); r.readAsDataURL(blob); r.onloadend = () => resolve(r.result as string); }, "image/jpeg", finalQuality);
            return;
          }
          attempts++;
          const midQuality = (low + high) / 2;
          canvas.toBlob((blob) => { if (!blob) { reject(new Error("No se pudo comprimir")); return; } const sizeKB = blob.size / 1024; if (Math.abs(sizeKB - maxSizeKB) < 5) { const r = new FileReader(); r.readAsDataURL(blob); r.onloadend = () => resolve(r.result as string); } else if (sizeKB > maxSizeKB) { binarySearchCompress(low, midQuality); } else { binarySearchCompress(midQuality, high); } }, "image/jpeg", midQuality);
        };
        binarySearchCompress(minQuality, maxQuality);
      }; img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    }; reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
  });
};

const manualToSyscomProducto = (m: ManualProduct): SyscomProducto => ({
  producto_id: m.id, modelo: m.modelo, sku: m.modelo,
  total_existencia: Number.isFinite(m.stock) ? m.stock : 0,
  titulo: m.producto, marca: m.marca, fuente: "manual",
  estado: "activo", estado_inventario: m.stock > 0 ? "con_existencia" : "sin_existencia",
  precio_mxn: Number.isFinite(m.precio) ? m.precio : 0,
  sat_key: (m.sat_key || "").trim(),
  img_portada: m.imagen_url || "", link: "",
  precios: { precio_lista: Number.isFinite(m.precio) ? m.precio : 0 },
});

const GLOBAL_SEARCH_PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 400;

const sliceGlobalSearchPage = (
  manualRows: SyscomProducto[],
  catalogStream: SyscomProducto[],
  pagina: number,
  catalogTotalEstimate: number,
): { pageRows: SyscomProducto[]; totalRows: number; totalPages: number; safePage: number } => {
  const manualCount = manualRows.length;
  const globalStart = (pagina - 1) * GLOBAL_SEARCH_PAGE_SIZE;
  const globalEnd = globalStart + GLOBAL_SEARCH_PAGE_SIZE;

  let pageRows: SyscomProducto[] = [];
  if (globalEnd <= manualCount) {
    pageRows = manualRows.slice(globalStart, globalEnd);
  } else {
    const manualPart = globalStart < manualCount ? manualRows.slice(globalStart, manualCount) : [];
    const catalogOffset = Math.max(0, globalStart - manualCount);
    const catalogNeeded = GLOBAL_SEARCH_PAGE_SIZE - manualPart.length;
    const catalogSlice = catalogStream.slice(catalogOffset, catalogOffset + catalogNeeded);
    pageRows = [...manualPart, ...catalogSlice];
  }

  const totalRows = manualCount + catalogTotalEstimate;
  const totalPages = Math.max(1, Math.ceil(totalRows / GLOBAL_SEARCH_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, pagina), totalPages);
  return { pageRows, totalRows, totalPages, safePage };
};

const matchesManualSearch = (m: ManualProduct, needle: string): boolean => {
  const q = needle.toLowerCase();
  return (
    m.producto.toLowerCase().includes(q) ||
    m.marca.toLowerCase().includes(q) ||
    m.modelo.toLowerCase().includes(q) ||
    (m.sat_key || "").toLowerCase().includes(q)
  );
};

const dedupeProductosById = (rows: SyscomProducto[]): SyscomProducto[] => {
  const seen = new Set<string>();
  const out: SyscomProducto[] = [];
  for (const p of rows) {
    const id = p.producto_id?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(p);
  }
  return out;
};

type CatalogFuente = IntraxFuente | "";

const fetchGlobalCatalogPage = async (
  q: string,
  page: number,
  categoriaId: string,
  marcaId: string,
  orden: NonNullable<SyscomSearchParams["orden"]>,
): Promise<{
  rows: SyscomProducto[];
  syscomTotal: number;
  syscomPages: number;
  intraxTotal: number;
  intraxPages: number;
  tvcTotal: number;
  tvcPages: number;
}> => {
  const syscomQuery = buildProductosQuery({
    busqueda: q,
    categoria: categoriaId || undefined,
    marca: marcaId || undefined,
    pagina: page,
    orden,
    ...SYSCOM_BUSQUEDA_AMPLIA,
  });
  const [syscomRes, intraxData, tvcData] = await Promise.all([
    fetchSyscom(`productos/?${syscomQuery}`),
    fetchIntraxProductos({ fuente: "syscom", buscar: q, pagina: page, por_pagina: GLOBAL_SEARCH_PAGE_SIZE }).catch(
      (): IntraxProductosResponse => ({ productos: [] }),
    ),
    fetchTvcProductos({
      busqueda: q,
      pagina: page,
      por_pagina: GLOBAL_SEARCH_PAGE_SIZE,
      categoria: categoriaId || undefined,
      marca: marcaId || undefined,
    }).catch((): SyscomProductosResponse => ({ productos: [] })),
  ]);

  let syscomRows: SyscomProducto[] = [];
  let syscomTotal = 0;
  let syscomPages = 1;
  if (syscomRes.ok) {
    const data: SyscomProductosResponse = await syscomRes.json().catch(() => ({}));
    syscomRows = (data.productos ?? []).map((p) => ({ ...p, fuente: p.fuente || "syscom" }));
    syscomTotal = data.cantidad ?? syscomRows.length;
    syscomPages = data.paginas ?? 1;
  }

  const intraxRows = (intraxData.productos ?? []).map(mapIntraxProductoToSyscom);
  const intraxTotal = intraxData.resumen?.total_resultados ?? intraxRows.length;
  const intraxPages = intraxData.resumen?.total_paginas ?? 1;

  const tvcRows = (tvcData.productos ?? []).map((p) => ({ ...p, fuente: p.fuente || "tvc" }));
  const tvcTotal = tvcData.cantidad ?? tvcRows.length;
  const tvcPages = tvcData.paginas ?? 1;

  return {
    rows: dedupeProductosById([...syscomRows, ...intraxRows, ...tvcRows]),
    syscomTotal,
    syscomPages,
    intraxTotal,
    intraxPages,
    tvcTotal,
    tvcPages,
  };
};

const toMoney2 = (v: number) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; };

function mapApiCatalogError(res: Response, data: unknown): string {
  const detail =
    data && typeof data === "object" && "detail" in data
      ? String((data as { detail?: unknown }).detail ?? "")
      : "";
  if (res.status === 401) {
    return "Tu sesión expiró. Cierra sesión y vuelve a entrar.";
  }
  if (res.status === 403) {
    return detail || "No tienes permiso para ver el catálogo de productos.";
  }
  if (res.status === 502 && /SYSCOM_CLIENT|SYSCOM/i.test(detail)) {
    return "El catálogo SYSCOM no está configurado en el servidor. Contacta al administrador.";
  }
  if (res.status === 502 && /TVC_API_TOKEN|TVC/i.test(detail)) {
    return "El catálogo TVC no está configurado en el servidor. Contacta al administrador.";
  }
  if (detail) return detail;
  return "Error al cargar productos.";
}

export default function ProductosPage() {
  const { isAuthenticated, loading: authLoading, isAdmin, permissions } = useAuth();
  const catalogReady = isAuthenticated && !authLoading;

  const asBool = (v: unknown, defaultValue: boolean) => {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (s === "true") return true;
      if (s === "false") return false;
    }
    return defaultValue;
  };
  const modulePerms =
    (permissions as Record<string, unknown>)?.productos ||
    (permissions as Record<string, unknown>)?.Productos ||
    {};
  const canProductosView = isAdmin || asBool((modulePerms as { view?: unknown }).view, false);
  const canProductosCreate = isAdmin || asBool((modulePerms as { create?: unknown }).create, false);
  const canProductosEdit = isAdmin || asBool((modulePerms as { edit?: unknown }).edit, false);
  const canProductosDelete = isAdmin || asBool((modulePerms as { delete?: unknown }).delete, false);

  const [productos, setProductos] = useState<SyscomProducto[]>([]);
  const [pagina, setPagina] = useState(1);
  const [paginas, setPaginas] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [busquedaInput, setBusquedaInput] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [marcaId, setMarcaId] = useState("");
  const [orden, setOrden] = useState<NonNullable<SyscomSearchParams["orden"]>>("relevancia");
  const [fuente, setFuente] = useState<CatalogFuente>("");

  const [categorias, setCategorias] = useState<SyscomCategoria[]>([]);
  const [marcas, setMarcas] = useState<SyscomMarca[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [tipoCambio, setTipoCambio] = useState<number | null>(null);

  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const hasFiltro = Boolean(busqueda.trim() || categoriaId || marcaId || fuente);
  const [autoCatalog, setAutoCatalog] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [detailProduct, setDetailProduct] = useState<SyscomProductoDetalle | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const productosRef = useRef<SyscomProducto[]>([]);
  const loadGenerationRef = useRef(0);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [manualProducts, setManualProducts] = useState<ManualProduct[]>([]);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [editingManualId, setEditingManualId] = useState<string | null>(null);
  const [manualDeleteId, setManualDeleteId] = useState<string | null>(null);
  const [manualFormError, setManualFormError] = useState("");
  const [manualImageUploading, setManualImageUploading] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [deletingManual, setDeletingManual] = useState(false);
  const [toast, setToast] = useState<{ variant: AlertVariant; title: string; message?: string } | null>(null);

  const detailModalTitleId = useId();
  const manualModalTitleId = useId();
  const deleteModalTitleId = useId();

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(id);
  }, [toast]);
  const [manualForm, setManualForm] = useState({
    imagen_url: "",
    producto: "",
    caracteristicas: "",
    marca: "",
    modelo: "",
    sat_key: "",
    precio: "",
    stock: "",
  });

  const fetchManualProducts = useCallback(async () => {
    if (!catalogReady) return;
    try {
      const mapped: ManualProduct[] = [];
      let page = 1;
      let totalPages = 1;
      while (page <= totalPages && page <= 20) {
        const res = await fetchApi(
          `/api/productos-manuales/?page_size=200&page=${page}&ordering=-fecha_creacion`,
          { method: "GET" }
        );
        const data = await res.json().catch(() => ({ results: [] }));
        if (!res.ok) {
          setManualProducts([]);
          console.error("No se pudieron cargar productos manuales:", res.status, data);
          return;
        }
        const payload = data as { results?: unknown; count?: number } | unknown[];
        const list: unknown[] = Array.isArray(payload)
          ? payload
          : Array.isArray((payload as { results?: unknown }).results)
            ? ((payload as { results: unknown[] }).results)
            : [];
        const count =
          !Array.isArray(payload) && typeof (payload as { count?: unknown }).count === "number"
            ? (payload as { count: number }).count
            : list.length;
        totalPages = Math.max(1, Math.ceil(count / 200));
        for (const x of list) {
          if (!x || typeof x !== "object") continue;
          const row = x as Record<string, unknown>;
          const producto = String(row.producto || "").trim();
          if (!producto) continue;
          mapped.push({
            id: String(row.id ?? ""),
            imagen_url: String(row.imagen_url || ""),
            producto,
            caracteristicas: String(row.caracteristicas || ""),
            marca: String(row.marca || ""),
            modelo: String(row.modelo || ""),
            sat_key: String(row.sat_key || "").trim(),
            fuente: "manual",
            precio: toMoney2(Number(row.precio || 0)),
            stock: Number.isFinite(Number(row.stock)) ? Number(row.stock) : 0,
          });
        }
        if (list.length === 0) break;
        page += 1;
      }
      setManualProducts(mapped);
    } catch (err) {
      setManualProducts([]);
      console.error("Error al cargar productos manuales:", err);
    }
  }, [catalogReady]);

  useEffect(() => {
    if (catalogReady) fetchManualProducts();
  }, [catalogReady, fetchManualProducts]);

  const onDropManualImage = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles.find((f) => f.type.startsWith("image/")); if (!file) return;
    setManualFormError(""); setManualImageUploading(true);
    try {
      if (!catalogReady) {
        setManualFormError("Debes iniciar sesión para subir imágenes.");
        return;
      }
      const compressed = await compressImage(file, 50, 1400, 1400);
      const resp = await fetchApi("/api/ordenes/upload-image/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data_url: compressed, folder: MANUAL_PRODUCTS_IMAGE_FOLDER }),
      });
      if (!resp.ok) { const errData = await resp.json().catch(() => null); setManualFormError(typeof errData?.detail === "string" && errData.detail.trim() ? errData.detail : "No se pudo subir la imagen."); return; }
      const data = await resp.json().catch(() => null);
      const newUrl = data?.url ? String(data.url) : "";
      if (!newUrl) { setManualFormError("No se pudo subir la imagen."); return; }
      setManualForm((prev) => ({ ...prev, imagen_url: newUrl }));
    } catch (err) {
      setManualFormError(err instanceof Error ? err.message : "Error al subir la imagen.");
    } finally {
      setManualImageUploading(false);
    }
  }, [catalogReady]);

  const { getRootProps: getManualImageRootProps, getInputProps: getManualImageInputProps, isDragActive: isManualImageDragActive } = useDropzone({ onDrop: onDropManualImage, accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".svg"] }, maxFiles: 1, disabled: manualImageUploading, multiple: false });

  const loadCatalogos = useCallback(async () => {
    if (!catalogReady) return;
    setLoadingCatalogos(true);
    try {
      const [tcSyscom, tcTvc, catRes, marRes] = await Promise.all([
        fetchSyscomTipoCambio().catch(() => null),
        fetchTvcTipoCambio().catch(() => null),
        fuente === "tvc" ? fetchTvc("categorias/") : fetchSyscom("categorias/"),
        fuente === "tvc" ? fetchTvc("marcas/") : fetchSyscom("marcas/"),
      ]);
      if (catRes.ok) { const data = await catRes.json().catch(() => []); setCategorias(Array.isArray(data) ? data : []); }
      if (marRes.ok) { const data = await marRes.json().catch(() => []); setMarcas(Array.isArray(data) ? data : []); }
      setTipoCambio(tcSyscom ?? tcTvc);
    } catch {
      /* ignore */
    } finally {
      setLoadingCatalogos(false);
    }
  }, [catalogReady, fuente]);

  const loadProductos = useCallback(async () => {
    if (!catalogReady) return;
    if (!hasFiltro && !autoCatalog) return;
    const generation = ++loadGenerationRef.current;
    const isStale = () => generation !== loadGenerationRef.current;

    setLoading(true);
    setError(null);
    try {
      if (!isCatalogAuthReady()) {
        if (isStale()) return;
        setError("Debe iniciar sesión para ver el catálogo.");
        setProductos([]);
        return;
      }

      const q = busqueda.trim();
      if (q) {
        const manualRows = manualProducts
          .filter((m) => matchesManualSearch(m, q))
          .map(manualToSyscomProducto);
        const manualCount = manualRows.length;
        const globalStart = (pagina - 1) * GLOBAL_SEARCH_PAGE_SIZE;
        const globalEnd = globalStart + GLOBAL_SEARCH_PAGE_SIZE;

        const instant = sliceGlobalSearchPage(manualRows, [], pagina, 0);
        if (!isStale() && instant.pageRows.length > 0) {
          setProductos(instant.pageRows);
          setTotal(instant.totalRows);
          setPaginas(instant.totalPages);
        }

        if (globalEnd <= manualCount) {
          if (!isStale()) setLoading(false);
          void (async () => {
            const firstCatalog = await fetchGlobalCatalogPage(q, 1, categoriaId, marcaId, orden);
            if (isStale()) return;
            const catalogTotalEstimate = firstCatalog.syscomTotal + firstCatalog.intraxTotal + firstCatalog.tvcTotal;
            const { totalRows, totalPages, safePage } = sliceGlobalSearchPage(
              manualRows,
              [],
              pagina,
              catalogTotalEstimate,
            );
            setTotal(totalRows);
            setPaginas(totalPages);
            if (safePage !== pagina) setPagina(safePage);
          })();
          return;
        }

        const firstCatalog = await fetchGlobalCatalogPage(q, 1, categoriaId, marcaId, orden);
        if (isStale()) return;

        const catalogTotalEstimate = firstCatalog.syscomTotal + firstCatalog.intraxTotal + firstCatalog.tvcTotal;
        const maxCatalogPages = Math.max(firstCatalog.syscomPages, firstCatalog.intraxPages, firstCatalog.tvcPages);
        const catalogNeededEnd = Math.max(0, globalStart + GLOBAL_SEARCH_PAGE_SIZE - manualCount);
        const endCatalogPage = Math.max(1, Math.floor((catalogNeededEnd - 1) / GLOBAL_SEARCH_PAGE_SIZE) + 1);

        const catalogChunks: SyscomProducto[] = [...firstCatalog.rows];
        for (let p = 2; p <= Math.min(endCatalogPage, maxCatalogPages); p++) {
          const chunk = await fetchGlobalCatalogPage(q, p, categoriaId, marcaId, orden);
          if (isStale()) return;
          catalogChunks.push(...chunk.rows);
        }

        const catalogStream = dedupeProductosById(catalogChunks);
        const { pageRows, totalRows, totalPages, safePage } = sliceGlobalSearchPage(
          manualRows,
          catalogStream,
          pagina,
          catalogTotalEstimate,
        );

        if (isStale()) return;
        setProductos(pageRows);
        setPaginas(totalPages);
        setTotal(totalRows);
        if (safePage !== pagina) setPagina(safePage);
        return;
      }

      const applyManualCatalogPage = (needle: string, softError: string | null) => {
        const filtered = manualProducts.filter((m) => matchesManualSearch(m, needle));
        const pageSize = 50;
        const totalRows = filtered.length;
        const totalPages = Math.max(1, Math.ceil(totalRows / pageSize) || 1);
        const safePage = Math.min(Math.max(1, pagina), totalPages);
        const start = (safePage - 1) * pageSize;
        const rows = filtered.slice(start, start + pageSize).map(manualToSyscomProducto);
        setProductos(rows);
        setPaginas(totalPages);
        setTotal(totalRows);
        setError(softError);
        if (safePage !== pagina) setPagina(safePage);
      };

      if (fuente === "manual") {
        if (isStale()) return;
        applyManualCatalogPage(busqueda, null);
        return;
      }
      if (fuente === "tvc") {
        try {
          const data = await fetchTvcProductos({
            busqueda: busqueda.trim() || undefined,
            categoria: categoriaId || undefined,
            marca: marcaId || undefined,
            pagina,
            por_pagina: 50,
          });
          if (isStale()) return;
          const tvcProductos = (data.productos ?? []).map((p) => ({ ...p, fuente: p.fuente || "tvc" }));
          if (tvcProductos.length === 0 && manualProducts.length > 0) {
            applyManualCatalogPage(busqueda, "Catálogo TVC sin resultados. Mostrando productos manuales.");
            return;
          }
          setProductos(tvcProductos);
          setPaginas(data.paginas ?? 1);
          setTotal(data.cantidad ?? tvcProductos.length);
          return;
        } catch {
          if (isStale()) return;
          if (manualProducts.length > 0) {
            applyManualCatalogPage(busqueda, "No se pudo consultar TVC. Mostrando productos manuales.");
            return;
          }
          setProductos([]);
          setError("Error de conexión con el catálogo TVC.");
          return;
        }
      }
      if (fuente === "syscom") {
        const isAuto = autoCatalog && !busqueda.trim();
        try {
          const data = await fetchIntraxProductos({ fuente, buscar: isAuto ? AUTO_DEFAULT_SEARCH : (busqueda.trim() || undefined), pagina, por_pagina: 50 });
          if (isStale()) return;
          const intraxProductos = (data.productos ?? []).map(mapIntraxProductoToSyscom);
          if (intraxProductos.length === 0 && manualProducts.length > 0 && fuente === "syscom") {
            applyManualCatalogPage(busqueda, "Catálogo externo sin resultados. Mostrando productos manuales.");
            return;
          }
          setProductos(intraxProductos); setPaginas(data.resumen?.total_paginas ?? 1); setTotal(data.resumen?.total_resultados ?? intraxProductos.length); return;
        } catch {
          if (isStale()) return;
          if (manualProducts.length > 0) {
            applyManualCatalogPage(busqueda, "No se pudo consultar el catálogo externo. Mostrando productos manuales.");
            return;
          }
          setProductos([]);
          setError("Error de conexión con el catálogo.");
          return;
        }
      }
      const isAuto = autoCatalog && !hasFiltro;
      const query = buildProductosQuery(isAuto ? { busqueda: AUTO_DEFAULT_SEARCH, pagina, orden: "topseller", stock: "1" } : { busqueda: busqueda.trim() || undefined, categoria: categoriaId || undefined, marca: marcaId || undefined, pagina, orden, ...SYSCOM_BUSQUEDA_AMPLIA });
      const res = await fetchSyscom(`productos/?${query}`);
      if (isStale()) return;
      const data: SyscomProductosResponse = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (manualProducts.length > 0) {
          applyManualCatalogPage(
            busqueda,
            `${mapApiCatalogError(res, data)} Mostrando productos manuales.`,
          );
          return;
        }
        setProductos([]);
        setError(mapApiCatalogError(res, data));
        return;
      }
      const productosSyscomConFuente = (data.productos ?? []).map((p) => ({ ...p, fuente: p.fuente || "syscom" }));
      // En catálogo automático / sin filtro de fuente, anteponer manuales en la 1.ª página.
      if ((!fuente || fuente === "") && pagina === 1 && manualProducts.length > 0) {
        const manualHead = manualProducts.slice(0, 20).map(manualToSyscomProducto);
        const merged = dedupeProductosById([...manualHead, ...productosSyscomConFuente]).slice(0, 50);
        setProductos(merged);
        setPaginas(data.paginas ?? 1);
        setTotal((data.cantidad ?? 0) + manualProducts.length);
        return;
      }
      setProductos(productosSyscomConFuente); setPaginas(data.paginas ?? 1); setTotal(data.cantidad ?? 0);
    } catch {
      if (isStale()) return;
      if (manualProducts.length > 0) {
        const filtered = manualProducts.filter((m) => matchesManualSearch(m, busqueda));
        const pageSize = 50;
        const totalRows = filtered.length;
        const totalPages = Math.max(1, Math.ceil(totalRows / pageSize) || 1);
        const safePage = Math.min(Math.max(1, pagina), totalPages);
        const start = (safePage - 1) * pageSize;
        setProductos(filtered.slice(start, start + pageSize).map(manualToSyscomProducto));
        setPaginas(totalPages);
        setTotal(totalRows);
        setError("Error de conexión con el catálogo externo. Mostrando productos manuales.");
        if (safePage !== pagina) setPagina(safePage);
        return;
      }
      setProductos([]);
      setError("Error de conexión con el catálogo.");
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, [busqueda, categoriaId, marcaId, orden, pagina, hasFiltro, autoCatalog, fuente, manualProducts, catalogReady]);

  useEffect(() => {
    if (catalogReady) loadCatalogos();
  }, [catalogReady, loadCatalogos]);

  useEffect(() => {
    if (catalogReady) loadProductos();
  }, [catalogReady, loadProductos]);
  useEffect(() => { productosRef.current = productos; }, [productos]);

  useEffect(() => { if (!filterOpen) return; const onPointerDown = (e: PointerEvent) => { const t = e.target as Node; if (filterRef.current?.contains(t)) return; setFilterOpen(false); }; document.addEventListener("pointerdown", onPointerDown); return () => document.removeEventListener("pointerdown", onPointerDown); }, [filterOpen]);

  useEffect(() => {
    if (!detailModalOpen || !selectedProductId) {
      setDetailProduct(null);
      return;
    }
    const listedProduct = productosRef.current.find((p) => p.producto_id === selectedProductId);
    const idLower = selectedProductId.toLowerCase();

    if (listedProduct?.fuente === "manual" || idLower.startsWith("manual:")) {
      setDetailProduct((listedProduct as SyscomProductoDetalle) ?? null);
      setLoadingDetail(false);
      return;
    }

    // Intrax (WP): no tiene detalle en SYSCOM; el id_producto de Intrax ≠ producto_id SYSCOM.
    if (listedProduct?.fuente === "intrax" || idLower.startsWith("intrax:")) {
      setDetailProduct((listedProduct as SyscomProductoDetalle) ?? null);
      setLoadingDetail(false);
      // Enriquecer en segundo plano si el SKU existe en SYSCOM.
      const sku = (listedProduct?.sku || listedProduct?.modelo || "").trim();
      if (sku.length >= 2 && isCatalogAuthReady()) {
        let cancelado = false;
        void (async () => {
          try {
            const { productos } = await fetchSyscomProductosSugerencia(sku);
            if (cancelado || productos.length === 0) return;
            const exact =
              productos.find(
                (p) =>
                  (p.modelo || "").trim().toLowerCase() === sku.toLowerCase() ||
                  (p.sku || "").trim().toLowerCase() === sku.toLowerCase(),
              ) ?? productos[0];
            if (!exact?.producto_id) return;
            const detalle = await fetchSyscomProductoDetalle(exact.producto_id);
            if (cancelado || !detalle) return;
            setDetailProduct({
              ...detalle,
              fuente: "intrax",
              // Conserva vínculo Intrax si el detalle SYSCOM no trae foto.
              img_portada: detalle.img_portada || listedProduct?.img_portada,
              sat_key: detalle.sat_key || listedProduct?.sat_key,
              sat_description: detalle.sat_description || listedProduct?.sat_description,
            });
            setSelectedImageIndex(0);
          } catch {
            // Silencioso: ya mostramos la ficha Intrax.
          }
        })();
        return () => {
          cancelado = true;
        };
      }
      return;
    }

    if (listedProduct?.fuente === "tvc" || idLower.startsWith("tvc:")) {
      if (!isCatalogAuthReady()) return;
      setLoadingDetail(true);
      setDetailProduct(null);
      fetchTvcProductoDetalle(selectedProductId)
        .then((data) => {
          setDetailProduct(data ?? listedProduct ?? null);
          setSelectedImageIndex(0);
        })
        .finally(() => setLoadingDetail(false));
      return;
    }

    if (fuente === "manual" || fuente === "tvc") {
      setDetailProduct((listedProduct as SyscomProductoDetalle) ?? null);
      setLoadingDetail(false);
      return;
    }

    if (!isCatalogAuthReady()) return;
    setLoadingDetail(true);
    setDetailProduct(null);
    fetchSyscomProductoDetalle(selectedProductId)
      .then((data) => {
        // Si SYSCOM responde 404 (producto no disponible), no dejar el modal vacío.
        setDetailProduct(data ?? (listedProduct as SyscomProductoDetalle) ?? null);
        setSelectedImageIndex(0);
      })
      .finally(() => setLoadingDetail(false));
  }, [detailModalOpen, selectedProductId, fuente]);

  const openDetailModal = (productId: string) => { setSelectedProductId(productId); setDetailModalOpen(true); };
  const closeDetailModal = () => { setDetailModalOpen(false); setSelectedProductId(null); setDetailProduct(null); };

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const applySearchQuery = useCallback(
    (raw: string) => {
      const v = raw.trim();
      setBusqueda(v);
      setAutoCatalog(!v && !categoriaId && !marcaId && !fuente);
      setPagina(1);
    },
    [categoriaId, marcaId, fuente],
  );

  const handleSearchInputChange = useCallback(
    (raw: string) => {
      setBusquedaInput(raw);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        applySearchQuery(raw);
      }, SEARCH_DEBOUNCE_MS);
    },
    [applySearchQuery],
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    applySearchQuery(busquedaInput);
  };
  const resetPage = useCallback(() => setPagina(1), []);

  const clearFiltros = () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setBusquedaInput("");
    setBusqueda("");
    setCategoriaId("");
    setMarcaId("");
    setFuente("");
    setOrden("relevancia");
    setAutoCatalog(true);
    setPagina(1);
  };

  const openCreateManual = () => {
    if (!canProductosCreate) return;
    setEditingManualId(null);
    setManualFormError("");
    setManualForm({
      imagen_url: "",
      producto: "",
      caracteristicas: "",
      marca: "",
      modelo: "",
      sat_key: "",
      precio: "",
      stock: "",
    });
    setManualModalOpen(true);
  };
  const openEditManual = (id: string) => {
    if (!canProductosEdit) return;
    const p = manualProducts.find((x) => x.id === id);
    if (!p) return;
    setEditingManualId(id);
    setManualFormError("");
    setManualForm({
      imagen_url: p.imagen_url || "",
      producto: p.producto || "",
      caracteristicas: p.caracteristicas || "",
      marca: p.marca || "",
      modelo: p.modelo || "",
      sat_key: p.sat_key || "",
      precio: String(p.precio ?? 0),
      stock: String(p.stock ?? 0),
    });
    setManualModalOpen(true);
  };

  const saveManualProduct = async () => {
    const producto = manualForm.producto.trim(); const marca = manualForm.marca.trim(); const modelo = manualForm.modelo.trim();
    const precio = Number(manualForm.precio); const stock = Number(manualForm.stock);
    if (!producto || !marca || !modelo) { setManualFormError("Producto, marca y modelo son requeridos."); return; }
    if (!Number.isFinite(precio) || precio < 0) { setManualFormError("Precio inválido."); return; }
    if (!Number.isFinite(stock) || stock < 0) { setManualFormError("Stock inválido."); return; }
    if (!catalogReady) {
      setManualFormError("Debes iniciar sesión para guardar productos.");
      return;
    }
    const isEdit = Boolean(editingManualId);
    if (isEdit && !canProductosEdit) {
      setManualFormError("No tienes permiso para editar productos.");
      return;
    }
    if (!isEdit && !canProductosCreate) {
      setManualFormError("No tienes permiso para crear productos.");
      return;
    }
    const modeloKey = modelo.toLowerCase();
    const modeloDuplicado = manualProducts.some(
      (p) =>
        p.modelo.trim().toLowerCase() === modeloKey &&
        String(p.id) !== String(editingManualId || "")
    );
    if (modeloDuplicado) {
      setManualFormError(`Ya existe un producto manual con el modelo "${modelo}". No se puede agregar duplicado.`);
      return;
    }
    const body = {
      imagen_url: manualForm.imagen_url.trim(),
      producto,
      caracteristicas: manualForm.caracteristicas.trim(),
      marca,
      modelo,
      sat_key: manualForm.sat_key.trim(),
      precio: toMoney2(precio),
      stock: Math.round(stock),
      activo: true,
    };
    setSavingManual(true);
    try {
      const endpoint = isEdit ? `/api/productos-manuales/${editingManualId}/` : "/api/productos-manuales/";
      const res = await fetchApi(endpoint, { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
        const modeloErr = record.modelo;
        if (Array.isArray(modeloErr) && typeof modeloErr[0] === "string") {
          setManualFormError(modeloErr[0]);
          return;
        }
        const detail = "detail" in record ? record.detail : undefined;
        setManualFormError(typeof detail === "string" && detail.trim() ? detail : "No se pudo guardar el producto.");
        return;
      }
      await fetchManualProducts();
      setManualModalOpen(false);
      setToast({
        variant: "success",
        title: isEdit ? "Producto actualizado" : "Producto agregado",
        message: `«${producto}» se guardó en el catálogo manual.`,
      });
    } catch {
      setManualFormError("Error de conexión al guardar producto manual.");
    } finally {
      setSavingManual(false);
    }
  };

  const confirmDeleteManual = async () => {
    if (!manualDeleteId || !catalogReady || !canProductosDelete) return;
    const nombre = manualProducts.find((x) => x.id === manualDeleteId)?.producto;
    setDeletingManual(true);
    try {
      const res = await fetchApi(`/api/productos-manuales/${manualDeleteId}/`, { method: "DELETE" });
      if (!res.ok) {
        setToast({ variant: "error", title: "No se pudo eliminar", message: "Intenta de nuevo en unos segundos." });
        return;
      }
      await fetchManualProducts();
      setManualProducts((prev) => prev.filter((x) => x.id !== manualDeleteId));
      setManualDeleteId(null);
      setToast({
        variant: "success",
        title: "Producto eliminado",
        message: nombre ? `«${nombre}» se quitó del catálogo manual.` : undefined,
      });
    } catch {
      setToast({ variant: "error", title: "Error de conexión", message: "No se pudo eliminar el producto manual." });
    } finally {
      setDeletingManual(false);
    }
  };

  return (
    <>
      <PageMeta title="Productos | Catálogo" description="Catálogo de productos" />
      <div className="min-h-[calc(100dvh-5rem)] overflow-x-hidden">
        <div
          className="mx-auto w-full max-w-[min(100%,1920px)] space-y-6 px-3 pb-10 pt-6 text-sm sm:space-y-7 sm:px-5 sm:pb-12 sm:pt-7 sm:text-base md:px-6 lg:px-8 xl:px-10 2xl:max-w-[min(100%,2200px)]"
          style={sheetFontStyle}
        >
          <nav className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]" aria-label="Migas de pan">
            <Link to="/" className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-black/[0.04] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC]">Inicio</Link>
            <span className="text-[#D3D3D8] dark:text-[#3D3D4A]" aria-hidden>/</span>
            <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]">Productos</span>
          </nav>

          {!canProductosView ? (
            <div className={`${claudeCardShell} px-4 py-10 text-center text-[15px] text-[#6E6E77] dark:text-[#8EA0B8]`}>
              No tienes permiso para ver Productos.
            </div>
          ) : (
          <div className="flex flex-col gap-4">
            <header className="relative overflow-hidden rounded-[24px] bg-[#17235B] px-5 py-6 dark:bg-[#1B2A63] sm:px-8 sm:py-8">
              <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#E6A23C]/15 blur-3xl" aria-hidden />
              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]">
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">Productos y servicios</p>
                    <h1 className={`mt-1 ${claudeHeroHeading}`}>Productos</h1>
                    <p className={`mt-1.5 max-w-[60ch] ${claudeBody}`}>Consulta precios con IVA, existencias y fichas técnicas. Filtra por fuente, categoría o marca cuando necesites resultados más precisos.</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {tipoCambio ? (
                    <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-[13px] font-medium text-white/85">
                      <span className="size-1.5 rounded-full bg-[#4ADE80]" aria-hidden />
                      Tipo de cambio ${tipoCambio.toFixed(2)}
                    </span>
                  ) : null}
                  {manualProducts.length > 0 ? (
                    <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[rgba(230,162,60,0.16)] px-3.5 text-[13px] font-semibold text-[#E6A23C]">
                      {manualProducts.length} manual{manualProducts.length === 1 ? "" : "es"}
                    </span>
                  ) : null}
                </div>
              </div>
            </header>

            <form onSubmit={handleSearch}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
                <div className="relative">
                  <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E6E77] dark:text-[#64748b] sm:left-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                  <input id="search-input" type="text" value={busquedaInput} onChange={(e) => handleSearchInputChange(e.target.value)} placeholder="Buscar por producto, marca o modelo…" className={claudeSearchInput} />
                  {busquedaInput && (
                    <button
                      type="button"
                      onClick={() => handleSearchInputChange("")}
                      aria-label="Limpiar búsqueda"
                      className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-9 w-10 items-center justify-center rounded-lg text-[#6E6E77] transition-colors hover:bg-[#E7E7EA]/60 hover:text-[#52525B] dark:text-[#8EA0B8] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC]"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" /></svg>
                    </button>
                  )}
                </div>
                <div className="flex items-end gap-2 md:self-end">
                  {canProductosCreate ? (
                    <button type="button" onClick={() => openCreateManual()} className={claudePrimaryBtn}>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
                      Nuevo producto
                    </button>
                  ) : null}
                </div>
              </div>
            </form>

            {toast && (
              <InlineAlert
                variant={toast.variant}
                title={toast.title}
                message={toast.message}
                onDismiss={() => setToast(null)}
              />
            )}

            {error && (
              <InlineAlert
                variant={productos.length > 0 ? "warning" : "error"}
                title={productos.length > 0 ? "Catálogo con incidencias" : "No se pudo cargar el catálogo"}
                message={
                  productos.length > 0
                    ? error
                    : `${error} Usa el filtro «Manual» si ya cargaste productos propios, o contacta a soporte.`
                }
              />
            )}

            <div className="pt-1">
              <ComponentCard compact title="Resultados" desc={(hasFiltro || autoCatalog) && total > 0 ? `${total.toLocaleString("es-MX")} artículo${total === 1 ? "" : "s"} encontrados${paginas > 1 ? ` · página ${pagina} de ${paginas}` : ""}.` : "Los resultados aparecen aquí según tu búsqueda y filtros."} className="!overflow-visible rounded-[24px] border-[#E7E7EA] bg-white shadow-[0_6px_20px_-10px_rgba(9,9,11,0.14)] dark:border-[#273244] dark:!bg-[#111827] dark:shadow-[0_10px_28px_-12px_rgba(0,0,0,0.6)]"
                actions={
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 rounded-[10px] border border-[#E7E7EA] bg-[#FAFAFA] p-0.5 dark:border-[#273244] dark:bg-[#1B2539]">
                      <button type="button" onClick={() => setViewMode("table")} title="Vista tabla" aria-pressed={viewMode === "table"} disabled={loading} className={`inline-flex h-8 w-8 items-center justify-center rounded-[8px] transition ${viewMode === "table" ? "bg-white text-[#1B5CFF] shadow-[0_1px_3px_rgba(9,9,11,0.08)] dark:bg-[#111827] dark:text-[#4B7CFF]" : "text-[#6E6E77] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:text-[#F8FAFC]"}`}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></svg>
                      </button>
                      <button type="button" onClick={() => setViewMode("cards")} title="Vista tarjetas" aria-pressed={viewMode === "cards"} disabled={loading} className={`inline-flex h-8 w-8 items-center justify-center rounded-[8px] transition ${viewMode === "cards" ? "bg-white text-[#1B5CFF] shadow-[0_1px_3px_rgba(9,9,11,0.08)] dark:bg-[#111827] dark:text-[#4B7CFF]" : "text-[#6E6E77] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:text-[#F8FAFC]"}`}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                      </button>
                    </div>
                    <div className="relative" ref={filterRef}>
                      <button type="button" onClick={() => setFilterOpen((v) => !v)} aria-expanded={filterOpen} className={`${claudeSecondaryBtn} h-10 px-4`}>
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h13" /><path d="M3 12h10" /><path d="M3 17h7" /><path d="M18 7v10" /><path d="M21 10l-3-3-3 3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Filtrado
                        {hasFiltro ? <span className="ml-0.5 inline-flex size-1.5 rounded-full bg-[#1B5CFF] dark:bg-[#4B7CFF]" aria-hidden /> : null}
                      </button>
                      {filterOpen && (
                        <div className="absolute right-0 z-[120] mt-2 max-h-[min(80vh,26rem)] w-80 overflow-auto rounded-[16px] border border-[#E7E7EA] bg-white p-4 shadow-[0_12px_32px_-12px_rgba(9,9,11,0.25)] dark:border-[#273244] dark:bg-[#151E32]">
                          <div className="mb-4">
                            <label htmlFor="orden-select" className="mb-2 block text-[13px] font-medium text-[#52525B] dark:text-[#B7C1D1]">Ordenar por</label>
                            <select id="orden-select" value={orden} onChange={(e) => { setOrden(e.target.value as NonNullable<SyscomSearchParams["orden"]>); setAutoCatalog(false); resetPage(); }} className={claudeSelect}>
                              {ORDEN_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                            </select>
                          </div>
                          <div className="mb-4">
                            <label className="mb-2 block text-[13px] font-medium text-[#52525B] dark:text-[#B7C1D1]">Fuente de datos</label>
                            <div className="inline-flex w-full rounded-[10px] border border-[#E7E7EA] bg-[#FAFAFA] p-1 dark:border-[#273244] dark:bg-[#1B2539]">
                              {[{ value: "", label: "Todas" }, { value: "syscom", label: "Syscom" }, { value: "tvc", label: "TVC" }, { value: "manual", label: "Manual" }].map((option) => {
                                const active = fuente === option.value;
                                return (<button key={option.label} type="button" onClick={() => { setFuente(option.value as CatalogFuente); setAutoCatalog(false); resetPage(); }} className={`h-9 flex-1 rounded-[8px] px-2 text-[13px] font-semibold transition-colors ${active ? "bg-white text-[#1B5CFF] shadow-[0_1px_3px_rgba(9,9,11,0.08)] dark:bg-[#111827] dark:text-[#4B7CFF]" : "text-[#6E6E77] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:text-[#F8FAFC]"}`}>{option.label}</button>);
                              })}
                            </div>
                          </div>
                          <div className="mb-4">
                            <label htmlFor="categoria-select" className="mb-2 block text-[13px] font-medium text-[#52525B] dark:text-[#B7C1D1]">Categoría</label>
                            <select id="categoria-select" value={categoriaId} onChange={(e) => { setCategoriaId(e.target.value); setAutoCatalog(false); resetPage(); }} className={claudeSelect}>
                              <option value="">Todas las categorías</option>
                              {categorias.map((c) => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                              {loadingCatalogos && !categorias.length && <option disabled>Cargando categorías…</option>}
                            </select>
                          </div>
                          <div className="mb-4">
                            <label htmlFor="marca-select" className="mb-2 block text-[13px] font-medium text-[#52525B] dark:text-[#B7C1D1]">Marca</label>
                            <select id="marca-select" value={marcaId} onChange={(e) => { setMarcaId(e.target.value); setAutoCatalog(false); resetPage(); }} className={claudeSelect}>
                              <option value="">Todas las marcas</option>
                              {marcas.slice(0, MARCAS_SELECT_LIMIT).map((m) => (<option key={m.id} value={m.id}>{m.nombre}</option>))}
                              {loadingCatalogos && !marcas.length && <option disabled>Cargando marcas…</option>}
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => { clearFiltros(); setFilterOpen(false); }} className={`${claudeSecondaryBtn} h-10 flex-1 px-3 text-[13px]`}>Limpiar filtros</button>
                            <button type="button" onClick={() => setFilterOpen(false)} className={`${claudePrimaryBtn} h-10 flex-1 px-3 text-[13px]`}>Aplicar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                }
              >
                <div className="p-2 pt-0">
                  {viewMode === "cards" && !loading && productos.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {productos.map((p) => (
                        <div key={p.producto_id} role="button" tabIndex={0} onClick={() => openDetailModal(p.producto_id)} onKeyDown={(e) => e.key === "Enter" && openDetailModal(p.producto_id)} className="flex cursor-pointer gap-3 rounded-[16px] border border-[#E7E7EA] bg-white p-3 transition-colors hover:border-[#D3D3D8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#1B2539] dark:hover:border-[#3A4661]">
                          <div className="w-16 h-16 shrink-0 rounded-[12px] border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#111827] flex items-center justify-center overflow-hidden">
                            {getCatalogProductoImageUrl(p) ? (<img src={getCatalogProductoImageUrl(p)!} alt={p.titulo} className="w-full h-full object-contain" loading="lazy" />) : (<span className="text-[10px] text-[#A1A1AA]">—</span>)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC] line-clamp-2">{p.titulo}</p>
                            <p className="text-[12px] text-[#6E6E77] dark:text-[#8EA0B8] mt-0.5">{p.marca} · {p.modelo}{p.fuente ? ` · ${p.fuente}` : ""}</p>
                            {p.sat_key ? (
                              <p className="mt-0.5 font-mono text-[11px] text-[#6E6E77] dark:text-[#8EA0B8]" title={p.sat_description || undefined}>
                                Clave SAT {p.sat_key}
                              </p>
                            ) : null}
                            <p className="mt-1 text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC] tabular-nums">{formatPrecioPublicoMxnConIva(p, tipoCambio)}</p>
                            {p.total_existencia != null && <p className="text-[11px] text-[#6E6E77] dark:text-[#8EA0B8]">Stock {p.total_existencia}</p>}
                            <a href={getProductoLink(p)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[11px] font-semibold text-[#1B5CFF] dark:text-[#4B7CFF] mt-1 inline-block hover:underline">Ver más →</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : viewMode === "cards" ? (
                    <div className="rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] py-14 text-center dark:border-[#273244] dark:bg-[#1B2539]">
                      {loading && <div className="inline-flex items-center gap-2 text-[15px] text-[#6E6E77] dark:text-[#8EA0B8]"><svg className="h-4.5 w-4.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" /></svg>Cargando productos…</div>}
                      {!loading && productos.length === 0 && !error && (
                        <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
                          <span className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]"><svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                          <p className="text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{autoCatalog ? "No hay productos para mostrar." : "No encontramos coincidencias."}</p>
                          <p className="text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">{autoCatalog ? "Ajusta filtros o intenta otra búsqueda." : "Prueba con otra palabra clave o limpia filtros."}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#1B2539]">
                      <Table className="w-full min-w-[820px] sm:min-w-0 xl:min-w-full">
                        <TableHeader className="sticky top-0 z-10 border-b border-[#E7E7EA] bg-white text-[11px] font-semibold text-[#09090B] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC]">
                          <TableRow>
                            <TableCell isHeader className="px-3 py-2 text-left w-[64px] text-[#52525B] dark:text-[#B7C1D1]">Imagen</TableCell>
                            <TableCell isHeader className="px-3 py-2 text-left min-w-[200px] text-[#52525B] dark:text-[#B7C1D1]">Producto</TableCell>
                            <TableCell isHeader className="px-3 py-2 text-left w-[100px] text-[#52525B] dark:text-[#B7C1D1]">Marca</TableCell>
                            <TableCell isHeader className="px-3 py-2 text-left w-[120px] text-[#52525B] dark:text-[#B7C1D1]">Modelo</TableCell>
                            <TableCell isHeader className="px-3 py-2 text-left w-[110px] text-[#52525B] dark:text-[#B7C1D1]">Clave SAT</TableCell>
                            <TableCell isHeader className="px-3 py-2 text-left w-[90px] text-[#52525B] dark:text-[#B7C1D1]">Fuente</TableCell>
                            <TableCell isHeader className="px-3 py-2 text-left w-[120px] text-[#52525B] dark:text-[#B7C1D1]">Precio</TableCell>
                            <TableCell isHeader className="px-3 py-2 text-left w-[80px] text-[#52525B] dark:text-[#B7C1D1]">Stock</TableCell>
                            <TableCell isHeader className="px-3 py-2 text-center w-[100px] text-[#52525B] dark:text-[#B7C1D1]">Acción</TableCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-[#EDEDED] text-[12px] text-[#44403c] dark:divide-[#273244] dark:text-[#e5e7eb]">
                          {loading && (<TableRow><TableCell colSpan={9} className="px-3 py-8 text-center text-[#6E6E77] dark:text-[#8EA0B8]"><div className="inline-flex items-center gap-2 text-[15px]"><svg className="h-4.5 w-4.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" /></svg>Cargando productos…</div></TableCell></TableRow>)}
                          {!loading && productos.length === 0 && !error && (<TableRow><TableCell colSpan={9} className="px-3 py-10 text-center text-[15px] text-[#6E6E77] dark:text-[#8EA0B8]">{autoCatalog ? "No hay productos para mostrar." : "No encontramos resultados con los filtros actuales."}</TableCell></TableRow>)}
                          {!loading && productos.length > 0 && productos.map((p) => {
                            const imgUrl = getCatalogProductoImageUrl(p); const link = getProductoLink(p);
                            return (
                              <TableRow key={p.producto_id} className="hover:bg-[#FAFAFA] dark:hover:bg-white/[0.04]">
                                <TableCell className="px-3 py-2 w-[64px] align-middle"><div className="w-10 h-10 rounded-[10px] border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#111827] flex items-center justify-center overflow-hidden shrink-0">{imgUrl ? (<img src={imgUrl} alt={p.titulo} className="w-full h-full object-contain" loading="lazy" />) : (<span className="text-[10px] text-[#A1A1AA]">—</span>)}</div></TableCell>
                                <TableCell className="px-3 py-2 min-w-[200px] max-w-[280px]"><button type="button" onClick={() => openDetailModal(p.producto_id)} className="block w-full truncate text-left font-medium text-[#09090B] hover:text-[#1B5CFF] hover:underline dark:text-[#F8FAFC] dark:hover:text-[#4B7CFF]" title={p.titulo}>{p.titulo}</button></TableCell>
                                <TableCell className="px-3 py-2 w-[100px] whitespace-nowrap">{p.marca}</TableCell>
                                <TableCell className="px-3 py-2 w-[120px] whitespace-nowrap">{p.modelo}</TableCell>
                                <TableCell className="px-3 py-2 w-[110px] whitespace-nowrap font-mono text-[11px]">
                                  {p.sat_key?.trim() ? (
                                    <span title={p.sat_description || undefined}>{p.sat_key}</span>
                                  ) : (
                                    <span className="font-sans text-[#A1A1AA]">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="px-3 py-2 w-[90px] whitespace-nowrap capitalize">{p.fuente || "—"}</TableCell>
                                <TableCell className="px-3 py-2 w-[120px] whitespace-nowrap font-semibold text-[#09090B] dark:text-[#F8FAFC] tabular-nums">{formatPrecioPublicoMxnConIva(p, tipoCambio)}</TableCell>
                                <TableCell className="px-3 py-2 w-[80px] whitespace-nowrap">{p.total_existencia ?? "—"}</TableCell>
                                <TableCell className="px-3 py-2 text-center w-[100px]">
                                  {p.fuente === "manual" ? (
                                    <div className="inline-flex items-center gap-1 rounded-[8px] bg-[#FAFAFA] px-1.5 py-1 dark:bg-white/[0.06]">
                                      {canProductosEdit ? (
                                        <button type="button" onClick={() => openEditManual(p.producto_id)} className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E7E7EA] bg-white text-[#6E6E77] transition-colors hover:border-[#1B5CFF]/50 hover:text-[#1B5CFF] dark:border-[#273244] dark:bg-[#111827] dark:text-[#8EA0B8] dark:hover:border-[#4B7CFF]/50 dark:hover:text-[#4B7CFF]" title="Editar" aria-label={`Editar ${p.titulo}`}><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></svg></button>
                                      ) : null}
                                      {canProductosDelete ? (
                                        <button type="button" onClick={() => setManualDeleteId(p.producto_id)} className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#E7E7EA] bg-white text-[#6E6E77] transition-colors hover:border-[#C22B2B]/50 hover:text-[#C22B2B] dark:border-[#273244] dark:bg-[#111827] dark:text-[#8EA0B8] dark:hover:border-[#F87171]/50 dark:hover:text-[#F87171]" title="Eliminar" aria-label={`Eliminar ${p.titulo}`}><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m6 6 1 14h10l1-14" /></svg></button>
                                      ) : null}
                                      {!canProductosEdit && !canProductosDelete ? (
                                        <span className="px-1 text-[10px] text-[#6E6E77] dark:text-[#8EA0B8]">Manual</span>
                                      ) : null}
                                    </div>
                                  ) : (<a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1B5CFF] dark:text-[#4B7CFF] hover:underline">Ver más</a>)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {!loading && total > 0 && productos.length > 0 && (
                    <div className="border-t border-[#E7E7EA] px-4 py-3 dark:border-[#273244] sm:px-5 sm:py-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[14px] text-[#6E6E77] dark:text-[#8EA0B8]">{total} resultado(s){paginas > 1 && (<> · Página <span className="font-medium text-[#09090B] dark:text-[#F8FAFC]">{pagina}</span> de <span className="font-medium text-[#09090B] dark:text-[#F8FAFC]">{paginas}</span></>)}</p>
                        {paginas > 1 && (
                          <div className="flex items-center gap-2">
                            <button type="button" aria-label="Página anterior" onClick={() => setPagina((prev) => Math.max(1, prev - 1))} disabled={pagina <= 1} className="inline-flex size-10 items-center justify-center rounded-[10px] border border-[#E7E7EA] bg-white text-[#09090B] transition-colors hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-45 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:bg-[#243048]"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg></button>
                            <button type="button" aria-label="Página siguiente" onClick={() => setPagina((prev) => Math.min(paginas, prev + 1))} disabled={pagina >= paginas} className="inline-flex size-10 items-center justify-center rounded-[10px] border border-[#E7E7EA] bg-white text-[#09090B] transition-colors hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-45 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:bg-[#243048]"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg></button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </ComponentCard>
            </div>
          </div>
          )}
        </div>
      </div>

      <Modal isOpen={detailModalOpen} onClose={closeDetailModal} ariaLabelledBy={detailModalTitleId} className={`${modalShellClass} sm:max-w-3xl`}>
        <header className={modalHeaderClass}>
          <div className="flex items-start gap-3.5">
            <span className={modalHeaderIconClass}>
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className={modalEyebrowClass}>Catálogo · Productos</p>
              <h3 id={detailModalTitleId} className={`mt-1 ${modalTitleClass}`}>Detalle de producto</h3>
              <p className={modalSubtitleClass}>Precio público con IVA, existencias y ficha técnica.</p>
            </div>
          </div>
        </header>
        <div className={modalBodyClass}>
          {loadingDetail && (
            <div className="py-16 text-center" role="status">
              <div className="inline-flex size-12 animate-spin rounded-full border-2 border-[#E7E7EA] border-t-[#1B5CFF] dark:border-[#273244] dark:border-t-[#4B7CFF]" aria-hidden />
              <p className="mt-4 text-[14px] text-[#6E6E77] dark:text-[#8EA0B8]">Cargando detalle…</p>
            </div>
          )}
          {!loadingDetail && !detailProduct && (
            <div className={`${modalSectionClass} text-center`} role="status">
              <p className="text-[15px] font-medium text-[#09090B] dark:text-[#F8FAFC]">No se pudo cargar el detalle de este producto.</p>
              <p className="mt-1 text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">Puede que ya no esté disponible en el catálogo del proveedor.</p>
            </div>
          )}
          {!loadingDetail && detailProduct && (() => {
            const imageUrls = getProductoImagenesUrls(detailProduct); const mainImage = imageUrls[selectedImageIndex] ?? imageUrls[0];
            const precioDisplay = formatPrecioPublicoMxnConIva(detailProduct, tipoCambio);
            return (
              <div className="space-y-4">
                {imageUrls.length > 0 && (
                  <div className={modalSectionClass}>
                    <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]">
                      <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      Galería
                    </div>
                    <div className="overflow-hidden rounded-[12px] border border-[#E7E7EA] bg-white dark:border-[#273244] dark:bg-[#111827]">
                      <div className="flex aspect-square max-h-80 w-full items-center justify-center p-4"><img src={mainImage} alt={detailProduct.titulo} className="max-h-full w-full object-contain" /></div>
                      {imageUrls.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto border-t border-[#E7E7EA] p-3 dark:border-[#273244]">
                          {imageUrls.map((url, i) => (
                            <button key={i} type="button" onClick={() => setSelectedImageIndex(i)} aria-label={`Imagen ${i + 1}`} className={`flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border-2 transition ${i === selectedImageIndex ? "border-[#1B5CFF] ring-2 ring-[rgba(27,92,255,0.25)] dark:border-[#4B7CFF]" : "border-[#E7E7EA] hover:border-[#D3D3D8] dark:border-[#273244] dark:hover:border-[#3A4661]"}`}>
                              <img src={url} alt={`${detailProduct.titulo} — imagen ${i + 1}`} className="h-full w-full object-contain" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className={modalSectionClass}>
                  <div className="flex gap-4">
                    {imageUrls.length === 0 && (
                      <div className="flex size-20 shrink-0 items-center justify-center rounded-[12px] border border-[#E7E7EA] bg-white dark:border-[#273244] dark:bg-[#111827]">
                        <svg className="size-10 text-[#D3D3D8] dark:text-[#3A4661]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[18px] font-semibold leading-snug tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">{detailProduct.titulo}</h4>
                      <p className="mt-2 text-[20px] font-bold tabular-nums tracking-[-0.4px] text-[#9A6B15] dark:text-[#E6A23C]">{precioDisplay}</p>
                      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3.5">
                        <div>
                          <dt className="text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">Marca</dt>
                          <dd className="mt-0.5 text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC]">{detailProduct.marca || "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">Modelo / SKU</dt>
                          <dd className="mt-0.5 font-mono text-[13px] font-medium text-[#09090B] dark:text-[#F8FAFC]">{detailProduct.modelo || detailProduct.sku || "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">Clave SAT</dt>
                          <dd className="mt-0.5 font-mono text-[13px] font-medium text-[#09090B] dark:text-[#F8FAFC]" title={detailProduct.sat_description || undefined}>{detailProduct.sat_key?.trim() || "—"}</dd>
                          {detailProduct.sat_description?.trim() ? (
                            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[#6E6E77] dark:text-[#8EA0B8]">{detailProduct.sat_description}</p>
                          ) : null}
                        </div>
                        <div>
                          <dt className="text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">Stock</dt>
                          <dd className="mt-0.5 text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC]">{detailProduct.total_existencia !== null && detailProduct.total_existencia !== undefined ? detailProduct.total_existencia : "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">Fuente</dt>
                          <dd className="mt-0.5 text-[14px] font-medium capitalize text-[#09090B] dark:text-[#F8FAFC]">{detailProduct.fuente || "syscom"}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
                {detailProduct.caracteristicas && detailProduct.caracteristicas.length > 0 && (
                  <div className={modalSectionClass}>
                    <h4 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]">Características</h4>
                    <ul className="list-inside list-disc space-y-1 text-[14px] leading-[20px] text-[#52525B] dark:text-[#B7C1D1]">{detailProduct.caracteristicas.map((c, i) => (<li key={i}>{c}</li>))}</ul>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
        <div className={modalFooterClass}>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button type="button" onClick={closeDetailModal} className={claudeSecondaryBtn}>Cerrar</button>
            {detailProduct && getProductoLink(detailProduct) ? (
              <a href={getProductoLink(detailProduct)} target="_blank" rel="noopener noreferrer" className={claudePrimaryBtn}>
                Ver en proveedor
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17 17 7M8 7h9v9" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
            ) : null}
          </div>
        </div>
      </Modal>

      <Modal isOpen={manualModalOpen} onClose={() => setManualModalOpen(false)} closeOnBackdropClick={false} ariaLabelledBy={manualModalTitleId} className={modalShellClass}>
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <header className={modalHeaderClass}>
            <div className="flex items-start gap-3.5">
              <span className={modalHeaderIconClass}>
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M4 7a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
                  <path d="M12 10v6M9 13h6" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={modalEyebrowClass}>Catálogo · Productos</p>
                  {editingManualId ? (
                    <span className="inline-flex h-5 items-center rounded-full bg-[rgba(230,162,60,0.22)] px-2 text-[10px] font-semibold uppercase tracking-wide text-[#E6A23C]">Edición</span>
                  ) : (
                    <span className="inline-flex h-5 items-center rounded-full bg-white/10 px-2 text-[10px] font-semibold uppercase tracking-wide text-white/70">Nuevo</span>
                  )}
                </div>
                <h3 id={manualModalTitleId} className={`mt-1 ${modalTitleClass}`}>{editingManualId ? "Editar producto manual" : "Nuevo producto manual"}</h3>
                <p className={modalSubtitleClass}>Se muestra junto a los catálogos de proveedores y aparece primero en la búsqueda.</p>
              </div>
            </div>
          </header>

          <div className={modalBodyClass}>
            {manualFormError && (
              <div id="manual-form-error">
                <InlineAlert variant="error" title="Revisa el formulario" message={manualFormError} />
              </div>
            )}

            <section className={modalSectionClass}>
              <div className="mb-4 border-b border-[#E7E7EA] pb-3 dark:border-[#273244]">
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]">Datos del producto</h4>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={claudeFieldLabel} htmlFor="manual-producto">Producto<span className={requiredMark}>*</span></label>
                  <input id="manual-producto" value={manualForm.producto} onChange={(e) => setManualForm((p) => ({ ...p, producto: e.target.value }))} placeholder="Nombre del producto" className={claudeInput} />
                </div>
                <div>
                  <label className={claudeFieldLabel} htmlFor="manual-caracteristicas">Características</label>
                  <textarea id="manual-caracteristicas" value={manualForm.caracteristicas} onChange={(e) => setManualForm((p) => ({ ...p, caracteristicas: e.target.value }))} placeholder="Escribe una característica por línea" rows={4} className={claudeTextarea} />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={claudeFieldLabel} htmlFor="manual-marca">Marca<span className={requiredMark}>*</span></label>
                    <input id="manual-marca" value={manualForm.marca} onChange={(e) => setManualForm((p) => ({ ...p, marca: e.target.value }))} placeholder="Marca" className={claudeInput} />
                  </div>
                  <div>
                    <label className={claudeFieldLabel} htmlFor="manual-modelo">Modelo<span className={requiredMark}>*</span></label>
                    <input
                      id="manual-modelo"
                      value={manualForm.modelo}
                      onChange={(e) => {
                        setManualFormError("");
                        setManualForm((p) => ({ ...p, modelo: e.target.value }));
                      }}
                      placeholder="Modelo"
                      className={claudeInput}
                      aria-invalid={Boolean(manualFormError && /modelo/i.test(manualFormError))}
                      aria-describedby={manualFormError ? "manual-form-error" : undefined}
                    />
                  </div>
                </div>

                <div>
                  <label className={claudeFieldLabel} htmlFor="manual-sat-key">Clave SAT</label>
                  <input
                    id="manual-sat-key"
                    value={manualForm.sat_key}
                    onChange={(e) => setManualForm((p) => ({ ...p, sat_key: e.target.value }))}
                    placeholder="Ej. 43201500"
                    inputMode="numeric"
                    autoComplete="off"
                    className={`${claudeInput} font-mono tracking-wide`}
                    aria-describedby="manual-sat-key-hint"
                  />
                  <p id="manual-sat-key-hint" className="mt-1.5 text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">
                    Clave del producto/servicio del SAT para CFDI. Opcional.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={claudeFieldLabel} htmlFor="manual-precio">Precio<span className={requiredMark}>*</span></label>
                    <input id="manual-precio" type="number" min="0" step="0.01" value={manualForm.precio} onChange={(e) => setManualForm((p) => ({ ...p, precio: e.target.value }))} placeholder="0.00" className={claudeInput} />
                  </div>
                  <div>
                    <label className={claudeFieldLabel} htmlFor="manual-stock">Stock<span className={requiredMark}>*</span></label>
                    <input id="manual-stock" type="number" min="0" step="1" value={manualForm.stock} onChange={(e) => setManualForm((p) => ({ ...p, stock: e.target.value }))} placeholder="0" className={claudeInput} />
                  </div>
                </div>
              </div>
            </section>

            <section className={modalSectionClass}>
              <div className="mb-4 border-b border-[#E7E7EA] pb-3 dark:border-[#273244]">
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]">Imagen</h4>
              </div>
              {manualForm.imagen_url ? (
                <div className="space-y-3">
                  <div className="w-full max-w-[280px] overflow-hidden rounded-[12px] border border-[#E7E7EA] bg-white dark:border-[#273244] dark:bg-[#111827]">
                    <img src={resolveMediaUrl(manualForm.imagen_url)} alt="Producto" className="h-40 w-full object-contain p-2" />
                  </div>
                  <button type="button" onClick={() => setManualForm((prev) => ({ ...prev, imagen_url: "" }))} className={`${claudeSecondaryBtn} h-9 px-3 text-[13px]`}>
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" /></svg>
                    Quitar imagen
                  </button>
                </div>
              ) : (
                <div {...getManualImageRootProps()} className={`flex cursor-pointer flex-col items-center gap-1 rounded-[12px] border border-dashed px-4 py-6 text-center transition-colors ${isManualImageDragActive ? "border-[#1B5CFF] bg-[rgba(27,92,255,0.06)] ring-4 ring-[rgba(27,92,255,0.14)] dark:border-[#4B7CFF] dark:bg-[rgba(75,124,255,0.10)]" : "border-[#D3D3D8] bg-white hover:border-[#1B5CFF]/50 dark:border-[#3A4661] dark:bg-[#111827] dark:hover:border-[#4B7CFF]/50"}`}>
                  <input {...getManualImageInputProps()} />
                  <p className="text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC]">{isManualImageDragActive ? "Suelta aquí para subir" : "Haz clic o arrastra una imagen (máx. 1)"}</p>
                  <p className="text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">Formatos: PNG, JPG, WebP o SVG</p>
                </div>
              )}
              {manualImageUploading && (
                <div className="mt-2 flex items-center gap-2 text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" /></svg>
                  Subiendo…
                </div>
              )}
            </section>
          </div>

          <div className={modalFooterClass}>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button type="button" onClick={() => setManualModalOpen(false)} disabled={savingManual} className={claudeSecondaryBtn}>Cancelar</button>
              <button type="button" onClick={saveManualProduct} disabled={savingManual || manualImageUploading} aria-busy={savingManual} className={claudePrimaryBtn}>
                {savingManual ? (
                  <>
                    <span className="inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
                    Guardando…
                  </>
                ) : editingManualId ? "Guardar cambios" : "Agregar producto"}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!manualDeleteId} onClose={() => setManualDeleteId(null)} closeOnBackdropClick={false} ariaLabelledBy={deleteModalTitleId} className={modalSmallShellClass}>
        <div className="bg-white p-6 dark:bg-[#111827]">
          <div className="mb-5 flex items-start gap-3.5">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#FEF2F2] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M6 6l1 16h10l1-16" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <h3 id={deleteModalTitleId} className="text-[17px] font-semibold leading-[1.3] tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">Eliminar producto manual</h3>
              <p className="mt-1 text-[14px] leading-[20px] text-[#52525B] dark:text-[#B7C1D1]">Esta acción no se puede deshacer.</p>
            </div>
          </div>
          <p className="mb-6 text-[15px] leading-[22px] text-[#52525B] dark:text-[#B7C1D1]">
            ¿Seguro que deseas quitar{" "}
            <span className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">
              «{manualProducts.find((x) => x.id === manualDeleteId)?.producto || "este producto"}»
            </span>{" "}
            del catálogo manual?
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setManualDeleteId(null)} disabled={deletingManual} className={claudeSecondaryBtn}>Cancelar</button>
            <button type="button" onClick={confirmDeleteManual} disabled={deletingManual} aria-busy={deletingManual} className={claudeDangerBtn}>
              {deletingManual ? "Eliminando…" : "Eliminar"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
