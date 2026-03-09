import { useCallback, useEffect, useState } from "react";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import {
  buildProductosQuery,
  fetchSyscomTipoCambio,
  formatPrecioPublicoMxnConIva,
  fetchSyscomProductoDetalle,
  getAuthToken,
  getProductoImageUrl,
  getProductoImagenesUrls,
  getProductoLink,
  type SyscomCategoria,
  type SyscomMarca,
  type SyscomProducto,
  type SyscomProductoDetalle,
  type SyscomProductosResponse,
  type SyscomSearchParams,
  fetchSyscom,
} from "./syscomCatalog";
import { Modal } from "@/components/ui/modal";

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
  "w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 shadow-theme-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none";
const selectLikeClassName =
  "w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 shadow-theme-xs text-gray-800 dark:text-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70 dark:focus:border-brand-400 dark:focus:ring-brand-900/40 outline-none";


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

  const [categorias, setCategorias] = useState<SyscomCategoria[]>([]);
  const [marcas, setMarcas] = useState<SyscomMarca[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [tipoCambio, setTipoCambio] = useState<number | null>(null);

  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const hasFiltro = Boolean(busqueda.trim() || categoriaId || marcaId);
  const [autoCatalog, setAutoCatalog] = useState(true);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [detailProduct, setDetailProduct] = useState<SyscomProductoDetalle | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

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
    const token = getAuthToken();
    if (!token) {
      setError("Debe iniciar sesión para ver el catálogo.");
      return;
    }
    setLoading(true);
    setError(null);
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
    try {
      const res = await fetchSyscom(`productos/?${query}`, token);
      const data: SyscomProductosResponse = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProductos([]);
        setError((data as { detail?: string }).detail || "Error al cargar productos.");
        return;
      }
      setProductos(data.productos ?? []);
      setPaginas(data.paginas ?? 1);
      setTotal(data.cantidad ?? 0);
    } catch {
      setProductos([]);
      setError("Error de conexión con el catálogo.");
    } finally {
      setLoading(false);
    }
  }, [busqueda, categoriaId, marcaId, orden, pagina, hasFiltro, autoCatalog]);

  useEffect(() => {
    loadCatalogos();
  }, [loadCatalogos]);

  useEffect(() => {
    loadProductos();
  }, [loadProductos]);

  useEffect(() => {
    if (!detailModalOpen || !selectedProductId) {
      setDetailProduct(null);
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
  }, [detailModalOpen, selectedProductId]);

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
    setAutoCatalog(!q && !categoriaId && !marcaId);
    setPagina(1);
  };

  const resetPage = useCallback(() => setPagina(1), []);

  return (
    <>
      <PageMeta title="Productos | Catálogo" description="Catálogo de productos" />
      <PageBreadcrumb pageTitle="Productos" />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gray-50 text-gray-700 ring-1 ring-gray-200/70 dark:bg-white/5 dark:text-gray-200 dark:ring-white/10">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">Catálogo de productos</h2>
                <div className="mt-0.5 text-[12px] text-gray-500 dark:text-gray-400">
                  Busca productos. Escribe algo, elige categoría o marca y pulsa Buscar.
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Buscar</label>
            <input
              type="text"
              value={busquedaInput}
              onChange={(e) => setBusquedaInput(e.target.value)}
              placeholder="Modelo, nombre, palabra clave..."
              className={inputLikeClassName}
            />
          </div>
          <div className="w-40">
            <label className="block text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Categoría</label>
            <select
              value={categoriaId}
              onChange={(e) => {
                setCategoriaId(e.target.value);
                setAutoCatalog(false);
                resetPage();
              }}
              className={selectLikeClassName}
            >
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
              {loadingCatalogos && !categorias.length && <option disabled>Cargando...</option>}
            </select>
          </div>
          <div className="w-40">
            <label className="block text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Marca</label>
            <select
              value={marcaId}
              onChange={(e) => {
                setMarcaId(e.target.value);
                setAutoCatalog(false);
                resetPage();
              }}
              className={selectLikeClassName}
            >
              <option value="">Todas</option>
              {marcas.slice(0, MARCAS_SELECT_LIMIT).map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
              {loadingCatalogos && !marcas.length && <option disabled>Cargando...</option>}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Orden</label>
            <select
              value={orden}
              onChange={(e) => {
                setOrden(e.target.value as NonNullable<SyscomSearchParams["orden"]>);
                setAutoCatalog(false);
                resetPage();
              }}
              className={selectLikeClassName}
            >
              {ORDEN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="h-10 px-4 rounded-xl bg-brand-600 text-white text-xs font-semibold shadow-theme-xs hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          >
            Buscar
          </button>
        </form>

        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/80 dark:bg-red-950/30 px-4 py-3">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              No pudimos conectar con el catálogo de productos. Intenta más tarde o contacta a soporte.
            </p>
          </div>
        )}

        <div className="mt-4 pt-1">
          <ComponentCard
            title="Listado"
            actions={
              (hasFiltro || autoCatalog) && productos.length > 0 && !loading ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-0.5">
                    <button
                      type="button"
                      onClick={() => setViewMode("table")}
                      title="Vista tabla"
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
                </div>
              ) : null
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
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.marca} · {p.modelo}</p>
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
                <div className="overflow-x-auto rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-gray-900/40">
                  <Table className="w-full">
                    <TableHeader className="bg-gray-50/80 dark:bg-gray-900/70 sticky top-0 z-10 text-[11px] font-semibold text-gray-900 dark:text-white">
                      <TableRow>
                        <TableCell isHeader className="px-3 py-2 text-left w-[64px] text-gray-700 dark:text-gray-300">Imagen</TableCell>
                        <TableCell isHeader className="px-3 py-2 text-left min-w-[200px] text-gray-700 dark:text-gray-300">Producto</TableCell>
                        <TableCell isHeader className="px-3 py-2 text-left w-[100px] text-gray-700 dark:text-gray-300">Marca</TableCell>
                        <TableCell isHeader className="px-3 py-2 text-left w-[120px] text-gray-700 dark:text-gray-300">Modelo</TableCell>
                        <TableCell isHeader className="px-3 py-2 text-left w-[120px] text-gray-700 dark:text-gray-300">Precio</TableCell>
                        <TableCell isHeader className="px-3 py-2 text-left w-[80px] text-gray-700 dark:text-gray-300">Stock</TableCell>
                        <TableCell isHeader className="px-3 py-2 text-center w-[100px] text-gray-700 dark:text-gray-300">Acción</TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-white/10 text-[12px] text-gray-700 dark:text-gray-200">
                      {loading && (
                        <TableRow>
                          <TableCell colSpan={7} className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                            Cargando...
                          </TableCell>
                        </TableRow>
                      )}
                      {!loading && productos.length === 0 && !error && (
                        <TableRow>
                          <TableCell colSpan={7} className="px-3 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
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
                              <TableCell className="px-3 py-2 w-[120px] whitespace-nowrap font-medium text-brand-600 dark:text-brand-400 tabular-nums">
                                {formatPrecioPublicoMxnConIva(p, tipoCambio)}
                              </TableCell>
                              <TableCell className="px-3 py-2 w-[80px] whitespace-nowrap">{p.total_existencia ?? "—"}</TableCell>
                              <TableCell className="px-3 py-2 text-center w-[100px]">
                                <a
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                                >
                                  Ver más
                                </a>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {!loading && total > 0 && productos.length > 0 && (
                <div className="border-t border-gray-200 px-5 py-4 dark:border-gray-800">
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
    </>
  );
}
