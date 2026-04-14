import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDropzone } from "react-dropzone";

import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import {
  buildProductosQuery,
  fetchSyscomTipoCambio,
  formatPrecioPublicoMxnConIva,
  fetchSyscomProductoDetalle,
  fetchIntraxProductos,
  getAuthToken,
  getProductoImageUrl,
  getProductoImagenesUrls,
  getProductoLink,
  mapIntraxProductoToSyscom,
  type IntraxFuente,
  type SyscomCategoria,
  type SyscomMarca,
  type SyscomProducto,
  type SyscomProductoDetalle,
  type SyscomProductosResponse,
  type SyscomSearchParams,
  fetchSyscom,
} from "./syscomCatalog";
import { Modal } from "@/components/ui/modal";
import { apiUrl } from "@/config/api";

const cardShellClass =
  "overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-white/[0.06] dark:bg-gray-900/40 dark:shadow-none";

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

const inputLikeClassName =
  "w-full h-10 rounded-lg border border-gray-200/90 bg-gray-50/90 px-3 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-brand-500/80 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:bg-gray-900/60 dark:focus:border-brand-400 dark:focus:ring-brand-900/35";
const selectLikeClassName =
  "w-full h-10 rounded-lg border border-gray-200/90 bg-gray-50/90 px-3 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500/80 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-gray-200 dark:focus:bg-gray-900/60 dark:focus:border-brand-400 dark:focus:ring-brand-900/35";

type ManualProduct = {
  id: string;
  imagen_url: string;
  producto: string;
  marca: string;
  modelo: string;
  fuente: "manual";
  precio: number;
  stock: number;
};

const MANUAL_PRODUCTS_IMAGE_FOLDER = "productos/manuales";

const getPublicIdFromUrl = (url: string): string | null => {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/");
    const uploadIdx = parts.findIndex((p) => p === "upload");
    if (uploadIdx === -1) return null;
    const after = parts.slice(uploadIdx + 1);
    const startIdx = after.length && /^v\d+$/i.test(after[0]) ? 1 : 0;
    const pathParts = after.slice(startIdx);
    if (!pathParts.length) return null;
    const last = pathParts[pathParts.length - 1];
    const dot = last.lastIndexOf(".");
    pathParts[pathParts.length - 1] = dot > 0 ? last.substring(0, dot) : last;
    return pathParts.join("/");
  } catch {
    return null;
  }
};

const compressImage = async (
  file: File,
  maxSizeKB: number,
  maxWidth: number = 1400,
  maxHeight: number = 1400
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
        }
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("No se pudo procesar la imagen"));
              return;
            }
            if (blob.size / 1024 <= maxSizeKB) {
              const r = new FileReader();
              r.readAsDataURL(blob);
              r.onloadend = () => resolve(r.result as string);
              return;
            }
            // fallback simple: reduce quality once if still too big
            canvas.toBlob(
              (blob2) => {
                if (!blob2) {
                  reject(new Error("No se pudo comprimir la imagen"));
                  return;
                }
                const r2 = new FileReader();
                r2.readAsDataURL(blob2);
                r2.onloadend = () => resolve(r2.result as string);
              },
              "image/jpeg",
              0.7
            );
          },
          "image/jpeg",
          0.86
        );
      };
      img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
  });
};

const manualToSyscomProducto = (m: ManualProduct): SyscomProducto => ({
  producto_id: m.id,
  modelo: m.modelo,
  sku: m.modelo,
  total_existencia: Number.isFinite(m.stock) ? m.stock : 0,
  titulo: m.producto,
  marca: m.marca,
  fuente: "manual",
  estado: "activo",
  estado_inventario: m.stock > 0 ? "con_existencia" : "sin_existencia",
  precio_mxn: Number.isFinite(m.precio) ? m.precio : 0,
  img_portada: m.imagen_url || "",
  link: "",
  precios: {
    precio_lista: Number.isFinite(m.precio) ? m.precio : 0,
  },
});

