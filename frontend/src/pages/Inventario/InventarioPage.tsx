import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import Alert from "@/components/ui/alert/Alert";
import { useAuth } from "@/context/AuthContext";
import {
  erpHeroHeadingClass,
  erpPageCanvasClass,
  erpPageInnerClass,
  erpSansStyle,
  erpSearchInputClass,
} from "@/layout/erpPageStyles";
import {
  claudeBodyClass,
  erpBreadcrumbLinkClass,
  erpBreadcrumbNavClass,
  erpHeroBlurClass,
  erpHeroGradientClass,
  erpHeroIconWrapClass,
  pageCardShellClass,
  sectionLabelOrangeClass,
} from "../Operacion/OrdenesTrabajo/ordenTrabajoStyles";
import InventarioDeleteModal from "./components/InventarioDeleteModal";
import InventarioEditModal from "./components/InventarioEditModal";
import InventarioImportFacturaBar from "./components/InventarioImportFacturaBar";
import InventarioItemsTable from "./components/InventarioItemsTable";
import InventarioMovimientosList from "./components/InventarioMovimientosList";
import InventarioPagination from "./components/InventarioPagination";
import InventarioScanBar from "./components/InventarioScanBar";
import InventarioStats from "./components/InventarioStats";
import { BarcodeIcon, SearchIcon } from "./components/inventarioIcons";
import {
  deleteInventarioItem,
  fetchInventarioStats,
  importarFactura,
  listInventarioItems,
  listInventarioMovimientos,
  patchInventarioItem,
  scanInventario,
} from "./shared/inventarioApi";
import type {
  FacturaProveedor,
  InventarioItem,
  InventarioItemPatch,
  InventarioMovimiento,
  InventarioStats as InventarioStatsData,
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
    movimientos_hoy: 0,
  });

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

  const loadItems = useCallback(async (search: string, page: number) => {
    setItemsLoading(true);
    try {
      const data = await listInventarioItems({ search, page, page_size: ITEMS_PAGE_SIZE });
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

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

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
    void loadItems(debouncedSearch, itemsPage);
  }, [debouncedSearch, itemsPage, loadItems]);

  useEffect(() => {
    void loadMovimientos(filterItem?.id ?? null, movimientosPage);
  }, [filterItem, movimientosPage, loadMovimientos]);

  const refreshLists = useCallback(async () => {
    await Promise.all([
      loadItems(debouncedSearch, itemsPage),
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
  ]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleSelectItem = (item: InventarioItem | null) => {
    setFilterItem(item);
    setMovimientosPage(1);
  };

  const handleScan = async (rawCode: string) => {
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
      const result = await scanInventario(code, modo);
      const nombre = result.item.nombre || result.item.codigo_barras;
      const accion = modo === "entrada" ? "Entrada" : "Salida";
      const extras: string[] = [];
      if (result.creado) extras.push("ítem nuevo");
      if (result.enriquecido) extras.push("datos enriquecidos");
      const suffix = extras.length > 0 ? ` (${extras.join(", ")})` : "";
      setScanStatus(
        `${accion} registrada: ${nombre} — existencia ${result.item.cantidad}${suffix}`,
      );
      await refreshLists();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el escaneo");
    } finally {
      setScanning(false);
    }
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
      setScanStatus(`Ítem eliminado: ${item.nombre || item.codigo_barras}`);
    await Promise.all([
      loadItems(debouncedSearch, itemsPage),
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
      setScanStatus(`Ítem actualizado: ${updated.nombre || updated.codigo_barras}`);
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
    setScanStatus(
      `Existencia actualizada: ${updated.nombre || updated.codigo_barras} → ${updated.cantidad}`,
    );
    void loadMovimientos(filterItem?.id ?? null, movimientosPage);
    void loadStats();
  };

  const handleImportFactura = async (proveedor: FacturaProveedor, folio: string) => {
    const result = await importarFactura(proveedor, folio);
    setScanStatus(
      `Factura ${result.folio} importada: ${result.creados} nuevos, ${result.actualizados} actualizados`,
    );
    setItemsPage(1);
    setMovimientosPage(1);
    await Promise.all([
      loadItems(debouncedSearch, 1),
      loadMovimientos(filterItem?.id ?? null, 1),
      loadStats(),
    ]);
    return result;
  };

  return (
    <>
      <PageMeta title="Inventario | DigitalFlow" description="Control de inventario por código de barras" />
      <div className={erpPageCanvasClass} style={erpSansStyle}>
        <div className={erpPageInnerClass}>
          <nav className={erpBreadcrumbNavClass} aria-label="Miga de pan">
            <Link to="/" className={erpBreadcrumbLinkClass}>
              Inicio
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#1c1917] dark:text-white">Inventario</span>
          </nav>

          <header className={`relative ${pageCardShellClass} p-4 sm:p-6`}>
            <div className={erpHeroBlurClass} aria-hidden="true" />
            <div className="flex min-w-0 items-start gap-3">
              <div className={erpHeroIconWrapClass} aria-hidden="true">
                <BarcodeIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className={sectionLabelOrangeClass}>Operación</p>
                <h1 className={erpHeroHeadingClass}>Inventario</h1>
                <p className={`mt-1 ${claudeBodyClass}`}>
                  Escanea códigos de barras para registrar entradas y salidas, consulta existencias y
                  revisa el historial.
                </p>
                <div className={erpHeroGradientClass} aria-hidden="true" />
              </div>
            </div>
          </header>

          {error ? (
            <div className="mt-4">
              <Alert variant="error" title="Error" message={error} />
            </div>
          ) : null}

          <div className="mt-4">
            <InventarioScanBar
              modo={modo}
              onModoChange={setModo}
              onScan={(code) => void handleScan(code)}
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

          <div className="mt-4 grid gap-4">
            <ComponentCard
              compact
              title="Ítems en inventario"
              desc="Toca un producto para filtrar su historial."
            >
              <div className="mb-4">
                <label htmlFor="inventario-search" className="sr-only">
                  Buscar ítems
                </label>
                <div className="relative">
                  <span
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a8a29e] dark:text-[#64748b]"
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
                    className={erpSearchInputClass}
                  />
                </div>
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
      />

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
