import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import "@/components/ui/modal-kit/motion.css";
import ComponentCard from "@/components/common/ComponentCard";
import Alert, { type AlertVariant } from "@/components/ui/alert/Alert";
import { useAuth } from "@/context/AuthContext";
import {
  invBreadcrumbCurrentClass,
  invBreadcrumbLinkClass,
  invBreadcrumbNavClass,
  invHeroBandClass,
  invHeroBlurClass,
  invHeroBodyClass,
  invHeroChipClass,
  invHeroChipGoldClass,
  invHeroEyebrowClass,
  invHeroHeadingClass,
  invHeroIconWrapClass,
  invPageCanvasClass,
  invPageInnerClass,
  invSearchInputClass,
  inventarioSansStyle,
} from "./shared/inventarioStyles";
import InventarioAlert from "./components/InventarioAlert";
import InventarioDeleteModal from "./components/InventarioDeleteModal";
import InventarioEditModal from "./components/InventarioEditModal";
import InventarioImportFacturaBar from "./components/InventarioImportFacturaBar";
import InventarioItemsTable from "./components/InventarioItemsTable";
import InventarioMovimientosList from "./components/InventarioMovimientosList";
import InventarioPendientesDrawer from "./components/InventarioPendientesDrawer";
import InventarioPagination from "./components/InventarioPagination";
import InventarioScanBar from "./components/InventarioScanBar";
import InventarioStats from "./components/InventarioStats";
import InventarioFiltrosPopover from "./components/InventarioFiltrosPopover";
import { BarcodeIcon, SearchIcon } from "./components/inventarioIcons";
import { Clock3, X } from "lucide-react";
import {
  deleteInventarioItem,
  descartarInventarioPendiente,
  fetchInventarioStats,
  importarFactura,
  listInventarioPendientes,
  recibirInventarioPendiente,
  listInventarioItems,
  listInventarioMovimientos,
  patchInventarioItem,
  scanInventario,
  sincronizarPreciosMercado,
  type PrecioSincronizado,
  sincronizarSeccionesInventario,
} from "./shared/inventarioApi";
import { seccionLabel, type InventarioSeccionFiltro } from "./shared/inventarioSecciones";
import { UBICACION_LABEL } from "./shared/precioMercado";
import type {
  FacturaProveedor,
  InventarioItem,
  InventarioItemPatch,
  InventarioMovimiento,
  InventarioPendiente,
  InventarioStats as InventarioStatsData,
  InventarioUbicacionFiltro,
  RecepcionLinea,
  ScanModo,
} from "./shared/inventarioTypes";
import { shouldAcceptScan } from "./shared/scanDebounce";

const ITEMS_PAGE_SIZE = 20;
/** El historial solo enseña de a 10 (los más recientes primero). */
const MOVIMIENTOS_PAGE_SIZE = 10;

function inventarioPerm(
  permissions: Record<string, unknown>,
  key: "view" | "create" | "edit" | "delete",
): boolean {
  const inv = permissions.inventario as Record<string, boolean> | undefined;
  return inv?.[key] === true;
}