const toMoney2 = (v: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

export default function ProductosPage() {
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

  const [manualProducts, setManualProducts] = useState<ManualProduct[]>([]);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [editingManualId, setEditingManualId] = useState<string | null>(null);
  const [manualDeleteId, setManualDeleteId] = useState<string | null>(null);
  const [manualFormError, setManualFormError] = useState("");
  const [manualImageUploading, setManualImageUploading] = useState(false);
  const [manualForm, setManualForm] = useState({
    imagen_url: "",
    producto: "",
    marca: "",
    modelo: "",
    precio: "",
    stock: "",
  });

  const fetchManualProducts = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(apiUrl("/api/productos-manuales/?page_size=500&ordering=-fecha_creacion"), {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({ results: [] }));
      if (!res.ok) return;
      const list = Array.isArray((data as any)?.results) ? (data as any).results : Array.isArray(data) ? data : [];
      const mapped: ManualProduct[] = list
        .filter((x: any) => x && typeof x === "object")
        .map((x: any): ManualProduct => ({
          id: String(x.id),
          imagen_url: String(x.imagen_url || ""),
          producto: String(x.producto || ""),
          marca: String(x.marca || ""),
          modelo: String(x.modelo || ""),
          fuente: "manual",
          precio: toMoney2(Number(x.precio || 0)),
          stock: Number.isFinite(Number(x.stock)) ? Number(x.stock) : 0,
        }))
        .filter((x: ManualProduct) => x.producto.trim());
      setManualProducts(mapped);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchManualProducts();
  }, [fetchManualProducts]);

  const deleteCloudinaryByUrl = useCallback(async (url: string) => {
    const publicId = getPublicIdFromUrl(url);
    if (!publicId) return;
    const token = getAuthToken();
    await fetch(apiUrl("/api/ordenes/delete-image/"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ public_id: publicId }),
    });
  }, []);

  const onDropManualImage = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles.find((f) => f.type.startsWith("image/"));
    if (!file) return;
    setManualFormError("");
    setManualImageUploading(true);
    try {
      const compressed = await compressImage(file, 80, 1400, 1400);
      const token = getAuthToken();
      const resp = await fetch(apiUrl("/api/ordenes/upload-image/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ data_url: compressed, folder: MANUAL_PRODUCTS_IMAGE_FOLDER }),
      });
      if (!resp.ok) {
        setManualFormError("No se pudo subir la imagen.");
        return;
      }
      const data = await resp.json().catch(() => null);
      const newUrl = data?.url ? String(data.url) : "";
      if (!newUrl) {
        setManualFormError("No se pudo subir la imagen.");
        return;
      }
      setManualForm((prev) => ({ ...prev, imagen_url: newUrl }));
    } catch (err) {
      setManualFormError(String(err));
    } finally {
      setManualImageUploading(false);
    }
  }, []);

  const { getRootProps: getManualImageRootProps, getInputProps: getManualImageInputProps, isDragActive: isManualImageDragActive } = useDropzone({
    onDrop: onDropManualImage,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".svg"] },
    maxFiles: 1,
    disabled: manualImageUploading,
    multiple: false,
  });

  const loadCatalogos = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    setLoadingCatalogos(true);
    try {
      const [tc, catRes, marRes] = await Promise.all([
        fetchSyscomTipoCambio(token).catch(() => null),
        fetchSyscom("categorias/", token),
        fetchSyscom("marcas/", token),
      ]);
      if (catRes.ok) {
        const data = await catRes.json().catch(() => []);
        setCategorias(Array.isArray(data) ? data : []);
      }
      if (marRes.ok) {
        const data = await marRes.json().catch(() => []);
        setMarcas(Array.isArray(data) ? data : []);
      }
      setTipoCambio(tc);
    } catch {
      // ignore
    } finally {
      setLoadingCatalogos(false);
    }
  }, []);

  const loadProductos = useCallback(async () => {
    if (!hasFiltro && !autoCatalog) return;
    setLoading(true);
    setError(null);
    try {
      if (fuente === "manual") {
        const q = busqueda.trim().toLowerCase();
        const filtered = manualProducts.filter((m) => {
          if (!q) return true;
          return (
            m.producto.toLowerCase().includes(q) ||
            m.marca.toLowerCase().includes(q) ||
            m.modelo.toLowerCase().includes(q)
          );
        });
        const pageSize = 50;
        const totalRows = filtered.length;
        const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
        const safePage = Math.min(Math.max(1, pagina), totalPages);
        const start = (safePage - 1) * pageSize;
        const rows = filtered.slice(start, start + pageSize).map(manualToSyscomProducto);
        setProductos(rows);
        setPaginas(totalPages);
        setTotal(totalRows);
        if (safePage !== pagina) setPagina(safePage);
        return;
      }
      if (fuente) {
        const isAuto = autoCatalog && !busqueda.trim();
        const data = await fetchIntraxProductos({
          fuente,
          buscar: isAuto ? AUTO_DEFAULT_SEARCH : (busqueda.trim() || undefined),
          pagina,
          por_pagina: 50,
        });
        const intraxProductos = (data.productos ?? []).map(mapIntraxProductoToSyscom);
        setProductos(intraxProductos);
        setPaginas(data.resumen?.total_paginas ?? 1);
        setTotal(data.resumen?.total_resultados ?? intraxProductos.length);
        return;
      }
      const token = getAuthToken();
      if (!token) {
        setError("Debe iniciar sesión para ver el catálogo.");
        setProductos([]);
        return;
      }
      const isAuto = autoCatalog && !hasFiltro;
      const query = buildProductosQuery(
        isAuto
          ? { busqueda: AUTO_DEFAULT_SEARCH, pagina, orden: "topseller", stock: "1" }
          : {
              busqueda: busqueda.trim() || undefined,
              categoria: categoriaId || undefined,
              marca: marcaId || undefined,
              pagina,
              orden,
            }
      );
      const res = await fetchSyscom(`productos/?${query}`, token);
      const data: SyscomProductosResponse = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProductos([]);
        setError((data as { detail?: string }).detail || "Error al cargar productos.");
        return;
      }
      const productosSyscomConFuente = (data.productos ?? []).map((p) => ({
        ...p,
        fuente: p.fuente || "syscom",
      }));
      setProductos(productosSyscomConFuente);
      setPaginas(data.paginas ?? 1);
      setTotal(data.cantidad ?? 0);
    } catch {
      setProductos([]);
      setError("Error de conexión con el catálogo.");
    } finally {
      setLoading(false);
    }
  }, [busqueda, categoriaId, marcaId, orden, pagina, hasFiltro, autoCatalog, fuente, manualProducts]);

  useEffect(() => {
    loadCatalogos();
  }, [loadCatalogos]);

  useEffect(() => {
    loadProductos();
  }, [loadProductos]);

  useEffect(() => {
    productosRef.current = productos;
  }, [productos]);

  useEffect(() => {
    if (!filterOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (filterRef.current?.contains(t)) return;
      setFilterOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [filterOpen]);

  useEffect(() => {
    if (!detailModalOpen || !selectedProductId) {
      setDetailProduct(null);
      return;
    }
    if (fuente) {
      const intraxProduct = productosRef.current.find((p) => p.producto_id === selectedProductId);
      setDetailProduct((intraxProduct as SyscomProductoDetalle) ?? null);
      setLoadingDetail(false);
      return;
    }
    const token = getAuthToken();
    if (!token) return;
    setLoadingDetail(true);
    setDetailProduct(null);
    fetchSyscomProductoDetalle(token, selectedProductId)
      .then((data) => {
        setDetailProduct(data ?? null);
        setSelectedImageIndex(0);
      })
      .finally(() => setLoadingDetail(false));
  }, [detailModalOpen, selectedProductId, fuente]);

  const openDetailModal = (productId: string) => {
    setSelectedProductId(productId);
    setDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedProductId(null);
    setDetailProduct(null);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = busquedaInput.trim();
    setBusqueda(q);
    setAutoCatalog(!q && !categoriaId && !marcaId && !fuente);
    setPagina(1);
  };

  const resetPage = useCallback(() => setPagina(1), []);

  const clearFiltros = () => {
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
    setEditingManualId(null);
    setManualFormError("");
    setManualForm({
      imagen_url: "",
      producto: "",
      marca: "",
      modelo: "",
      precio: "",
      stock: "",
    });
    setManualModalOpen(true);
  };

  const openEditManual = (id: string) => {
    const p = manualProducts.find((x) => x.id === id);
    if (!p) return;
    setEditingManualId(id);
    setManualFormError("");
    setManualForm({
      imagen_url: p.imagen_url || "",
      producto: p.producto || "",
      marca: p.marca || "",
      modelo: p.modelo || "",
      precio: String(p.precio ?? 0),
      stock: String(p.stock ?? 0),
    });
    setManualModalOpen(true);
  };

  const saveManualProduct = async () => {
    const producto = manualForm.producto.trim();
    const marca = manualForm.marca.trim();
    const modelo = manualForm.modelo.trim();
    const precio = Number(manualForm.precio);
    const stock = Number(manualForm.stock);
    if (!producto || !marca || !modelo) {
      setManualFormError("Producto, marca y modelo son requeridos.");
      return;
    }
    if (!Number.isFinite(precio) || precio < 0) {
      setManualFormError("Precio inválido.");
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      setManualFormError("Stock inválido.");
      return;
    }
    const token = getAuthToken();
    if (!token) {
      setManualFormError("Debes iniciar sesión para guardar productos.");
      return;
    }
    const body = {
      imagen_url: manualForm.imagen_url.trim(),
      producto,
      marca,
      modelo,
      precio: toMoney2(precio),
      stock: Math.round(stock),
      activo: true,
    };
    try {
      const isEdit = Boolean(editingManualId);
      const endpoint = isEdit
        ? apiUrl(`/api/productos-manuales/${editingManualId}/`)
        : apiUrl("/api/productos-manuales/");
      const res = await fetch(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = (data as any)?.detail;
        setManualFormError(typeof detail === "string" && detail.trim() ? detail : "No se pudo guardar el producto.");
        return;
      }
      await fetchManualProducts();
      setManualModalOpen(false);
      if (!fuente) {
        // keep current UX unchanged: don't force source change
        return;
      }
    } catch {
      setManualFormError("Error de conexión al guardar producto manual.");
    }
  };

  const confirmDeleteManual = async () => {
    if (!manualDeleteId) return;
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(apiUrl(`/api/productos-manuales/${manualDeleteId}/`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      await fetchManualProducts();
      setManualProducts((prev) => prev.filter((x) => x.id !== manualDeleteId));
      setManualDeleteId(null);
    } catch {
      // ignore
    }
  };

  return (
    <>
      <PageMeta title="Productos | Catálogo" description="Catálogo de productos" />
      <div className="min-h-[calc(100vh-5rem)] bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto w-full max-w-[min(100%,1920px)] space-y-5 px-3 pb-10 pt-5 text-sm sm:space-y-6 sm:px-5 sm:pb-12 sm:pt-6 sm:text-base md:px-6 lg:px-8 xl:px-10 2xl:max-w-[min(100%,2200px)]">
      <nav
        className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-gray-500 dark:text-gray-500 sm:text-[13px]"
        aria-label="Migas de pan"
      >
        <Link to="/" className="rounded-md px-1 py-0.5 transition-colors hover:bg-gray-200/60 hover:text-gray-800 dark:hover:bg-white/5 dark:hover:text-gray-200">
          Inicio
        </Link>
        <span className="text-gray-300 dark:text-gray-600" aria-hidden>
          /
        </span>
        <span className="font-medium text-gray-700 dark:text-gray-300">Productos</span>
      </nav>

      <div className="flex flex-col gap-4">
        <header className={`flex w-full flex-col gap-4 ${cardShellClass} p-4 sm:p-6`}>
          <div className="flex min-w-0 gap-3 sm:gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-500/15 bg-brand-500/[0.07] text-brand-700 dark:border-brand-400/20 dark:bg-brand-400/10 dark:text-brand-300 sm:h-12 sm:w-12 sm:rounded-xl">
              <svg className="h-[18px] w-[18px] sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500 sm:text-[11px]">
                Catálogo
              </p>
              <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-gray-900 dark:text-white sm:text-xl md:text-2xl">Productos</h1>
              <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-gray-600 dark:text-gray-400 sm:mt-2 sm:text-sm">
                Consulta precios con IVA, existencias y fichas técnicas. Filtra por fuente, categoría o marca cuando necesites resultados más precisos.
              </p>
            </div>
          </div>
        </header>

        <form onSubmit={handleSearch}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <input
                id="search-input"
                type="text"
                value={busquedaInput}
                onChange={(e) => {
                  const q = e.target.value;
                  setBusquedaInput(q);
                  const v = q.trim();
                  setBusqueda(v);
                  setAutoCatalog(!v && !categoriaId && !marcaId && !fuente);
                  setPagina(1);
                }}
                placeholder="Buscar producto..."
                className={`${inputLikeClassName} h-11 pr-11 text-sm`}
              />
              <svg className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </div>

            <div className="flex items-end gap-2 md:self-end">
              <button
                type="button"
                onClick={() => {
                  openCreateManual();
                }}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-600 px-4 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 active:scale-[0.98]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
                Nuevo producto
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/30">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
            <p className="mt-1 text-xs text-red-700/90 dark:text-red-300/80">
              No pudimos conectar con el catálogo de productos. Intenta más tarde o contacta a soporte.
            </p>
          </div>
        )}

        <div className="pt-1">
          <ComponentCard
            compact
            title="Resultados"
            desc={
              (hasFiltro || autoCatalog) && total > 0
                ? `${total.toLocaleString("es-MX")} artículo${total === 1 ? "" : "s"} encontrados${paginas > 1 ? ` · página ${pagina} de ${paginas}` : ""}.`
                : "Los resultados aparecen aquí según tu búsqueda y filtros."
            }
            className={`${cardShellClass} !overflow-visible`}
            actions={
              <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5 rounded-lg border border-gray-200/90 bg-gray-50/90 p-0.5 dark:border-white/[0.08] dark:bg-gray-950/40">
                    <button
                      type="button"
                      onClick={() => setViewMode("table")}
                      title="Vista tabla"
                      disabled={loading}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition ${viewMode === "table" ? "bg-white dark:bg-gray-700 text-brand-600 dark:text-brand-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 6h16" />
                        <path d="M4 12h16" />
                        <path d="M4 18h16" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("cards")}
                      title="Vista tarjetas"
                      disabled={loading}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition ${viewMode === "cards" ? "bg-white dark:bg-gray-700 text-brand-600 dark:text-brand-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                      </svg>
                    </button>
                  </div>
                  <div className="relative" ref={filterRef}>
                    <button
                      type="button"
                      onClick={() => setFilterOpen((v) => !v)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-gray-300 dark:hover:bg-gray-900/60"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 7h13" />
                        <path d="M3 12h10" />
                        <path d="M3 17h7" />
                        <path d="M18 7v10" />
                        <path d="M21 10l-3-3-3 3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Filtrado
                    </button>
                    {filterOpen && (
                      <div className="absolute right-0 z-[120] mt-2 w-80 max-h-[min(80vh,24rem)] overflow-auto rounded-xl border border-gray-200/70 bg-white p-4 shadow-xl ring-1 ring-black/5 dark:border-white/[0.08] dark:bg-gray-900/95 dark:ring-white/10">
                        <div className="mb-4">
                          <label htmlFor="orden-select" className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
                            Ordenar por
                          </label>
                          <select
                            id="orden-select"
                            value={orden}
                            onChange={(e) => {
                              setOrden(e.target.value as NonNullable<SyscomSearchParams["orden"]>);
                              setAutoCatalog(false);
                              resetPage();
                            }}
                            className={`${selectLikeClassName} h-10`}
                          >
                            {ORDEN_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="mb-4">
                          <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">Fuente de datos</label>
                          <div className="inline-flex w-full rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-white/[0.08] dark:bg-gray-950/40">
                            {[
                              { value: "", label: "Todas" },
                              { value: "syscom", label: "Syscom" },
                              { value: "manual", label: "Manual" },
                            ].map((option) => {
                              const active = fuente === option.value;
                              return (
                                <button
                                  key={option.label}
                                  type="button"
                                  onClick={() => {
                                    setFuente(option.value as "" | IntraxFuente);
                                    setAutoCatalog(false);
                                    resetPage();
                                  }}
                                  className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-all ${
                                    active
                                      ? "bg-white text-brand-600 shadow-sm dark:bg-gray-700 dark:text-brand-400"
                                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                                  }`}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="mb-4">
                          <label htmlFor="categoria-select" className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
                            Categoría
                          </label>
                          <select
                            id="categoria-select"
                            value={categoriaId}
                            onChange={(e) => {
                              setCategoriaId(e.target.value);
                              setAutoCatalog(false);
                              resetPage();
                            }}
                            className={`${selectLikeClassName} h-10`}
                          >
                            <option value="">Todas las categorías</option>
                            {categorias.map((c) => (
                              <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                            {loadingCatalogos && !categorias.length && <option disabled>Cargando categorías...</option>}
                          </select>
                        </div>

                        <div className="mb-4">
                          <label htmlFor="marca-select" className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
                            Marca
                          </label>
                          <select
                            id="marca-select"
                            value={marcaId}
                            onChange={(e) => {
                              setMarcaId(e.target.value);
                              setAutoCatalog(false);
                              resetPage();
                            }}
                            className={`${selectLikeClassName} h-10`}
                          >
                            <option value="">Todas las marcas</option>
                            {marcas.slice(0, MARCAS_SELECT_LIMIT).map((m) => (
                              <option key={m.id} value={m.id}>{m.nombre}</option>
                            ))}
                            {loadingCatalogos && !marcas.length && <option disabled>Cargando marcas...</option>}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              clearFiltros();
                              setFilterOpen(false);
                            }}
                            className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-white dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-gray-300 dark:hover:bg-gray-900/60"
                          >
                            Limpiar filtros
                          </button>
                          <button
                            type="button"
                            onClick={() => setFilterOpen(false)}
                            className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
                          >
                            Aplicar
                          </button>
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
                    <div
                      key={p.producto_id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openDetailModal(p.producto_id)}
                      onKeyDown={(e) => e.key === "Enter" && openDetailModal(p.producto_id)}
                      className="flex gap-3 rounded-xl border border-gray-200/70 dark:border-white/10 bg-white dark:bg-gray-800/60 p-3 hover:border-brand-500/50 dark:hover:border-brand-500/40 hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition cursor-pointer"
                    >
                      <div className="w-16 h-16 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center overflow-hidden">
                        {getProductoImageUrl(p.img_portada) ? (
                          <img src={getProductoImageUrl(p.img_portada)!} alt="" className="w-full h-full object-contain" loading="lazy" />
                        ) : (
                          <span className="text-[10px] text-gray-400">—</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{p.titulo}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {p.marca} · {p.modelo}
                          {p.fuente ? ` · ${p.fuente}` : ""}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-brand-600 dark:text-brand-400 tabular-nums">{formatPrecioPublicoMxnConIva(p, tipoCambio)}</p>
                        {p.total_existencia != null && <p className="text-[11px] text-gray-500 dark:text-gray-400">Stock {p.total_existencia}</p>}
                        <a
                          href={getProductoLink(p)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] font-medium text-brand-600 dark:text-brand-400 mt-1 inline-block hover:underline"
                        >
                          Ver más →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : viewMode === "cards" ? (
                <div className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-gray-900/40 py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                  {loading && "Cargando..."}
                  {!loading && productos.length === 0 && !error && (autoCatalog ? "No hay productos para mostrar." : "Escribe algo en búsqueda o elige categoría/marca y pulsa Buscar.")}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200/80 bg-gray-50/40 dark:border-white/[0.06] dark:bg-gray-950/30">
                  <Table className="w-full min-w-[720px] sm:min-w-0 xl:min-w-full">
                    <TableHeader className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50/95 text-[11px] font-semibold text-gray-900 dark:border-white/[0.06] dark:bg-gray-900/80 dark:text-white">
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
                    <TableBody className="divide-y divide-gray-100 dark:divide-white/10 text-[12px] text-gray-700 dark:text-gray-200">
                      {loading && (
                        <TableRow>
                          <TableCell colSpan={8} className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                            Cargando...
                          </TableCell>
                        </TableRow>
                      )}
                      {!loading && productos.length === 0 && !error && (
                        <TableRow>
                          <TableCell colSpan={8} className="px-3 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                            {autoCatalog ? "No hay productos para mostrar." : "Escribe algo en búsqueda o elige categoría/marca y pulsa Buscar."}
                          </TableCell>
                        </TableRow>
                      )}
                      {!loading && productos.length > 0 &&
                        productos.map((p) => {
                          const imgUrl = getProductoImageUrl(p.img_portada);
                          const link = getProductoLink(p);
                          return (
                            <TableRow key={p.producto_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                              <TableCell className="px-3 py-2 w-[64px] align-middle">
                                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center overflow-hidden shrink-0">
                                  {imgUrl ? (
                                    <img src={imgUrl} alt="" className="w-full h-full object-contain" loading="lazy" />
                                  ) : (
                                    <span className="text-[10px] text-gray-400">—</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="px-3 py-2 min-w-[200px] max-w-[280px]">
                                <button
                                  type="button"
                                  onClick={() => openDetailModal(p.producto_id)}
                                  className="block w-full text-left truncate text-gray-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 hover:underline font-medium"
                                  title={p.titulo}
                                >
                                  {p.titulo}
                                </button>
                              </TableCell>
                              <TableCell className="px-3 py-2 w-[100px] whitespace-nowrap">{p.marca}</TableCell>
                              <TableCell className="px-3 py-2 w-[120px] whitespace-nowrap">{p.modelo}</TableCell>
                              <TableCell className="px-3 py-2 w-[90px] whitespace-nowrap capitalize">{p.fuente || "—"}</TableCell>
                              <TableCell className="px-3 py-2 w-[120px] whitespace-nowrap font-medium text-brand-600 dark:text-brand-400 tabular-nums">
                                {formatPrecioPublicoMxnConIva(p, tipoCambio)}
                              </TableCell>
                              <TableCell className="px-3 py-2 w-[80px] whitespace-nowrap">{p.total_existencia ?? "—"}</TableCell>
                              <TableCell className="px-3 py-2 text-center w-[100px]">
                                {p.fuente === "manual" ? (
                                  <div className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-white/10 px-1.5 py-1">
                                    <button
                                      type="button"
                                      onClick={() => openEditManual(p.producto_id)}
                                      className="group inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white transition hover:border-brand-400 hover:text-brand-600 dark:border-white/10 dark:bg-gray-800 dark:hover:border-brand-500"
                                      title="Editar"
                                    >
                                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 20h9" />
                                        <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setManualDeleteId(p.producto_id)}
                                      className="group inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 bg-white transition hover:border-red-400 hover:text-red-600 dark:border-white/10 dark:bg-gray-800 dark:hover:border-red-500"
                                      title="Eliminar"
                                    >
                                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 6h18" />
                                        <path d="M8 6V4h8v2" />
                                        <path d="m6 6 1 14h10l1-14" />
                                      </svg>
                                    </button>
                                  </div>
                                ) : (
                                  <a
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                                  >
                                    Ver más
                                  </a>
                                )}
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
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {total} resultado(s)
                      {paginas > 1 && (
                        <> · Página <span className="font-medium text-gray-900 dark:text-white">{pagina}</span> de <span className="font-medium text-gray-900 dark:text-white">{paginas}</span></>
                      )}
                    </p>
                    {paginas > 1 && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPagina((prev) => Math.max(1, prev - 1))}
                          disabled={pagina <= 1}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 18l-6-6 6-6" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPagina((prev) => Math.min(paginas, prev + 1))}
                          disabled={pagina >= paginas}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </button>
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

      <Modal isOpen={detailModalOpen} onClose={closeDetailModal} className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-900 shadow-xl dark:shadow-none">
        {loadingDetail && (
          <div className="px-6 py-16 text-center">
            <div className="inline-flex h-12 w-12 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700 border-t-brand-500 dark:border-t-brand-400" aria-hidden />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Cargando detalle...</p>
          </div>
        )}
        {!loadingDetail && detailProduct && (() => {
          const imageUrls = getProductoImagenesUrls(detailProduct);
          const mainImage = imageUrls[selectedImageIndex] ?? imageUrls[0];
          return (
          <div className="p-6 space-y-6">
            {imageUrls.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Galería
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 overflow-hidden">
                  <div className="aspect-square max-h-80 w-full flex items-center justify-center p-4">
                    <img src={mainImage} alt="" className="max-h-full w-full object-contain" />
                  </div>
                  {imageUrls.length > 1 && (
                    <div className="flex gap-2 p-3 border-t border-gray-100 dark:border-gray-700 overflow-x-auto">
                      {imageUrls.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedImageIndex(i)}
                          className={`shrink-0 w-14 h-14 rounded-lg border-2 overflow-hidden flex items-center justify-center transition ${i === selectedImageIndex ? "border-brand-500 dark:border-brand-400 ring-2 ring-brand-200 dark:ring-brand-900/50" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}`}
                        >
                          <img src={url} alt="" className="w-full h-full object-contain" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              {imageUrls.length === 0 && (
                <div className="w-20 h-20 shrink-0 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white leading-snug">
                  {detailProduct.titulo}
                </h3>
                <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1.5 text-lg font-semibold tabular-nums text-brand-600 dark:text-brand-400">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatPrecioPublicoMxnConIva(detailProduct, tipoCambio)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">IVA incluido</span>
                </div>
              </div>
            </div>

            

            {detailProduct.caracteristicas && detailProduct.caracteristicas.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
                <h4 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Características
                </h4>
                <ul className="space-y-2">
                  {detailProduct.caracteristicas.map((c, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      <span className="mt-1.5 shrink-0 text-brand-500 dark:text-brand-400" aria-hidden>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 px-4 py-4 space-y-3">
              <h4 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Especificaciones
              </h4>
              <dl className="grid gap-3 sm:grid-cols-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <dt className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0H4m16 0v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6" />
                    </svg>
                    Stock
                  </dt>
                  <dd className="text-sm text-gray-900 dark:text-white">{detailProduct.total_existencia ?? "—"}</dd>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <dt className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Modelo
                  </dt>
                  <dd className="text-sm text-gray-900 dark:text-white">{detailProduct.modelo || "—"}</dd>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <dt className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Marca
                  </dt>
                  <dd className="text-sm text-gray-900 dark:text-white">{detailProduct.marca || "—"}</dd>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <dt className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 12h10M7 17h10" />
                    </svg>
                    Fuente
                  </dt>
                  <dd className="text-sm text-gray-900 dark:text-white capitalize">{detailProduct.fuente || "—"}</dd>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <dt className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5v14" />
                    </svg>
                    SKU
                  </dt>
                  <dd className="text-sm text-gray-900 dark:text-white">{detailProduct.sku || detailProduct.modelo || "—"}</dd>
                </div>
                {detailProduct.estado && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <dt className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                      Estado publicación
                    </dt>
                    <dd className="text-sm text-gray-900 dark:text-white capitalize">{detailProduct.estado}</dd>
                  </div>
                )}
                {detailProduct.estado_inventario && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <dt className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
                      </svg>
                      Estado inventario
                    </dt>
                    <dd className="text-sm text-gray-900 dark:text-white capitalize">{detailProduct.estado_inventario.replace(/_/g, " ")}</dd>
                  </div>
                )}
                {detailProduct.sat_key && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <dt className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Código SAT
                    </dt>
                    <dd className="text-sm font-mono tabular-nums text-gray-900 dark:text-white">{detailProduct.sat_key}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
              <a
                href={getProductoLink(detailProduct)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-brand-300 dark:hover:border-brand-700 hover:text-brand-600 dark:hover:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Ver más información
              </a>
            </div>
          </div>
          );
        })()}
        {!loadingDetail && !detailProduct && selectedProductId && (
          <div className="px-6 py-16 text-center">
            <svg className="mx-auto w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">No se pudo cargar el detalle del producto.</p>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        closeOnBackdropClick={false}
        className="flex max-h-[min(92vh,760px)] w-[min(96vw,42rem)] flex-col overflow-hidden rounded-2xl border border-gray-200/75 p-0 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.12)] dark:border-white/[0.08] dark:bg-gray-900 dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)] sm:max-w-2xl"
      >
        <header className="relative shrink-0 border-b border-gray-200/60 bg-gray-50/80 px-6 py-5 pr-14 dark:border-white/[0.06] dark:bg-gray-950/40 sm:pr-16">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-500/12 bg-white text-brand-700 shadow-sm dark:border-brand-400/15 dark:bg-gray-900/60 dark:text-brand-300">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 7a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" strokeLinejoin="round" />
                <path d="M12 10v6M9 13h6" strokeLinecap="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold tracking-tight text-gray-900 dark:text-white sm:text-lg">
                {editingManualId ? "Editar producto manual" : "Nuevo producto manual"}
              </h3>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                Captura la información principal y sube una imagen para guardar el producto en el catálogo manual.
              </p>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 pb-6 sm:px-6 custom-scrollbar">
          {manualFormError && (
            <div className="rounded-xl border border-red-200/80 bg-red-50/90 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              {manualFormError}
            </div>
          )}

          <section className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-theme-xs dark:border-white/[0.08] dark:bg-gray-900/40 sm:p-5">
            <div className="mb-3 border-b border-gray-100/90 pb-3 dark:border-white/[0.06]">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Datos del producto</h4>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Producto *</label>
                <input
                  value={manualForm.producto}
                  onChange={(e) => setManualForm((p) => ({ ...p, producto: e.target.value }))}
                  placeholder="Nombre del producto"
                  className={inputLikeClassName}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Marca *</label>
                  <input
                    value={manualForm.marca}
                    onChange={(e) => setManualForm((p) => ({ ...p, marca: e.target.value }))}
                    placeholder="Marca"
                    className={inputLikeClassName}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Modelo *</label>
                  <input
                    value={manualForm.modelo}
                    onChange={(e) => setManualForm((p) => ({ ...p, modelo: e.target.value }))}
                    placeholder="Modelo"
                    className={inputLikeClassName}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Precio *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualForm.precio}
                    onChange={(e) => setManualForm((p) => ({ ...p, precio: e.target.value }))}
                    placeholder="0.00"
                    className={inputLikeClassName}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Stock *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={manualForm.stock}
                    onChange={(e) => setManualForm((p) => ({ ...p, stock: e.target.value }))}
                    placeholder="0"
                    className={inputLikeClassName}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-theme-xs dark:border-white/[0.08] dark:bg-gray-900/40 sm:p-5">
            <div className="mb-3 border-b border-gray-100/90 pb-3 dark:border-white/[0.06]">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Imagen</h4>
            </div>
            {manualForm.imagen_url ? (
              <div className="space-y-2">
                <div className="relative w-full max-w-[280px] overflow-hidden rounded-lg border border-gray-200/80 bg-gray-50 dark:border-white/[0.08] dark:bg-gray-800/40">
                  <img src={manualForm.imagen_url} alt="Producto" className="h-40 w-full object-contain p-2" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const oldUrl = manualForm.imagen_url;
                    setManualForm((prev) => ({ ...prev, imagen_url: "" }));
                    if (oldUrl) void deleteCloudinaryByUrl(oldUrl).catch(() => null);
                  }}
                  className="inline-flex h-9 items-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-white/[0.08] dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.05]"
                >
                  Quitar imagen
                </button>
              </div>
            ) : (
              <div
                {...getManualImageRootProps()}
                id="producto-imagen-upload"
                className={`dropzone cursor-pointer rounded-lg border border-dashed border-gray-300 p-4 sm:p-5 transition-all ${
                  isManualImageDragActive
                    ? "border-brand-500 bg-gray-100 dark:bg-gray-800"
                    : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                }`}
              >
                <input {...getManualImageInputProps()} />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {isManualImageDragActive ? "Suelta aquí para subir" : "Haz clic o arrastra imagen (máx. 1)"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Formatos: PNG, JPG, WebP o SVG
                  </p>
                </div>
              </div>
            )}
            {manualImageUploading && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                </svg>
                Subiendo...
              </div>
            )}
          </section>
        </div>

        <div className="shrink-0 border-t border-gray-200/70 bg-white px-5 py-4 dark:border-white/[0.08] dark:bg-gray-900 sm:px-6">
          <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setManualModalOpen(false)}
            className="inline-flex h-10 items-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.05]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={saveManualProduct}
            className="inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {editingManualId ? "Guardar" : "Agregar"}
          </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!manualDeleteId} onClose={() => setManualDeleteId(null)} className="mx-4 w-full max-w-md sm:mx-auto">
        <div className="border-b border-gray-100 p-5 dark:border-white/[0.06] sm:p-6">
          <h3 className="mb-2 text-center text-base font-semibold tracking-tight text-gray-900 dark:text-white sm:text-lg">Eliminar producto manual</h3>
          <p className="mb-6 text-center text-xs leading-relaxed text-gray-600 dark:text-gray-400 sm:text-sm">
            Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setManualDeleteId(null)}
              className="flex-1 rounded-lg border border-gray-200/90 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-gray-200 dark:hover:bg-white/[0.04] sm:text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmDeleteManual}
              className="flex-1 rounded-lg bg-error-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-error-700 focus:outline-none focus:ring-2 focus:ring-error-500/40 sm:text-sm"
            >
              Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}