import { useCallback, useEffect, useRef, useState } from "react";
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
  fetchIntraxProductos,
  isCatalogAuthReady,
  getProductoImageUrl,
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
} from "./syscomCatalog";
import { Modal } from "@/components/ui/modal";
import { fetchApi, resolveMediaUrl } from "@/config/api";
import { useAuth } from "@/context/AuthContext";

/* ── Claude-style design tokens ── */
const claudeCardShell =
  "overflow-hidden rounded-3xl border border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.28)] backdrop-blur-sm dark:border-[#273244] dark:bg-[#111827]/80 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.55)]";

const claudeSearchInput =
  "h-10 w-full rounded-xl border border-[#e2d9ca] bg-[#fffdfa] px-3 pl-10 pr-10 text-sm text-[#1c1917] outline-none transition-all placeholder:text-[#78716c] focus:border-[#ff801f]/60 focus:ring-2 focus:ring-[#ff801f]/15 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:placeholder:text-[#8ea0b8] dark:focus:border-[#fb923c]/70 dark:focus:ring-[#fb923c]/20";

const claudeHeroHeading =
  "[font-family:Georgia,'Times_New_Roman',serif] text-[clamp(1.85rem,2.8vw,2.6rem)] font-medium leading-[1.2] tracking-[-0.01em] text-[#1c1917] dark:text-[#f8fafc]";

const claudeSubheading =
  "[font-family:Georgia,'Times_New_Roman',serif] text-[clamp(1.1rem,1.3vw,1.25rem)] font-medium leading-[1.2] text-gray-900 dark:text-white";


const claudeBody = "text-base font-normal leading-[1.6] text-[#57534e] dark:text-[#b7c1d1]";

const claudeLabel =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#78716c] dark:text-[#8ea0b8] sm:text-xs";

const claudeFieldLabel =
  "mb-1.5 block text-xs font-medium leading-[1.6] tracking-[0.12px] text-[#57534e] dark:text-[#cbd5e1] sm:text-sm";

const claudeInput =
  "h-10 w-full rounded-xl border border-[#e2d9ca] bg-[#fffdfa] px-3 text-sm text-[#1c1917] outline-none transition-colors placeholder:text-[#78716c] focus:border-[#ff801f] focus:ring-2 focus:ring-[#ff801f]/20 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:placeholder:text-[#8ea0b8] dark:focus:border-[#fb923c] dark:focus:ring-[#fb923c]/20";

const claudeSelect =
  "w-full h-10 rounded-xl border border-[#e2d9ca] bg-[#fffdfa] px-3 text-sm text-[#1c1917] outline-none transition-colors focus:border-[#ff801f] focus:ring-2 focus:ring-[#ff801f]/20 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:focus:border-[#fb923c] dark:focus:ring-[#fb923c]/20";

const claudePrimaryBtn =
  "inline-flex items-center gap-2 rounded-xl bg-[#ff801f] px-4 py-2.5 text-sm font-semibold text-black shadow-none transition-colors hover:bg-[#ff6a00] active:brightness-95";

const claudeSecondaryBtn =
  "inline-flex items-center justify-center rounded-lg border border-[#e2d9ca] bg-white px-3 py-2.5 text-xs font-semibold text-[#44403c] transition-all hover:border-[#d6d3d1] hover:bg-[#fafaf9] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#e5e7eb] dark:hover:bg-white/[0.05]";

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
    m.modelo.toLowerCase().includes(q)
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

