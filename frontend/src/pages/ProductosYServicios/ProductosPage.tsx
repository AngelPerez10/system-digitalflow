import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useDropzone } from "react-dropzone";

import PageMeta from "@/components/common/PageMeta";
import {
  Boxes,
  CircleAlert,
  DollarSign,
  LayoutGrid,
  List,
  Loader2,
  PackageSearch,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Alert, { type AlertVariant } from "@/components/ui/alert/Alert";
import { AppConfirmDialog, AppModalContext } from "@/components/ui/modal-kit/ModalKit";
import "@/components/ui/modal-kit/motion.css";
import {
  buildProductosQuery,
  SYSCOM_BUSQUEDA_AMPLIA,
  fetchSyscomTipoCambio,
  formatPrecioPublicoMxnConIva,
  fetchSyscomProductoDetalle,
  fetchSyscomProductosSugerencia,
  fetchIntraxProductos,
  isCatalogAuthReady,
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
import { fetchApi } from "@/config/api";
import { btn, cardShell, fontSans, heroHeading, input, sansStyle } from "./productos/productosStyles";
import { EmptyState, Pagination, ProductCard, ProductCardSkeleton, ProductosTable } from "./productos/ProductosViews";
import ProductosFiltroPanel from "./productos/ProductosFiltroPanel";
import { filtrarEnPantalla, filtrosPantallaActivos, precioTexto } from "./productos/productosFiltros";
import ProductoDetalleModal from "./productos/ProductoDetalleModal";
import ProductoManualModal from "./productos/ProductoManualModal";
import { useAuth } from "@/context/AuthContext";

const ORDEN_OPTIONS: { value: NonNullable<SyscomSearchParams["orden"]>; label: string }[] = [
  { value: "relevancia", label: "Relevancia" },
  { value: "precio:asc", label: "Precio ascendente" },
  { value: "precio:desc", label: "Precio descendente" },
  { value: "modelo:asc", label: "Modelo A-Z" },
  { value: "marca:asc", label: "Marca A-Z" },
  { value: "modelo:desc", label: "Modelo Z-A" },
  { value: "marca:desc", label: "Marca Z-A" },
  { value: "topseller", label: "Más vendidos" },
];

const MARCAS_SELECT_LIMIT = 200;
const VIEW_MODE_KEY = "productos:vista";

const leerVista = (): "table" | "cards" => {
  try {
    return window.localStorage.getItem(VIEW_MODE_KEY) === "table" ? "table" : "cards";
  } catch {
    return "cards";
  }
};
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
  soloExistencia = false,
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
    ...(soloExistencia ? { stock: "1" as const } : {}),
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
  /** Solo productos con existencia (SYSCOM lo filtra en el servidor; el resto, en pantalla). */
  const [soloExistencia, setSoloExistencia] = useState(false);
  /** Rango de precio público (MXN con IVA); se aplica a los resultados cargados. */
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");

  const [categorias, setCategorias] = useState<SyscomCategoria[]>([]);
  const [marcas, setMarcas] = useState<SyscomMarca[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [tipoCambio, setTipoCambio] = useState<number | null>(null);

  const [viewMode, setViewMode] = useState<"table" | "cards">(leerVista);
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
  // El diálogo de confirmación lleva su propio «eliminando…»; aquí solo evita dobles envíos.
  const [, setDeletingManual] = useState(false);
  const [toast, setToast] = useState<{ variant: AlertVariant; title: string; message?: string } | null>(null);

  const detailModalTitleId = useId();
  const manualModalTitleId = useId();

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
            const firstCatalog = await fetchGlobalCatalogPage(q, 1, categoriaId, marcaId, orden, soloExistencia);
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

        const firstCatalog = await fetchGlobalCatalogPage(q, 1, categoriaId, marcaId, orden, soloExistencia);
        if (isStale()) return;

        const catalogTotalEstimate = firstCatalog.syscomTotal + firstCatalog.intraxTotal + firstCatalog.tvcTotal;
        const maxCatalogPages = Math.max(firstCatalog.syscomPages, firstCatalog.intraxPages, firstCatalog.tvcPages);
        const catalogNeededEnd = Math.max(0, globalStart + GLOBAL_SEARCH_PAGE_SIZE - manualCount);
        const endCatalogPage = Math.max(1, Math.floor((catalogNeededEnd - 1) / GLOBAL_SEARCH_PAGE_SIZE) + 1);

        const catalogChunks: SyscomProducto[] = [...firstCatalog.rows];
        for (let p = 2; p <= Math.min(endCatalogPage, maxCatalogPages); p++) {
          const chunk = await fetchGlobalCatalogPage(q, p, categoriaId, marcaId, orden, soloExistencia);
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
      const query = buildProductosQuery(isAuto ? { busqueda: AUTO_DEFAULT_SEARCH, pagina, orden: "topseller", stock: "1" } : { busqueda: busqueda.trim() || undefined, categoria: categoriaId || undefined, marca: marcaId || undefined, pagina, orden, ...SYSCOM_BUSQUEDA_AMPLIA, ...(soloExistencia ? { stock: "1" as const } : {}) });
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
  }, [busqueda, categoriaId, marcaId, orden, pagina, hasFiltro, autoCatalog, fuente, manualProducts, catalogReady, soloExistencia]);

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
    setSoloExistencia(false);
    setPrecioMin("");
    setPrecioMax("");
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

  const fuenteOpciones: { value: CatalogFuente; label: string }[] = [
    { value: "", label: "Todas" },
    { value: "syscom", label: "SYSCOM" },
    { value: "tvc", label: "TVC" },
    { value: "manual", label: "Manual" },
  ];
  const filtrosPantalla = { soloExistencia, precioMin, precioMax };
  const hayFiltroPantalla = filtrosPantallaActivos(filtrosPantalla);
  const visibles = hayFiltroPantalla ? filtrarEnPantalla(productos, filtrosPantalla, tipoCambio) : productos;
  const filtrosActivos =
    (fuente ? 1 : 0) +
    (categoriaId ? 1 : 0) +
    (marcaId ? 1 : 0) +
    (orden !== "relevancia" ? 1 : 0) +
    (soloExistencia ? 1 : 0) +
    (precioMin.trim() || precioMax.trim() ? 1 : 0);
  const categoriaNombre = categorias.find((c) => String(c.id) === String(categoriaId))?.nombre;
  const marcaNombre = marcas.find((m) => String(m.id) === String(marcaId))?.nombre;
  const ordenNombre = ORDEN_OPTIONS.find((o) => o.value === orden)?.label;
  const acciones = {
    canEdit: canProductosEdit,
    canDelete: canProductosDelete,
    onEdit: openEditManual,
    onDelete: (id: string) => setManualDeleteId(id),
  };
  const precioDe = (p: SyscomProducto) => precioTexto(p, (x) => formatPrecioPublicoMxnConIva(x, tipoCambio));
  const cambiarVista = (v: "table" | "cards") => {
    setViewMode(v);
    try {
      window.localStorage.setItem(VIEW_MODE_KEY, v);
    } catch {
      /* sin almacenamiento: solo esta sesión */
    }
  };
  const resumen =
    loading && productos.length === 0
      ? "Buscando en los catálogos…"
      : total > 0
        ? `${total.toLocaleString("es-MX")} artículo${total === 1 ? "" : "s"}${paginas > 1 ? ` · página ${pagina} de ${paginas}` : ""}${
            hayFiltroPantalla ? ` · ${visibles.length} cumplen los filtros en esta página` : ""
          }`
        : autoCatalog
          ? "Catálogo destacado"
          : "Sin resultados";

  return (
    <>
      <PageMeta title="Productos | Catálogo" description="Catálogo de productos" />
      <div className="min-h-[calc(100dvh-5rem)] overflow-x-hidden">
        <div
          className="mx-auto w-full max-w-[min(100%,1920px)] space-y-6 px-3 pb-10 pt-6 text-sm sm:space-y-7 sm:px-5 sm:pb-12 sm:pt-7 sm:text-base md:px-6 lg:px-8 xl:px-10 2xl:max-w-[min(100%,2200px)]"
          style={sansStyle}
        >
          <nav className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]" aria-label="Migas de pan">
            <Link to="/" className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-black/[0.04] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC]">
              Inicio
            </Link>
            <span className="text-[#D3D3D8] dark:text-[#3D3D4A]" aria-hidden>/</span>
            <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]" aria-current="page">Productos</span>
          </nav>

          {!canProductosView ? (
            <div className={`${cardShell} px-4 py-10 text-center text-[15px] text-[#6E6E77] dark:text-[#8EA0B8]`}>No tienes permiso para ver Productos.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Banda marina */}
              <header className="cot-rise relative overflow-hidden rounded-[24px] bg-[#17235B] px-5 py-6 dark:bg-[#1B2A63] sm:px-8 sm:py-8">
                <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#E6A23C]/15 blur-3xl" aria-hidden />
                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
                  <div className="flex min-w-0 items-start gap-4">
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]">
                      <Boxes className="size-5" strokeWidth={1.6} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">Productos y servicios</p>
                      <h1 className={`mt-1 ${heroHeading}`}>Productos</h1>
                      <p className="mt-1.5 max-w-[60ch] text-[15px] leading-[22px] tracking-[-0.1px] text-white/70">
                        Consulta precios con IVA, existencias y fichas técnicas de SYSCOM, TVC y tu catálogo propio.
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {tipoCambio ? (
                      <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-[13px] font-medium text-white/85">
                        <DollarSign className="size-3.5 text-[#4ADE80]" aria-hidden />
                        Tipo de cambio <b className="font-semibold tabular-nums">${tipoCambio.toFixed(2)}</b>
                      </span>
                    ) : null}
                    {manualProducts.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => { setFuente("manual"); setAutoCatalog(false); resetPage(); }}
                        className="cot-press inline-flex h-9 items-center gap-1.5 rounded-full bg-[rgba(230,162,60,0.16)] px-3.5 text-[13px] font-semibold text-[#E6A23C] hover:bg-[rgba(230,162,60,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                      >
                        {manualProducts.length} manual{manualProducts.length === 1 ? "" : "es"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </header>

              {/* Búsqueda + acción principal */}
              <form onSubmit={handleSearch} className="cot-rise grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:gap-4" style={{ "--cot-i": 1 } as CSSProperties}>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-[#A1A1AA] dark:text-[#64748b]" aria-hidden />
                  <input
                    id="search-input"
                    type="search"
                    value={busquedaInput}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    placeholder="Buscar por producto, marca o modelo…"
                    aria-label="Buscar productos"
                    className={`${input} pl-11 pr-11 [&::-webkit-search-cancel-button]:hidden`}
                  />
                  {busquedaInput ? (
                    <button
                      type="button"
                      onClick={() => handleSearchInputChange("")}
                      aria-label="Limpiar búsqueda"
                      className="cot-pop absolute inset-y-0 right-1 my-1 inline-flex w-10 items-center justify-center rounded-lg text-[#6E6E77] transition-colors hover:bg-[#F4F4F5] hover:text-[#09090B] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC]"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  ) : null}
                </div>
                {canProductosCreate ? (
                  <button type="button" onClick={() => openCreateManual()} className={`${btn.primary} w-full px-6 sm:w-auto`}>
                    <Plus aria-hidden />
                    Nuevo producto
                  </button>
                ) : null}
              </form>

              {error ? (
                <div
                  role="alert"
                  className={`cot-fade flex items-start gap-3 rounded-[14px] border px-4 py-3 ${
                    productos.length > 0
                      ? "border-[rgba(230,162,60,0.4)] bg-[rgba(230,162,60,0.10)] text-[#8A5D0F] dark:text-[#E6A23C]"
                      : "border-[#F6CFCF] bg-[#FEF2F2] text-[#9F1F1F] dark:border-[#7F1D1D] dark:bg-[#3F1518] dark:text-[#FCA5A5]"
                  }`}
                >
                  <CircleAlert className="mt-0.5 size-[18px] shrink-0" aria-hidden />
                  <div className="min-w-0 text-[14px] leading-[20px]">
                    <p className="font-semibold">{productos.length > 0 ? "Catálogo con incidencias" : "No se pudo cargar el catálogo"}</p>
                    <p className="mt-0.5 text-[13px] opacity-90">
                      {productos.length > 0 ? error : `${error} Usa la fuente «Manual» si ya cargaste productos propios, o contacta a soporte.`}
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Resultados */}
              <section className={`${cardShell} cot-rise`} style={{ "--cot-i": 2 } as CSSProperties} aria-labelledby="productos-resultados">
                <div className="flex flex-col gap-3 border-b border-[#F0F0F2] px-4 py-4 dark:border-[#1F2A3C] sm:flex-row sm:items-start sm:justify-between sm:px-6">
                  <div className="min-w-0">
                    <h2 id="productos-resultados" className="flex items-center gap-2 text-[16px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">
                      {autoCatalog && !hasFiltro ? "Destacados" : "Resultados"}
                      {loading && productos.length > 0 ? <Loader2 className="size-3.5 animate-spin text-[#A1A1AA]" aria-label="Actualizando" /> : null}
                    </h2>
                    <p className="mt-0.5 text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]" aria-live="polite">{resumen}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2" ref={filterRef}>
                    <ProductosFiltroPanel
                      open={filterOpen}
                      onOpenChange={setFilterOpen}
                      activos={filtrosActivos}
                      fuente={fuente}
                      fuentes={fuenteOpciones}
                      onFuente={(v) => { setFuente(v); setAutoCatalog(false); resetPage(); }}
                      soloExistencia={soloExistencia}
                      onSoloExistencia={(v) => { setSoloExistencia(v); resetPage(); }}
                      precioMin={precioMin}
                      precioMax={precioMax}
                      onPrecioMin={setPrecioMin}
                      onPrecioMax={setPrecioMax}
                      orden={orden}
                      ordenes={ORDEN_OPTIONS}
                      onOrden={(v) => { setOrden(v); setAutoCatalog(false); resetPage(); }}
                      categoriaId={categoriaId}
                      categorias={categorias.map((c) => ({ id: String(c.id), nombre: c.nombre }))}
                      onCategoria={(v) => { setCategoriaId(v); setAutoCatalog(false); resetPage(); }}
                      marcaId={marcaId}
                      marcas={marcas.slice(0, MARCAS_SELECT_LIMIT).map((m) => ({ id: String(m.id), nombre: m.nombre }))}
                      onMarca={(v) => { setMarcaId(v); setAutoCatalog(false); resetPage(); }}
                      cargandoCatalogos={loadingCatalogos}
                      onLimpiar={clearFiltros}
                    />
                    <div role="radiogroup" aria-label="Vista" className="flex items-center gap-0.5 rounded-[10px] border border-[#E7E7EA] bg-[#F4F4F5] p-0.5 dark:border-[#273244] dark:bg-[#0F172A]">
                      {([
                        { v: "cards" as const, label: "Tarjetas", icon: <LayoutGrid className="size-4" aria-hidden /> },
                        { v: "table" as const, label: "Tabla", icon: <List className="size-4" aria-hidden /> },
                      ]).map((o) => (
                        <button
                          key={o.v}
                          type="button"
                          role="radio"
                          aria-checked={viewMode === o.v}
                          aria-label={`Vista ${o.label.toLowerCase()}`}
                          title={o.label}
                          onClick={() => cambiarVista(o.v)}
                          className={`inline-flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 ${
                            viewMode === o.v
                              ? "bg-white text-[#1B5CFF] shadow-[0_1px_3px_rgba(9,9,11,0.10)] dark:bg-[#1B2539] dark:text-[#7EA0FF]"
                              : "text-[#6E6E77] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:text-[#F8FAFC]"
                          }`}
                        >
                          {o.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {filtrosActivos || busqueda.trim() ? (
                  <div className="cot-fade flex flex-wrap items-center gap-2 border-b border-[#F0F0F2] px-4 py-3 dark:border-[#1F2A3C] sm:px-6" aria-label="Filtros activos">
                    {busqueda.trim() ? <Chip label={`«${busqueda.trim()}»`} onRemove={() => handleSearchInputChange("")} /> : null}
                    {fuente ? <Chip label={`Fuente: ${fuenteOpciones.find((o) => o.value === fuente)?.label}`} onRemove={() => { setFuente(""); resetPage(); }} /> : null}
                    {soloExistencia ? <Chip label="Con existencia" onRemove={() => { setSoloExistencia(false); resetPage(); }} /> : null}
                    {precioMin.trim() || precioMax.trim() ? (
                      <Chip
                        label={`Precio: ${precioMin.trim() ? `$${precioMin}` : "$0"} – ${precioMax.trim() ? `$${precioMax}` : "sin tope"}`}
                        onRemove={() => { setPrecioMin(""); setPrecioMax(""); }}
                      />
                    ) : null}
                    {categoriaId ? <Chip label={`Categoría: ${categoriaNombre ?? categoriaId}`} onRemove={() => { setCategoriaId(""); resetPage(); }} /> : null}
                    {marcaId ? <Chip label={`Marca: ${marcaNombre ?? marcaId}`} onRemove={() => { setMarcaId(""); resetPage(); }} /> : null}
                    {orden !== "relevancia" ? <Chip label={`Orden: ${ordenNombre}`} onRemove={() => { setOrden("relevancia"); resetPage(); }} /> : null}
                    <button type="button" onClick={clearFiltros} className="rounded-md px-1.5 py-1 text-[13px] font-medium text-[#1B5CFF] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:text-[#7EA0FF]">
                      Limpiar todo
                    </button>
                  </div>
                ) : null}

                <div className="p-3 sm:p-5">
                  {loading && productos.length === 0 ? (
                    viewMode === "cards" ? (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" aria-busy="true" aria-label="Cargando productos">
                        {Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} index={i} />)}
                      </div>
                    ) : (
                      <ProductosTable rows={[]} loading precioDe={precioDe} imagenDe={getCatalogProductoImageUrl} linkDe={getProductoLink} onOpen={openDetailModal} acciones={acciones} />
                    )
                  ) : productos.length > 0 && visibles.length === 0 ? (
                    <EmptyState
                      icon={<PackageSearch aria-hidden />}
                      title="Nada en esta página cumple los filtros"
                      text="La existencia y el rango de precio se aplican a los resultados cargados. Prueba la siguiente página o ajusta los filtros."
                      action={
                        <button type="button" onClick={() => { setSoloExistencia(false); setPrecioMin(""); setPrecioMax(""); }} className={btn.secondary}>
                          Quitar existencia y precio
                        </button>
                      }
                    />
                  ) : productos.length === 0 ? (
                    <EmptyState
                      icon={<PackageSearch aria-hidden />}
                      title={autoCatalog ? "No hay productos para mostrar" : "No encontramos coincidencias"}
                      text={autoCatalog ? "Busca un producto o elige una fuente." : "Prueba con otra palabra clave o limpia los filtros."}
                      action={hasFiltro ? <button type="button" onClick={clearFiltros} className={btn.secondary}>Limpiar filtros</button> : undefined}
                    />
                  ) : viewMode === "cards" ? (
                    <div className={`grid gap-4 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 ${loading ? "opacity-60" : ""}`}>
                      {visibles.map((p, i) => (
                        <ProductCard
                          key={p.producto_id}
                          p={p}
                          index={i}
                          precio={precioDe(p)}
                          imagen={getCatalogProductoImageUrl(p)}
                          link={getProductoLink(p)}
                          onOpen={openDetailModal}
                          {...acciones}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className={`transition-opacity duration-200 ${loading ? "opacity-60" : ""}`}>
                      <ProductosTable rows={visibles} loading={false} precioDe={precioDe} imagenDe={getCatalogProductoImageUrl} linkDe={getProductoLink} onOpen={openDetailModal} acciones={acciones} />
                    </div>
                  )}
                </div>

                {total > 0 && productos.length > 0 ? (
                  <div className="border-t border-[#F0F0F2] px-4 py-4 dark:border-[#1F2A3C] sm:px-6">
                    <Pagination
                      page={pagina}
                      pages={paginas}
                      total={total}
                      onPage={(n) => {
                        setPagina(Math.min(Math.max(1, n), paginas));
                        document.getElementById("productos-resultados")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    />
                  </div>
                ) : null}
              </section>
            </div>
          )}
        </div>
      </div>

      <ProductoDetalleModal
        open={detailModalOpen}
        loading={loadingDetail}
        product={detailProduct}
        tipoCambio={tipoCambio}
        selectedImageIndex={selectedImageIndex}
        onSelectImage={setSelectedImageIndex}
        onClose={closeDetailModal}
        titleId={detailModalTitleId}
      />

      <ProductoManualModal
        open={manualModalOpen}
        editing={Boolean(editingManualId)}
        titleId={manualModalTitleId}
        form={manualForm}
        setForm={setManualForm}
        error={manualFormError}
        clearError={() => setManualFormError("")}
        saving={savingManual}
        uploading={manualImageUploading}
        dropzone={{
          getRootProps: getManualImageRootProps,
          getInputProps: getManualImageInputProps,
          isDragActive: isManualImageDragActive,
        }}
        onClose={() => setManualModalOpen(false)}
        onSave={saveManualProduct}
      />

      <AppConfirmDialog
        className={fontSans}
        open={!!manualDeleteId}
        onClose={() => setManualDeleteId(null)}
        onConfirm={confirmDeleteManual}
        tone="danger"
        icon={<Trash2 className="size-5" />}
        title="Eliminar producto manual"
        description="Se quitará del catálogo manual. Esta acción no se puede deshacer."
        detail={
          manualDeleteId ? (
            <AppModalContext
              rows={[
                { label: "Producto", value: manualProducts.find((x) => x.id === manualDeleteId)?.producto || "—", strong: true },
                { label: "Modelo", value: manualProducts.find((x) => x.id === manualDeleteId)?.modelo || "—" },
              ]}
            />
          ) : null
        }
        confirmLabel="Eliminar"
        busyLabel="Eliminando…"
      />

      {toast ? (
        <Alert key={`${toast.title}-${toast.message ?? ""}`} variant={toast.variant} title={toast.title} message={toast.message ?? ""} onClose={() => setToast(null)} />
      ) : null}
    </>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="cot-pop inline-flex max-w-full items-center gap-1 rounded-full border border-[rgba(27,92,255,0.28)] bg-[rgba(27,92,255,0.07)] py-1 pl-3 pr-1 text-[13px] font-medium text-[#1B5CFF] dark:border-[#4B7CFF]/35 dark:bg-[rgba(75,124,255,0.14)] dark:text-[#9BB6FF]">
      <span className="truncate">{label}</span>
      <button type="button" onClick={onRemove} aria-label={`Quitar filtro ${label}`} className="inline-flex size-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[rgba(27,92,255,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40">
        <X className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}