export default function InventarioPage() {
  const { permissions, isAdmin } = useAuth();
  const perms = permissions as Record<string, unknown>;

  const canCreate = isAdmin || inventarioPerm(perms, "create");
  const canEdit = isAdmin || inventarioPerm(perms, "edit");
  const canDelete = isAdmin || inventarioPerm(perms, "delete");
  const canEditFicha = canCreate || canEdit;

  const [modo, setModo] = useState<ScanModo>("entrada");
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [itemsCount, setItemsCount] = useState(0);
  const [itemsPage, setItemsPage] = useState(1);
  const [movimientos, setMovimientos] = useState<InventarioMovimiento[]>([]);
  const [movimientosCount, setMovimientosCount] = useState(0);
  const [movimientosPage, setMovimientosPage] = useState(1);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [movimientosLoading, setMovimientosLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [seccionFiltro, setSeccionFiltro] = useState<InventarioSeccionFiltro>("todas");
  const [ubicacionFiltro, setUbicacionFiltro] = useState<InventarioUbicacionFiltro>("todas");
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [filterItem, setFilterItem] = useState<InventarioItem | null>(null);
  const [editItem, setEditItem] = useState<InventarioItem | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteItem, setDeleteItem] = useState<InventarioItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [stats, setStats] = useState<InventarioStatsData>({
    total_items: 0,
    total_unidades: 0,
    sin_identificar: 0,
    sin_ubicacion: 0,
    movimientos_hoy: 0,
  });

  const [pendientes, setPendientes] = useState<InventarioPendiente[]>([]);
  const [pendientesOpen, setPendientesOpen] = useState(false);
  /** Confirmación global (arriba a la derecha) para lo que se guarda. */
  const [notice, setNotice] = useState<{ id: number; variant: AlertVariant; title: string; message: string } | null>(
    null,
  );
  const notify = useCallback((title: string, message: string, variant: AlertVariant = "success") => {
    setNotice({ id: Date.now(), variant, title, message });
  }, []);

  const lastScanRef = useRef<{ code: string; at: number } | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchFirstRef = useRef(true);

  const loadStats = useCallback(async () => {
    try {
      setStats(await fetchInventarioStats());
    } catch {
      // Los totales son informativos; no bloqueamos la pantalla.
    }
  }, []);

  const loadItems = useCallback(async (
    search: string,
    page: number,
    seccion: InventarioSeccionFiltro,
    ubicacion: InventarioUbicacionFiltro,
  ) => {
    setItemsLoading(true);
    try {
      const data = await listInventarioItems({
        search,
        page,
        page_size: ITEMS_PAGE_SIZE,
        seccion: seccion === "todas" ? undefined : seccion,
        ubicacion: ubicacion === "todas" ? undefined : ubicacion,
      });
      setItems(data.results);
      setItemsCount(data.count);
      const maxPage = Math.max(1, Math.ceil(data.count / ITEMS_PAGE_SIZE) || 1);
      if (page > maxPage) setItemsPage(maxPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los ítems");
      setItems([]);
      setItemsCount(0);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  const loadMovimientos = useCallback(async (itemId: number | null, page: number) => {
    setMovimientosLoading(true);
    try {
      const data = await listInventarioMovimientos({
        item: itemId ?? undefined,
        page,
        page_size: MOVIMIENTOS_PAGE_SIZE,
      });
      setMovimientos(data.results);
      setMovimientosCount(data.count);
      const maxPage = Math.max(1, Math.ceil(data.count / MOVIMIENTOS_PAGE_SIZE) || 1);
      if (page > maxPage) setMovimientosPage(maxPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el historial");
      setMovimientos([]);
      setMovimientosCount(0);
    } finally {
      setMovimientosLoading(false);
    }
  }, []);

  const loadPendientes = useCallback(async () => {
    try {
      setPendientes(await listInventarioPendientes());
    } catch {
      // La lista de espera es secundaria; no bloquea la pantalla.
    }
  }, []);

  useEffect(() => {
    void loadStats();
    void loadPendientes();
  }, [loadStats, loadPendientes]);

  /* Precio de venta (lista SYSCOM/TVC): se actualiza solo, independiente de las
     secciones. Lotes pequeños en serie hasta que no quede nada vencido; los
     ítems visibles van primero y cada lote se pinta al llegar. Se repite cada
     15 min mientras la página esté abierta. */
  const itemsRef = useRef<InventarioItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const preciosCorriendoRef = useRef(false);
  const aplicarPrecios = useCallback((lote: PrecioSincronizado[]) => {
    if (!lote.length) return;
    const porId = new Map(lote.map((p) => [p.id, p]));
    const merge = <T extends InventarioItem>(row: T): T => {
      const p = porId.get(row.id);
      return p ? { ...row, ...p } : row;
    };
    setItems((prev) => prev.map(merge));
    setFilterItem((prev) => (prev ? merge(prev) : prev));
    setEditItem((prev) => (prev ? merge(prev) : prev));
  }, []);
  const sincronizarPrecios = useCallback(async () => {
    if (preciosCorriendoRef.current) return;
    preciosCorriendoRef.current = true;
    try {
      for (let vuelta = 0; vuelta < 60; vuelta += 1) {
        const visibles = itemsRef.current
          .filter((it) => it.fuente === "syscom" || it.fuente === "tvc")
          .map((it) => it.id);
        const res = await sincronizarPreciosMercado(6, visibles);
        aplicarPrecios(res.items);
        if (res.revisados === 0 || res.pendientes_restantes === 0) break;
      }
    } catch {
      // Silencioso: se reintenta en la siguiente vuelta programada.
    } finally {
      preciosCorriendoRef.current = false;
    }
  }, [aplicarPrecios]);
  useEffect(() => {
    void sincronizarPrecios();
    const id = window.setInterval(() => void sincronizarPrecios(), 15 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [sincronizarPrecios]);
  // Al cambiar de página o búsqueda, los nuevos visibles sin precio se consultan ya.
  useEffect(() => {
    if (items.some((it) => (it.fuente === "syscom" || it.fuente === "tvc") && !it.precio_mercado_actualizado)) {
      void sincronizarPrecios();
    }
  }, [items, sincronizarPrecios]);

  // Al abrir: rellena secciones vacías desde SYSCOM (ítems viejos).
  // Sin ref de “ya corrí”: en Strict Mode el primer efecto se cancela y el segundo debe volver a sincronizar.
  useEffect(() => {
    let cancelado = false;
    void (async () => {
      try {
        const res = await sincronizarSeccionesInventario(50);
        if (cancelado || res.actualizados <= 0) return;
        await loadItems(debouncedSearch, itemsPage, seccionFiltro, ubicacionFiltro);
        await loadStats();
      } catch {
        // Silencioso: el listado también intenta rellenar de a 5 al paginar.
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- backfill al montar la página
  }, []);

  useEffect(() => {
    const delay = searchFirstRef.current ? 0 : 300;
    searchFirstRef.current = false;
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setItemsPage(1);
    }, delay);
    return () => window.clearTimeout(handle);
  }, [searchTerm]);

  useEffect(() => {
    void loadItems(debouncedSearch, itemsPage, seccionFiltro, ubicacionFiltro);
  }, [debouncedSearch, itemsPage, seccionFiltro, ubicacionFiltro, loadItems]);

  useEffect(() => {
    void loadMovimientos(filterItem?.id ?? null, movimientosPage);
  }, [filterItem, movimientosPage, loadMovimientos]);

  const refreshLists = useCallback(async () => {
    await Promise.all([
      loadItems(debouncedSearch, itemsPage, seccionFiltro, ubicacionFiltro),
      loadMovimientos(filterItem?.id ?? null, movimientosPage),
      loadStats(),
    ]);
  }, [
    debouncedSearch,
    filterItem?.id,
    itemsPage,
    loadItems,
    loadMovimientos,
    loadStats,
    movimientosPage,
    seccionFiltro,
    ubicacionFiltro,
  ]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleUbicacionFiltro = (next: InventarioUbicacionFiltro) => {
    setUbicacionFiltro(next);
    setItemsPage(1);
  };

  const handleSeccionFiltro = (next: InventarioSeccionFiltro) => {
    setSeccionFiltro(next);
    setItemsPage(1);
  };

  const limpiarFiltros = () => {
    setUbicacionFiltro("todas");
    setSeccionFiltro("todas");
    setItemsPage(1);
  };

  /** Filtros aplicados, visibles bajo el buscador para quitarlos de un toque. */
  const filtrosActivos = [
    ...(ubicacionFiltro !== "todas"
      ? [{
          id: "ubicacion",
          label: ubicacionFiltro === "sin" ? "Sin ubicación" : UBICACION_LABEL[ubicacionFiltro],
          quitar: () => handleUbicacionFiltro("todas"),
        }]
      : []),
    ...(seccionFiltro !== "todas"
      ? [{
          id: "seccion",
          label: seccionFiltro === "sin" ? "Sin sección" : seccionLabel(seccionFiltro),
          quitar: () => handleSeccionFiltro("todas"),
        }]
      : []),
  ];

  const handleSelectItem = (item: InventarioItem | null) => {
    setFilterItem(item);
    setMovimientosPage(1);
  };

  const handleScan = async (rawCode: string, notaSalida?: string) => {
    const code = rawCode.trim();
    if (!code) return;

    const now = Date.now();
    if (!shouldAcceptScan(code, now, lastScanRef.current)) return;
    lastScanRef.current = { code, at: now };

    if (!canCreate) {
      setError("No tienes permiso para registrar movimientos de inventario.");
      return;
    }

    setScanning(true);
    setError(null);
    setScanStatus(null);

    try {
      await registrarEscaneo(code, modo === "salida" ? notaSalida : undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el escaneo");
    } finally {
      setScanning(false);
    }
  };

  /** Registra el escaneo; lanza el error de la API. */
  const registrarEscaneo = async (code: string, notaSalida?: string) => {
    const result = await scanInventario(code, modo, notaSalida);
    const nombre = result.item.nombre || result.item.codigo_barras;
    const accion = modo === "entrada" ? "Entrada" : "Salida";
    const extras: string[] = [];
    if (result.creado) extras.push("ítem nuevo, sin ubicación");
    if (result.enriquecido) extras.push("datos enriquecidos");
    if (modo === "salida" && result.movimiento.nota?.trim()) {
      extras.push(`motivo: ${result.movimiento.nota.trim()}`);
    }
    const suffix = extras.length > 0 ? ` (${extras.join(", ")})` : "";
    setScanStatus(
      `${accion} registrada: ${nombre} — existencia ${result.item.cantidad}${suffix}`,
    );
    await refreshLists();
  };

  const handleDelete = async (item: InventarioItem) => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteInventarioItem(item.id);
      setDeleteItem(null);
      if (filterItem?.id === item.id) {
        setFilterItem(null);
        setMovimientosPage(1);
      }
      notify("Ítem eliminado", item.nombre || item.codigo_barras);
    await Promise.all([
      loadItems(debouncedSearch, itemsPage, seccionFiltro, ubicacionFiltro),
      loadMovimientos(
        filterItem?.id === item.id ? null : filterItem?.id ?? null,
        filterItem?.id === item.id ? 1 : movimientosPage,
      ),
      loadStats(),
    ]);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "No se pudo eliminar el ítem");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveEdit = async (id: number, patch: InventarioItemPatch) => {
    setSavingEdit(true);
    try {
      const updated = await patchInventarioItem(id, patch);
      setItems((prev) => prev.map((row) => (row.id === id ? updated : row)));
      if (filterItem?.id === id) setFilterItem(updated);
      setEditItem(updated);
      notify("Cambios guardados", updated.nombre || updated.codigo_barras);
      await loadStats();
    } finally {
      setSavingEdit(false);
    }
  };

  const handleItemUpdatedFromModal = (updated: InventarioItem) => {
    setEditItem((prev) =>
      prev && prev.id === updated.id ? { ...prev, cantidad: updated.cantidad } : updated,
    );
    setItems((prev) => prev.map((row) => (row.id === updated.id ? { ...row, cantidad: updated.cantidad } : row)));
    if (filterItem?.id === updated.id) {
      setFilterItem((prev) => (prev ? { ...prev, cantidad: updated.cantidad } : prev));
    }
    notify("Existencia actualizada", `${updated.nombre || updated.codigo_barras}: ${updated.cantidad} en existencia`);
    void loadMovimientos(filterItem?.id ?? null, movimientosPage);
    void loadStats();
  };

  const handleImportFactura = async (
    proveedor: FacturaProveedor,
    folio: string,
    recepcion: RecepcionLinea[],
  ) => {
    const result = await importarFactura(proveedor, folio, recepcion);
    const espera = result.pendientes.length
      ? ` · ${result.pendientes.length} en espera`
      : " · todo entró al inventario";
    notify(
      `Factura ${result.folio} importada`,
      `${result.creados} nuevos, ${result.actualizados} actualizados${espera}`,
    );
    setItemsPage(1);
    setMovimientosPage(1);
    await Promise.all([
      loadItems(debouncedSearch, 1, seccionFiltro, ubicacionFiltro),
      loadMovimientos(filterItem?.id ?? null, 1),
      loadStats(),
      loadPendientes(),
    ]);
    return result;
  };

  const handleRecibirPendiente = async (
    p: InventarioPendiente,
    cantidad: number,
  ) => {
    const res = await recibirInventarioPendiente(p.id, cantidad);
    setPendientes((prev) =>
      res.pendiente
        ? prev.map((row) => (row.id === p.id ? (res.pendiente as InventarioPendiente) : row))
        : prev.filter((row) => row.id !== p.id),
    );
    notify(
      "Entrada registrada",
      `${res.item.nombre || res.item.codigo_barras}: +${res.recibidas} (existencia ${res.item.cantidad})`,
    );
    await refreshLists();
  };

  const handleDescartarPendiente = async (p: InventarioPendiente) => {
    await descartarInventarioPendiente(p.id);
    setPendientes((prev) => prev.filter((row) => row.id !== p.id));
    notify("Quitado de la lista de espera", p.nombre || p.modelo, "info");
  };

  return (
    <>
      <PageMeta title="Inventario | DigitalFlow" description="Control de inventario por código de barras" />
      <div className={invPageCanvasClass} style={inventarioSansStyle}>
        <div className={invPageInnerClass}>
          <nav className={invBreadcrumbNavClass} aria-label="Miga de pan">
            <Link to="/" className={invBreadcrumbLinkClass}>
              Inicio
            </Link>
            <span className="text-[#D3D3D8] dark:text-[#3D3D4A]" aria-hidden="true">
              /
            </span>
            <span className={invBreadcrumbCurrentClass}>Inventario</span>
          </nav>

          <header className={invHeroBandClass}>
            <div className={invHeroBlurClass} aria-hidden="true" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
              <div className="flex min-w-0 items-start gap-4">
                <span className={invHeroIconWrapClass} aria-hidden="true">
                  <BarcodeIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className={invHeroEyebrowClass}>Operación</p>
                  <h1 className={invHeroHeadingClass}>Inventario</h1>
                  <p className={invHeroBodyClass}>
                    Escanea códigos de barras para registrar entradas y salidas, consulta existencias y
                    revisa el historial.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPendientesOpen(true)}
                  aria-label={`Productos en espera: ${pendientes.length}`}
                  className={`cot-press relative inline-flex h-11 items-center gap-2 rounded-full pl-2 pr-4 text-[14px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                    pendientes.length
                      ? "bg-[#E6A23C] text-[#17235B] shadow-[0_8px_20px_-10px_rgba(230,162,60,0.9)] hover:bg-[#F0B454]"
                      : "bg-white/10 text-white/85 hover:bg-white/[0.16]"
                  }`}
                >
                  <span
                    className={`relative inline-flex size-8 items-center justify-center rounded-full ${
                      pendientes.length ? "bg-[#17235B]/10" : "bg-white/10"
                    }`}
                    aria-hidden="true"
                  >
                    <Clock3 className="size-[18px]" />
                    {pendientes.length ? (
                      <span
                        key={pendientes.length}
                        className="cot-tick absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C22B2B] px-1 text-[11px] font-bold tabular-nums text-white ring-2 ring-[#E6A23C]"
                      >
                        {pendientes.length > 99 ? "99+" : pendientes.length}
                      </span>
                    ) : null}
                  </span>
                  En espera
                </button>
                <span className={invHeroChipClass}>
                  <span className="size-1.5 rounded-full bg-[#4ADE80]" aria-hidden="true" />
                  {stats.total_items.toLocaleString("es-MX")} códigos
                </span>
                {stats.sin_identificar > 0 ? (
                  <span className={invHeroChipGoldClass}>
                    {stats.sin_identificar.toLocaleString("es-MX")} sin identificar
                  </span>
                ) : null}
              </div>
            </div>
          </header>

          {error ? (
            <div className="mt-4">
              <InventarioAlert
                variant="error"
                title="No se pudo completar la operación"
                message={error}
                onDismiss={() => setError(null)}
              />
            </div>
          ) : null}

          <div className="mt-4">
            <InventarioScanBar
              modo={modo}
              onModoChange={setModo}
              onScan={(code, nota) => void handleScan(code, nota)}
              disabled={!canCreate || scanning}
              scanning={scanning}
              statusMessage={scanStatus}
            />
          </div>

          {canCreate ? (
            <div className="mt-4">
              <InventarioImportFacturaBar
                disabled={scanning}
                onImport={handleImportFactura}
              />
            </div>
          ) : null}


          <div className="mt-4">
            <InventarioStats
              totalItems={stats.total_items}
              totalUnidades={stats.total_unidades}
              sinIdentificar={stats.sin_identificar}
              movimientosHoy={stats.movimientos_hoy}
            />
          </div>

          <div className="mt-4 grid min-w-0 gap-4">
            <ComponentCard
              compact
              className="min-w-0 max-w-full overflow-hidden"
              title="Ítems en inventario"
              desc="Busca o usa Filtros por ubicación y sección. Toca un producto para ver su historial."
            >
              <div className="mb-4 min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <label htmlFor="inventario-search" className="sr-only">
                    Buscar ítems
                  </label>
                  <div className="relative min-w-0 flex-1">
                    <span
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A1A1AA] dark:text-[#64748b]"
                      aria-hidden="true"
                    >
                      <SearchIcon className="h-4 w-4" />
                    </span>
                    <input
                      id="inventario-search"
                      type="search"
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Buscar por código, nombre, marca o modelo…"
                      className={invSearchInputClass}
                    />
                  </div>
                  <InventarioFiltrosPopover
                    open={filtrosOpen}
                    onOpenChange={setFiltrosOpen}
                    ubicacion={ubicacionFiltro}
                    onUbicacionChange={handleUbicacionFiltro}
                    seccion={seccionFiltro}
                    onSeccionChange={handleSeccionFiltro}
                    sinUbicacion={stats.sin_ubicacion}
                    onClear={limpiarFiltros}
                  />
                </div>
                {filtrosActivos.length ? (
                  <ul className="mt-2.5 flex flex-wrap items-center gap-1.5" aria-label="Filtros aplicados">
                    {filtrosActivos.map((f) => (
                      <li key={f.id}>
                        <button
                          type="button"
                          onClick={f.quitar}
                          aria-label={`Quitar filtro: ${f.label}`}
                          className="cot-fade inline-flex h-8 items-center gap-1 rounded-full border border-[#1B5CFF]/25 bg-[rgba(27,92,255,0.06)] pl-3 pr-2 text-[12.5px] font-medium text-[#1244D1] transition-colors hover:bg-[rgba(27,92,255,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:border-[#4B7CFF]/30 dark:bg-[rgba(75,124,255,0.12)] dark:text-[#C7D5FF]"
                        >
                          {f.label}
                          <X className="size-3.5" aria-hidden />
                        </button>
                      </li>
                    ))}
                    {filtrosActivos.length > 1 ? (
                      <li>
                        <button
                          type="button"
                          onClick={limpiarFiltros}
                          className="h-8 rounded-full px-2 text-[12.5px] font-semibold text-[#6E6E77] underline-offset-2 hover:text-[#09090B] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:text-[#8EA0B8] dark:hover:text-[#F8FAFC]"
                        >
                          Limpiar todo
                        </button>
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </div>
              <InventarioItemsTable
                items={items}
                loading={itemsLoading}
                canEdit={canEditFicha}
                canDelete={canDelete}
                selectedItemId={filterItem?.id ?? null}
                onSelectItem={handleSelectItem}
                onEdit={setEditItem}
                onDelete={(item) => {
                  setDeleteError(null);
                  setDeleteItem(item);
                }}
              />
              {!itemsLoading ? (
                <InventarioPagination
                  page={itemsPage}
                  pageSize={ITEMS_PAGE_SIZE}
                  totalCount={itemsCount}
                  onPageChange={setItemsPage}
                  labelSingular="ítem"
                  labelPlural="ítems"
                />
              ) : null}
            </ComponentCard>

            <ComponentCard compact title="Historial de movimientos">
              <InventarioMovimientosList
                movimientos={movimientos}
                loading={movimientosLoading}
                filterItem={filterItem}
                onClearFilter={() => handleSelectItem(null)}
              />
              {!movimientosLoading ? (
                <InventarioPagination
                  page={movimientosPage}
                  pageSize={MOVIMIENTOS_PAGE_SIZE}
                  totalCount={movimientosCount}
                  onPageChange={setMovimientosPage}
                  labelSingular="movimiento"
                  labelPlural="movimientos"
                />
              ) : null}
            </ComponentCard>
          </div>
        </div>
      </div>

      <InventarioEditModal
        open={editItem != null}
        item={editItem}
        saving={savingEdit}
        canAdjustStock={canCreate}
        onClose={() => setEditItem(null)}
        onSave={handleSaveEdit}
        onItemUpdated={handleItemUpdatedFromModal}
        onPrecioMercadoActualizado={(updated) => {
          setItems((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
          if (filterItem?.id === updated.id) setFilterItem((prev) => (prev ? { ...prev, ...updated } : prev));
        }}
      />

      <InventarioPendientesDrawer
        open={pendientesOpen}
        onClose={() => setPendientesOpen(false)}
        pendientes={pendientes}
        canReceive={canCreate}
        canDiscard={canDelete}
        onReceive={handleRecibirPendiente}
        onDiscard={handleDescartarPendiente}
      />

      {notice ? (
        <Alert
          key={notice.id}
          variant={notice.variant}
          title={notice.title}
          message={notice.message}
          onClose={() => setNotice(null)}
        />
      ) : null}

      <InventarioDeleteModal
        item={deleteItem}
        deleting={deleting}
        error={deleteError}
        onClose={() => setDeleteItem(null)}
        onConfirm={(item) => void handleDelete(item)}
      />
    </>
  );
}