const fetchGlobalCatalogPage = async (
  q: string,
  page: number,
  categoriaId: string,
  marcaId: string,
  orden: NonNullable<SyscomSearchParams["orden"]>,
): Promise<{ rows: SyscomProducto[]; syscomTotal: number; syscomPages: number; intraxTotal: number; intraxPages: number }> => {
  const syscomQuery = buildProductosQuery({
    busqueda: q,
    categoria: categoriaId || undefined,
    marca: marcaId || undefined,
    pagina: page,
    orden,
    ...SYSCOM_BUSQUEDA_AMPLIA,
  });
  const [syscomRes, intraxData] = await Promise.all([
    fetchSyscom(`productos/?${syscomQuery}`),
    fetchIntraxProductos({ fuente: "syscom", buscar: q, pagina: page, por_pagina: GLOBAL_SEARCH_PAGE_SIZE }).catch(
      (): IntraxProductosResponse => ({ productos: [] }),
    ),
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

  return {
    rows: dedupeProductosById([...syscomRows, ...intraxRows]),
    syscomTotal,
    syscomPages,
    intraxTotal,
    intraxPages,
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
  if (detail) return detail;
  return "Error al cargar productos.";
}

export default function ProductosPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const catalogReady = isAuthenticated && !authLoading;

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
  const [fuente, setFuente] = useState<"" | IntraxFuente>("");

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
  const [manualForm, setManualForm] = useState({ imagen_url: "", producto: "", caracteristicas: "", marca: "", modelo: "", precio: "", stock: "" });

  const fetchManualProducts = useCallback(async () => {
    if (!catalogReady) return;
    try {
      const res = await fetchApi("/api/productos-manuales/?page_size=500&ordering=-fecha_creacion", { method: "GET" });
      const data = await res.json().catch(() => ({ results: [] }));
      if (!res.ok) {
        setManualProducts([]);
        console.error("No se pudieron cargar productos manuales:", res.status, data);
        return;
      }
      const payload = data as { results?: unknown } | unknown[];
      const list: unknown[] = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as { results?: unknown }).results)
          ? ((payload as { results: unknown[] }).results)
          : [];
      const mapped: ManualProduct[] = list
        .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object")
        .map((x): ManualProduct => ({
          id: String(x.id ?? ""),
          imagen_url: String(x.imagen_url || ""),
          producto: String(x.producto || ""),
          caracteristicas: String(x.caracteristicas || ""),
          marca: String(x.marca || ""),
          modelo: String(x.modelo || ""),
          fuente: "manual",
          precio: toMoney2(Number(x.precio || 0)),
          stock: Number.isFinite(Number(x.stock)) ? Number(x.stock) : 0,
        }))
        .filter((x) => x.producto.trim());
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
      const [tc, catRes, marRes] = await Promise.all([fetchSyscomTipoCambio().catch(() => null), fetchSyscom("categorias/"), fetchSyscom("marcas/")]);
      if (catRes.ok) { const data = await catRes.json().catch(() => []); setCategorias(Array.isArray(data) ? data : []); }
      if (marRes.ok) { const data = await marRes.json().catch(() => []); setMarcas(Array.isArray(data) ? data : []); }
      setTipoCambio(tc);
    } catch {
      /* ignore */
    } finally {
      setLoadingCatalogos(false);
    }
  }, [catalogReady]);

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
            const catalogTotalEstimate = firstCatalog.syscomTotal + firstCatalog.intraxTotal;
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

        const catalogTotalEstimate = firstCatalog.syscomTotal + firstCatalog.intraxTotal;
        const maxCatalogPages = Math.max(firstCatalog.syscomPages, firstCatalog.intraxPages);
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
        const qLower = needle.trim().toLowerCase();
        const filtered = manualProducts.filter((m) => {
          if (!qLower) return true;
          return (
            m.producto.toLowerCase().includes(qLower) ||
            m.marca.toLowerCase().includes(qLower) ||
            m.modelo.toLowerCase().includes(qLower)
          );
        });
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
      if (fuente) {
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
        const qLower = busqueda.trim().toLowerCase();
        const filtered = manualProducts.filter((m) => {
          if (!qLower) return true;
          return (
            m.producto.toLowerCase().includes(qLower) ||
            m.marca.toLowerCase().includes(qLower) ||
            m.modelo.toLowerCase().includes(qLower)
          );
        });
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
    if (!detailModalOpen || !selectedProductId) { setDetailProduct(null); return; }
    const listedProduct = productosRef.current.find((p) => p.producto_id === selectedProductId);
    if (listedProduct?.fuente === "manual" || fuente) {
      setDetailProduct((listedProduct as SyscomProductoDetalle) ?? null);
      setLoadingDetail(false);
      return;
    }
    if (!isCatalogAuthReady()) return;
    setLoadingDetail(true);
    setDetailProduct(null);
    fetchSyscomProductoDetalle(selectedProductId).then((data) => { setDetailProduct(data ?? null); setSelectedImageIndex(0); }).finally(() => setLoadingDetail(false));
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

  const openCreateManual = () => { setEditingManualId(null); setManualFormError(""); setManualForm({ imagen_url: "", producto: "", caracteristicas: "", marca: "", modelo: "", precio: "", stock: "" }); setManualModalOpen(true); };
  const openEditManual = (id: string) => { const p = manualProducts.find((x) => x.id === id); if (!p) return; setEditingManualId(id); setManualFormError(""); setManualForm({ imagen_url: p.imagen_url || "", producto: p.producto || "", caracteristicas: p.caracteristicas || "", marca: p.marca || "", modelo: p.modelo || "", precio: String(p.precio ?? 0), stock: String(p.stock ?? 0) }); setManualModalOpen(true); };

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
    const body = { imagen_url: manualForm.imagen_url.trim(), producto, caracteristicas: manualForm.caracteristicas.trim(), marca, modelo, precio: toMoney2(precio), stock: Math.round(stock), activo: true };
    try {
      const isEdit = Boolean(editingManualId);
      const endpoint = isEdit ? `/api/productos-manuales/${editingManualId}/` : "/api/productos-manuales/";
      const res = await fetchApi(endpoint, { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data && typeof data === "object" && "detail" in data ? (data as { detail?: unknown }).detail : undefined;
        setManualFormError(typeof detail === "string" && detail.trim() ? detail : "No se pudo guardar el producto.");
        return;
      }
      await fetchManualProducts(); setManualModalOpen(false);
    } catch { setManualFormError("Error de conexión al guardar producto manual."); }
  };

  const confirmDeleteManual = async () => {
    if (!manualDeleteId || !catalogReady) return;
    try {
      const res = await fetchApi(`/api/productos-manuales/${manualDeleteId}/`, { method: "DELETE" });
      if (!res.ok) return;
      await fetchManualProducts();
      setManualProducts((prev) => prev.filter((x) => x.id !== manualDeleteId));
      setManualDeleteId(null);
    } catch {
      setManualFormError("Error de conexión al eliminar producto manual.");
    }
  };

  return (
    <>
      <PageMeta title="Productos | Catálogo" description="Catálogo de productos" />
      <div className="min-h-[calc(100dvh-5rem)] overflow-x-hidden">
        <div className="mx-auto w-full max-w-[min(100%,1920px)] space-y-6 px-3 pb-10 pt-6 text-sm sm:space-y-7 sm:px-5 sm:pb-12 sm:pt-7 sm:text-base md:px-6 lg:px-8 xl:px-10 2xl:max-w-[min(100%,2200px)]">
          <nav className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-[#78716c] dark:text-[#8ea0b8] sm:text-[13px]" aria-label="Migas de pan">
            <Link to="/" className="rounded-md px-1.5 py-0.5 text-[#57534e] transition-colors hover:bg-black/[0.03] hover:text-[#1c1917] dark:text-[#aeb8c8] dark:hover:bg-white/5 dark:hover:text-white">Inicio</Link>
            <span className="text-[#d6d3d1] dark:text-[#334155]" aria-hidden>/</span>
            <span className="text-[#44403c] dark:text-[#cbd5e1]">Productos</span>
          </nav>

          <div className="flex flex-col gap-4">
            <header className={`relative flex w-full flex-col gap-4 ${claudeCardShell} p-4 sm:p-6`}>
              <div className="pointer-events-none absolute right-4 top-4 h-20 w-20 rounded-full bg-[#ff801f]/10 blur-2xl sm:right-6 sm:top-6" />
              <div className="relative z-[1] flex min-w-0 items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff801f] text-black sm:h-11 sm:w-11">
                  <svg className="h-[18px] w-[18px] sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ea580c] dark:text-[#fb923c] sm:text-[11px]">Productos y servicios</p>
                  <h1 className={`mt-0.5 ${claudeHeroHeading}`}>Productos</h1>
                  <p className={`mt-1 max-w-2xl ${claudeBody}`}>Consulta precios con IVA, existencias y fichas técnicas. Filtra por fuente, categoría o marca cuando necesites resultados más precisos.</p>
                  <div className="mt-3 h-px w-full max-w-xl bg-gradient-to-r from-[#ff801f]/35 via-[#ffbf8d]/30 to-transparent dark:from-[#ff9a52]/35 dark:via-[#64748b]/25 dark:to-transparent" />
                </div>
              </div>
            </header>

            <form onSubmit={handleSearch}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
                <div className="relative">
                  <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78716c] dark:text-[#64748b] sm:left-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                  <input id="search-input" type="text" value={busquedaInput} onChange={(e) => handleSearchInputChange(e.target.value)} placeholder="Buscar por producto, marca o modelo..." className={`${claudeSearchInput} pr-11`} />
                </div>
                <div className="flex items-end gap-2 md:self-end">
                  <button type="button" onClick={() => openCreateManual()} className={claudePrimaryBtn}>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
                    Nuevo producto
                  </button>
                </div>
              </div>
            </form>

            {error && (
              <div className={`rounded-2xl px-4 py-3 ${productos.length > 0 ? "border border-amber-200/80 bg-amber-50/90 dark:border-amber-900/40 dark:bg-amber-950/30" : "border border-red-200/80 bg-red-50/90 dark:border-red-900/40 dark:bg-red-950/30"}`}>
                <p className={`text-sm font-medium ${productos.length > 0 ? "text-amber-900 dark:text-amber-200" : "text-red-800 dark:text-red-300"}`}>{error}</p>
                {productos.length === 0 && (
                  <p className="mt-1 text-xs text-red-700/90 dark:text-red-300/80">
                    No pudimos conectar con el catálogo de productos. Usa el filtro «Manual» si ya cargaste productos propios, o contacta a soporte.
                  </p>
                )}
              </div>
            )}

            <div className="pt-1">
              <ComponentCard compact title="Resultados" desc={(hasFiltro || autoCatalog) && total > 0 ? `${total.toLocaleString("es-MX")} artículo${total === 1 ? "" : "s"} encontrados${paginas > 1 ? ` · página ${pagina} de ${paginas}` : ""}.` : "Los resultados aparecen aquí según tu búsqueda y filtros."} className="!overflow-visible border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.22)] dark:border-[#273244] dark:bg-[#111827]/80 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.5)]"
                actions={
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 rounded-xl border border-[#e7ded0] bg-[#fcfaf6] p-0.5 dark:border-[#334155] dark:bg-[#0f172a]/80">
                      <button type="button" onClick={() => setViewMode("table")} title="Vista tabla" disabled={loading} className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition ${viewMode === "table" ? "bg-white text-[#ea580c] shadow-sm dark:bg-[#111a2b] dark:text-[#fb923c]" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></svg>
                      </button>
                      <button type="button" onClick={() => setViewMode("cards")} title="Vista tarjetas" disabled={loading} className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition ${viewMode === "cards" ? "bg-white text-[#ea580c] shadow-sm dark:bg-[#111a2b] dark:text-[#fb923c]" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                      </button>
                    </div>
                    <div className="relative" ref={filterRef}>
                      <button type="button" onClick={() => setFilterOpen((v) => !v)} className={`${claudeSecondaryBtn} h-9`}>
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h13" /><path d="M3 12h10" /><path d="M3 17h7" /><path d="M18 7v10" /><path d="M21 10l-3-3-3 3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Filtrado
                      </button>
                      {filterOpen && (
                        <div className="absolute right-0 z-[120] mt-2 w-80 max-h-[min(80vh,24rem)] overflow-auto rounded-xl border border-[#e7ded0] bg-[#fffdfa] p-4 shadow-xl ring-1 ring-black/5 dark:border-[#334155] dark:bg-[#111a2b] dark:ring-white/10">
                          <div className="mb-4">
                            <label htmlFor="orden-select" className="mb-2 block text-xs font-medium text-[#57534e] dark:text-[#cbd5e1]">Ordenar por</label>
                            <select id="orden-select" value={orden} onChange={(e) => { setOrden(e.target.value as NonNullable<SyscomSearchParams["orden"]>); setAutoCatalog(false); resetPage(); }} className={`${claudeSelect} h-10`}>
                              {ORDEN_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                            </select>
                          </div>
                          <div className="mb-4">
                            <label className="mb-2 block text-xs font-medium text-[#57534e] dark:text-[#cbd5e1]">Fuente de datos</label>
                            <div className="inline-flex w-full rounded-lg border border-[#e7ded0] bg-[#fcfaf6] p-1 dark:border-[#334155] dark:bg-[#0f172a]/80">
                              {[{ value: "", label: "Todas" }, { value: "syscom", label: "Syscom" }, { value: "manual", label: "Manual" }].map((option) => {
                                const active = fuente === option.value;
                                return (<button key={option.label} type="button" onClick={() => { setFuente(option.value as "" | IntraxFuente); setAutoCatalog(false); resetPage(); }} className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-all ${active ? "bg-white text-[#ea580c] shadow-sm dark:bg-[#111a2b] dark:text-[#fb923c]" : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"}`}>{option.label}</button>);
                              })}
                            </div>
                          </div>
                          <div className="mb-4">
                            <label htmlFor="categoria-select" className="mb-2 block text-xs font-medium text-[#57534e] dark:text-[#cbd5e1]">Categoría</label>
                            <select id="categoria-select" value={categoriaId} onChange={(e) => { setCategoriaId(e.target.value); setAutoCatalog(false); resetPage(); }} className={`${claudeSelect} h-10`}>
                              <option value="">Todas las categorías</option>
                              {categorias.map((c) => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                              {loadingCatalogos && !categorias.length && <option disabled>Cargando categorías...</option>}
                            </select>
                          </div>
                          <div className="mb-4">
                            <label htmlFor="marca-select" className="mb-2 block text-xs font-medium text-[#57534e] dark:text-[#cbd5e1]">Marca</label>
                            <select id="marca-select" value={marcaId} onChange={(e) => { setMarcaId(e.target.value); setAutoCatalog(false); resetPage(); }} className={`${claudeSelect} h-10`}>
                              <option value="">Todas las marcas</option>
                              {marcas.slice(0, MARCAS_SELECT_LIMIT).map((m) => (<option key={m.id} value={m.id}>{m.nombre}</option>))}
                              {loadingCatalogos && !marcas.length && <option disabled>Cargando marcas...</option>}
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => { clearFiltros(); setFilterOpen(false); }} className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-[#e2d9ca] bg-white px-3 text-xs font-semibold text-[#44403c] transition-colors hover:bg-[#fafaf9] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#e5e7eb] dark:hover:bg-white/[0.05]">Limpiar filtros</button>
                            <button type="button" onClick={() => setFilterOpen(false)} className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-[#ff801f] px-3 text-xs font-semibold text-black transition-colors hover:bg-[#ff6a00]">Aplicar</button>
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
                        <div key={p.producto_id} role="button" tabIndex={0} onClick={() => openDetailModal(p.producto_id)} onKeyDown={(e) => e.key === "Enter" && openDetailModal(p.producto_id)} className="flex cursor-pointer gap-3 rounded-xl border border-[#e7ded0] bg-[#fffdfa] p-3 transition hover:border-[#d6d3d1] dark:border-[#334155] dark:bg-[#111a2b] dark:hover:border-[#475569]/80">
                          <div className="w-16 h-16 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center overflow-hidden">
                            {getProductoImageUrl(p.img_portada) ? (<img src={getProductoImageUrl(p.img_portada)!} alt={p.titulo} className="w-full h-full object-contain" loading="lazy" />) : (<span className="text-[10px] text-gray-400">—</span>)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{p.titulo}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.marca} · {p.modelo}{p.fuente ? ` · ${p.fuente}` : ""}</p>
                            <p className="mt-1 text-sm font-semibold text-[#ff801f] dark:text-[#ffa057] tabular-nums">{formatPrecioPublicoMxnConIva(p, tipoCambio)}</p>
                            {p.total_existencia != null && <p className="text-[11px] text-gray-500 dark:text-gray-400">Stock {p.total_existencia}</p>}
                            <a href={getProductoLink(p)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[11px] font-medium text-[#ff801f] dark:text-[#ffa057] mt-1 inline-block hover:underline">Ver más →</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : viewMode === "cards" ? (
                    <div className="rounded-xl border border-[#e7ded0] bg-[#fffdfa]/90 py-14 text-center dark:border-[#334155] dark:bg-[#111a2b]/80">
                      {loading && <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><svg className="h-4.5 w-4.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" /></svg>Cargando productos...</div>}
                      {!loading && productos.length === 0 && !error && (
                        <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
                          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#ff801f]/12 text-[#ea580c] dark:bg-[#fb923c]/12 dark:text-[#fb923c]"><svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{autoCatalog ? "No hay productos para mostrar." : "No encontramos coincidencias."}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{autoCatalog ? "Ajusta filtros o intenta otra búsqueda." : "Prueba con otra palabra clave o limpia filtros."}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-[#e7ded0]/90 bg-[#fcfaf6]/60 dark:border-[#273244] dark:bg-[#0f172a]/35">
                      <Table className="w-full min-w-[720px] sm:min-w-0 xl:min-w-full">
                        <TableHeader className="sticky top-0 z-10 border-b border-[#e7ded0] bg-[#fffdfa]/95 text-[11px] font-semibold text-[#1c1917] dark:border-[#334155] dark:bg-[#111827]/95 dark:text-[#f8fafc]">
                          <TableRow>
                            <TableCell isHeader className="px-3 py-2 text-left w-[64px] text-gray-700 dark:text-gray-300">Imagen</TableCell>
                            <TableCell isHeader className="px-3 py-2 text-left min-w-[200px] text-gray-700 dark:text-gray-300">Producto</TableCell>
                            <TableCell isHeader className="px-3 py-2 text-left w-[100px] text-gray-700 dark:text-gray-300">Marca</TableCell>
                            <TableCell isHeader className="px-3 py-2 text-left w-[120px] text-gray-700 dark:text-gray-300">Modelo</TableCell>
                            <TableCell isHeader className="px-3 py-2 text-left w-[90px] text-gray-700 dark:text-gray-300">Fuente</TableCell>
                            <TableCell isHeader className="px-3 py-2 text-left w-[120px] text-gray-700 dark:text-gray-300">Precio</TableCell>
                            <TableCell isHeader className="px-3 py-2 text-left w-[80px] text-gray-700 dark:text-gray-300">Stock</TableCell>
                            <TableCell isHeader className="px-3 py-2 text-center w-[100px] text-gray-700 dark:text-gray-300">Acción</TableCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-[#f5f5f4] text-[12px] text-[#44403c] dark:divide-[#334155]/80 dark:text-[#e5e7eb]">
                          {loading && (<TableRow><TableCell colSpan={8} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400"><div className="inline-flex items-center gap-2 text-sm"><svg className="h-4.5 w-4.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" /></svg>Cargando productos...</div></TableCell></TableRow>)}
                          {!loading && productos.length === 0 && !error && (<TableRow><TableCell colSpan={8} className="px-3 py-10 text-center text-sm text-gray-500 dark:text-gray-400">{autoCatalog ? "No hay productos para mostrar." : "No encontramos resultados con los filtros actuales."}</TableCell></TableRow>)}
                          {!loading && productos.length > 0 && productos.map((p) => {
                            const imgUrl = getProductoImageUrl(p.img_portada); const link = getProductoLink(p);
                            return (
                              <TableRow key={p.producto_id} className="hover:bg-[#fff7ed]/80 dark:hover:bg-[#1e293b]/50">
                                <TableCell className="px-3 py-2 w-[64px] align-middle"><div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center overflow-hidden shrink-0">{imgUrl ? (<img src={imgUrl} alt={p.titulo} className="w-full h-full object-contain" loading="lazy" />) : (<span className="text-[10px] text-gray-400">—</span>)}</div></TableCell>
                                <TableCell className="px-3 py-2 min-w-[200px] max-w-[280px]"><button type="button" onClick={() => openDetailModal(p.producto_id)} className="block w-full text-left truncate text-gray-900 dark:text-white hover:text-[#ff801f] dark:hover:text-[#ffa057] hover:underline font-medium" title={p.titulo}>{p.titulo}</button></TableCell>
                                <TableCell className="px-3 py-2 w-[100px] whitespace-nowrap">{p.marca}</TableCell>
                                <TableCell className="px-3 py-2 w-[120px] whitespace-nowrap">{p.modelo}</TableCell>
                                <TableCell className="px-3 py-2 w-[90px] whitespace-nowrap capitalize">{p.fuente || "—"}</TableCell>
                                <TableCell className="px-3 py-2 w-[120px] whitespace-nowrap font-medium text-[#ff801f] dark:text-[#ffa057] tabular-nums">{formatPrecioPublicoMxnConIva(p, tipoCambio)}</TableCell>
                                <TableCell className="px-3 py-2 w-[80px] whitespace-nowrap">{p.total_existencia ?? "—"}</TableCell>
                                <TableCell className="px-3 py-2 text-center w-[100px]">
                                  {p.fuente === "manual" ? (
                                    <div className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-white/10 px-1.5 py-1">
                                      <button type="button" onClick={() => openEditManual(p.producto_id)} className="group inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white transition hover:border-[#ff801f]/50 hover:text-[#ff801f] dark:border-white/10 dark:bg-[#111a2b] dark:hover:border-[#ff801f]/50 dark:hover:text-[#ffa057]" title="Editar"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></svg></button>
                                      <button type="button" onClick={() => setManualDeleteId(p.producto_id)} className="group inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white transition hover:border-red-400 hover:text-red-600 dark:border-white/10 dark:bg-gray-800 dark:hover:border-red-500" title="Eliminar"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m6 6 1 14h10l1-14" /></svg></button>
                                    </div>
                                  ) : (<a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-[#ff801f] dark:text-[#ffa057] hover:underline">Ver más</a>)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {!loading && total > 0 && productos.length > 0 && (
                    <div className="border-t border-gray-100 px-4 py-3 dark:border-white/[0.06] sm:px-5 sm:py-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-gray-600 dark:text-gray-400">{total} resultado(s){paginas > 1 && (<> · Página <span className="font-medium text-gray-900 dark:text-white">{pagina}</span> de <span className="font-medium text-gray-900 dark:text-white">{paginas}</span></>)}</p>
                        {paginas > 1 && (
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setPagina((prev) => Math.max(1, prev - 1))} disabled={pagina <= 1} className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg></button>
                            <button type="button" onClick={() => setPagina((prev) => Math.min(paginas, prev + 1))} disabled={pagina >= paginas} className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg></button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </ComponentCard>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={detailModalOpen} onClose={closeDetailModal} ariaLabel="Detalle de producto" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-[#e7ded0] bg-[#fffdfa] shadow-xl dark:border-[#273244] dark:bg-[#111a2b] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)] sm:rounded-2xl">
        <header className="relative shrink-0 border-b border-[#e7ded0] bg-[#fcfaf6] px-5 py-4 pr-14 dark:border-[#334155] dark:bg-[#111827]">
          <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#ff801f]" aria-hidden />
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ff801f] text-black"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
            <div className="min-w-0"><p className={claudeLabel}>Catálogo · Productos</p><h3 className={`mt-1 ${claudeSubheading}`}>Detalle de producto</h3></div>
          </div>
        </header>
        {loadingDetail && (<div className="px-6 py-16 text-center"><div className="inline-flex h-12 w-12 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700 border-t-[#ff801f] dark:border-t-[#ffa057]" aria-hidden /><p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Cargando detalle...</p></div>)}
        {!loadingDetail && detailProduct && (() => {
          const imageUrls = getProductoImagenesUrls(detailProduct); const mainImage = imageUrls[selectedImageIndex] ?? imageUrls[0];
          const precioDisplay = formatPrecioPublicoMxnConIva(detailProduct, tipoCambio);
          return (
            <div className="p-6 space-y-6">
              {imageUrls.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"><svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>Galería</div>
                  <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 overflow-hidden"><div className="aspect-square max-h-80 w-full flex items-center justify-center p-4"><img src={mainImage} alt={detailProduct.titulo} className="max-h-full w-full object-contain" /></div>
                    {imageUrls.length > 1 && (<div className="flex gap-2 p-3 border-t border-gray-100 dark:border-gray-700 overflow-x-auto">{imageUrls.map((url, i) => (<button key={i} type="button" onClick={() => setSelectedImageIndex(i)} className={`shrink-0 w-14 h-14 rounded-lg border-2 overflow-hidden flex items-center justify-center transition ${i === selectedImageIndex ? "border-[#ff801f] dark:border-[#ffa057] ring-2 ring-[#ff801f]/25 dark:ring-[#ff801f]/25" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}`}><img src={url} alt={`${detailProduct.titulo} — imagen ${i + 1}`} className="w-full h-full object-contain" /></button>))}</div>)}
                  </div>
                </div>
              )}
              <div className="flex gap-4">
                {imageUrls.length === 0 && (<div className="w-20 h-20 shrink-0 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 flex items-center justify-center"><svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>)}
                <div className="min-w-0 flex-1"><h3 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white leading-snug">{detailProduct.titulo}</h3>
                  <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1"><span className="inline-flex items-center gap-1.5 text-lg font-semibold tabular-nums text-[#ff801f] dark:text-[#ffa057]"><svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{precioDisplay}</span></div>
                  <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div><span className="text-xs text-gray-500 dark:text-gray-400">Marca</span><p className="mt-0.5 font-medium text-gray-900 dark:text-white">{detailProduct.marca || "—"}</p></div>
                    <div><span className="text-xs text-gray-500 dark:text-gray-400">Modelo / SKU</span><p className="mt-0.5 font-mono font-medium text-gray-900 dark:text-white">{detailProduct.modelo || detailProduct.sku || "—"}</p></div>
                    <div><span className="text-xs text-gray-500 dark:text-gray-400">Stock</span><p className="mt-0.5 font-medium text-gray-900 dark:text-white">{detailProduct.total_existencia !== null && detailProduct.total_existencia !== undefined ? detailProduct.total_existencia : "—"}</p></div>
                    <div><span className="text-xs text-gray-500 dark:text-gray-400">Fuente</span><p className="mt-0.5 font-medium text-gray-900 dark:text-white capitalize">{detailProduct.fuente || "syscom"}</p></div>
                  </div>
                </div>
              </div>
              {detailProduct.caracteristicas && detailProduct.caracteristicas.length > 0 && (
                <div className="space-y-2"><h4 className="text-sm font-semibold text-gray-900 dark:text-white">Características</h4><ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">{detailProduct.caracteristicas.map((c, i) => (<li key={i}>{c}</li>))}</ul></div>
              )}
            </div>
          );
        })()}
      </Modal>

      <Modal isOpen={manualModalOpen} onClose={() => setManualModalOpen(false)} closeOnBackdropClick={false} ariaLabel="Formulario de producto manual" className="flex max-h-[min(92vh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-[#e7ded0] bg-[#fffdfa] p-0 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.12)] dark:border-[#273244] dark:bg-[#111a2b] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)] sm:w-[min(96vw,42rem)] sm:rounded-2xl">
        <header className="relative shrink-0 border-b border-[#e7ded0] bg-[#fcfaf6] px-6 py-5 pr-14 dark:border-[#334155] dark:bg-[#111827] sm:pr-16">
          <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#ff801f]" aria-hidden />
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff801f] text-black shadow-sm">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 7a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" strokeLinejoin="round" />
                <path d="M12 10v6M9 13h6" strokeLinecap="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className={claudeLabel}>Catálogo · Productos</p>
              <h3 className="mt-1 [font-family:Georgia,'Times_New_Roman',serif] text-[clamp(1.4rem,2vw,2rem)] font-medium leading-[1.2] text-gray-900 dark:text-white">{editingManualId ? "Editar producto manual" : "Nuevo producto manual"}</h3>
            </div>
          </div>
        </header>

        <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-[#fffdfa] px-5 py-5 pb-6 dark:bg-[#111a2b] sm:px-6">
          {manualFormError && (
            <div className="rounded-xl border border-red-200/80 bg-red-50/90 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              {manualFormError}
            </div>
          )}

          <section className="rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-4 dark:border-[#334155] dark:bg-[#0f172a]/90 sm:p-5">
            <div className="mb-3 border-b border-[#e7ded0]/80 pb-3 dark:border-white/[0.06]">
              <h4 className="text-sm font-semibold text-[#1c1917] dark:text-[#f1f5f9]">Datos del producto</h4>
            </div>

            <div className="space-y-4">
              <div>
                <label className={claudeFieldLabel}>Producto *</label>
                <input value={manualForm.producto} onChange={(e) => setManualForm((p) => ({ ...p, producto: e.target.value }))} placeholder="Nombre del producto" className={claudeInput} />
              </div>
              <div>
                <label className={claudeFieldLabel}>Características</label>
                <textarea value={manualForm.caracteristicas} onChange={(e) => setManualForm((p) => ({ ...p, caracteristicas: e.target.value }))} placeholder="Escribe una característica por línea" rows={4} className="min-h-[110px] w-full rounded-xl border border-[#e2d9ca] bg-[#fffdfa] px-3 py-2 text-sm text-[#1c1917] outline-none transition-colors placeholder:text-[#78716c] focus:border-[#ff801f] focus:ring-2 focus:ring-[#ff801f]/20 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:placeholder:text-[#8ea0b8] dark:focus:border-[#fb923c] dark:focus:ring-[#fb923c]/20" />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={claudeFieldLabel}>Marca *</label>
                  <input value={manualForm.marca} onChange={(e) => setManualForm((p) => ({ ...p, marca: e.target.value }))} placeholder="Marca" className={claudeInput} />
                </div>
                <div>
                  <label className={claudeFieldLabel}>Modelo *</label>
                  <input value={manualForm.modelo} onChange={(e) => setManualForm((p) => ({ ...p, modelo: e.target.value }))} placeholder="Modelo" className={claudeInput} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={claudeFieldLabel}>Precio *</label>
                  <input type="number" min="0" step="0.01" value={manualForm.precio} onChange={(e) => setManualForm((p) => ({ ...p, precio: e.target.value }))} placeholder="0.00" className={claudeInput} />
                </div>
                <div>
                  <label className={claudeFieldLabel}>Stock *</label>
                  <input type="number" min="0" step="1" value={manualForm.stock} onChange={(e) => setManualForm((p) => ({ ...p, stock: e.target.value }))} placeholder="0" className={claudeInput} />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-4 dark:border-[#334155] dark:bg-[#0f172a]/90 sm:p-5">
            <div className="mb-3 border-b border-[#e7ded0]/80 pb-3 dark:border-white/[0.06]">
              <h4 className="text-sm font-semibold text-[#1c1917] dark:text-[#f1f5f9]">Imagen</h4>
            </div>
            {manualForm.imagen_url ? (
              <div className="space-y-2">
                <div className="relative w-full max-w-[280px] overflow-hidden rounded-lg border border-gray-200/80 bg-gray-50 dark:border-white/[0.08] dark:bg-gray-800/40">
                  <img src={resolveMediaUrl(manualForm.imagen_url)} alt="Producto" className="h-40 w-full object-contain p-2" />
                </div>
                <button type="button" onClick={() => setManualForm((prev) => ({ ...prev, imagen_url: "" }))} className="inline-flex h-9 items-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-white/[0.08] dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.05]">Quitar imagen</button>
              </div>
            ) : (
              <div {...getManualImageRootProps()} className={`dropzone cursor-pointer rounded-lg border border-dashed p-4 sm:p-5 transition-all ${isManualImageDragActive ? "border-[#ff801f] bg-gray-100 dark:bg-[#111a2b]" : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-[#111a2b]"}`}>
                <input {...getManualImageInputProps()} />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{isManualImageDragActive ? "Suelta aquí para subir" : "Haz clic o arrastra imagen (máx. 1)"}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Formatos: PNG, JPG, WebP o SVG</p>
                </div>
              </div>
            )}
            {manualImageUploading && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" /></svg>
                Subiendo...
              </div>
            )}
          </section>
        </div>

        <div className="shrink-0 border-t border-[#e7ded0] bg-[#fcfaf6] px-5 py-4 dark:border-[#334155] dark:bg-[#0f172a]/80 sm:px-6">
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setManualModalOpen(false)} className="inline-flex h-10 items-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-[#111a2b] dark:text-gray-300 dark:hover:bg-white/[0.05]">Cancelar</button>
            <button type="button" onClick={saveManualProduct} className="inline-flex h-10 items-center rounded-lg bg-[#ff801f] px-4 text-sm font-semibold text-black transition-colors hover:bg-[#ff6a00]">{editingManualId ? "Guardar" : "Agregar"}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!manualDeleteId} onClose={() => setManualDeleteId(null)} closeOnBackdropClick={false} ariaLabel="Confirmar eliminación de producto manual" className="w-full max-w-sm overflow-hidden rounded-t-3xl border border-[#e7ded0] bg-[#fffdfa] dark:border-[#273244] dark:bg-[#111a2b] sm:rounded-xl">
        <div className="p-5">
          <div className="mb-4 flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ff801f]/10 text-[#ff801f] dark:text-[#ffa057]">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M3 6h18" strokeLinecap="round" />
                <path d="M8 6V4h8v2" strokeLinecap="round" />
                <path d="M6 6l1 16h10l1-16" strokeLinejoin="round" />
                <path d="M10 11v6M14 11v6" strokeLinecap="round" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <h3 className={claudeSubheading}>Eliminar producto manual</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Esta acción no se puede deshacer.</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setManualDeleteId(null)} className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]">Cancelar</button>
            <button type="button" onClick={confirmDeleteManual} className="inline-flex h-9 items-center justify-center rounded-lg bg-[#ff801f] px-4 text-sm font-medium text-black transition-colors hover:bg-[#ff6a00] active:brightness-95">Eliminar</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
