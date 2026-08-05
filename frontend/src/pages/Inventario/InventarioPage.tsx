import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import InventarioEditModal from "./components/InventarioEditModal";
import InventarioItemsTable from "./components/InventarioItemsTable";
import InventarioMovimientosList from "./components/InventarioMovimientosList";
import InventarioScanBar from "./components/InventarioScanBar";
import {
  listInventarioItems,
  listInventarioMovimientos,
  patchInventarioItem,
  scanInventario,
} from "./shared/inventarioApi";
import type { InventarioItem, InventarioItemPatch, ScanModo } from "./shared/inventarioTypes";
import { shouldAcceptScan } from "./shared/scanDebounce";

const RECENT_MOVIMIENTOS = 50;

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
  const canEditFicha = canCreate || canEdit;

  const [modo, setModo] = useState<ScanModo>("entrada");
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [movimientos, setMovimientos] = useState<Awaited<ReturnType<typeof listInventarioMovimientos>>>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [movimientosLoading, setMovimientosLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterItem, setFilterItem] = useState<InventarioItem | null>(null);
  const [editItem, setEditItem] = useState<InventarioItem | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<string | null>(null);

  const lastScanRef = useRef<{ code: string; at: number } | null>(null);

  const loadItems = useCallback(async (search?: string) => {
    setItemsLoading(true);
    try {
      const data = await listInventarioItems(search);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los ítems");
      setItems([]);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  const loadMovimientos = useCallback(async (itemId?: number | null) => {
    setMovimientosLoading(true);
    try {
      const data = await listInventarioMovimientos(
        itemId != null ? { item: itemId } : undefined,
      );
      setMovimientos(itemId != null ? data : data.slice(0, RECENT_MOVIMIENTOS));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el historial");
      setMovimientos([]);
    } finally {
      setMovimientosLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
    void loadMovimientos(null);
  }, [loadItems, loadMovimientos]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadItems(searchTerm);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchTerm, loadItems]);

  useEffect(() => {
    void loadMovimientos(filterItem?.id ?? null);
  }, [filterItem, loadMovimientos]);

  const itemsById = useMemo(() => {
    const map = new Map<number, InventarioItem>();
    for (const item of items) map.set(item.id, item);
    return map;
  }, [items]);

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
        `${accion} registrada: ${nombre} — cantidad ${result.item.cantidad}${suffix}`,
      );
      await Promise.all([loadItems(searchTerm), loadMovimientos(filterItem?.id ?? null)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el escaneo");
    } finally {
      setScanning(false);
    }
  };

  const handleSelectItem = (item: InventarioItem | null) => {
    setFilterItem(item);
  };

  const handleSaveEdit = async (id: number, patch: InventarioItemPatch) => {
    setSavingEdit(true);
    try {
      const updated = await patchInventarioItem(id, patch);
      setItems((prev) => prev.map((row) => (row.id === id ? updated : row)));
      if (filterItem?.id === id) setFilterItem(updated);
      setScanStatus(`Ítem actualizado: ${updated.nombre || updated.codigo_barras}`);
    } finally {
      setSavingEdit(false);
    }
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
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7h16M4 12h16M4 17h10" />
                  <path d="M18 17v4M16 19h4" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className={sectionLabelOrangeClass}>Operación</p>
                <h1 className={erpHeroHeadingClass}>Inventario</h1>
                <p className={`mt-1 ${claudeBodyClass}`}>
                  Escanea códigos de barras para registrar entradas y salidas, consulta existencias y revisa el historial.
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

          <ComponentCard title="Escaneo" className="mt-4">
            <InventarioScanBar
              modo={modo}
              onModoChange={setModo}
              onScan={(code) => void handleScan(code)}
              disabled={!canCreate || scanning}
              statusMessage={scanning ? "Procesando escaneo…" : scanStatus}
            />
          </ComponentCard>

          <ComponentCard title="Ítems en inventario" className="mt-4">
            <div className="mb-4">
              <label htmlFor="inventario-search" className="sr-only">
                Buscar ítems
              </label>
              <input
                id="inventario-search"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por código, nombre, marca o modelo…"
                className={erpSearchInputClass}
              />
            </div>
            <InventarioItemsTable
              items={items}
              loading={itemsLoading}
              canEdit={canEditFicha}
              selectedItemId={filterItem?.id ?? null}
              onSelectItem={handleSelectItem}
              onEdit={setEditItem}
            />
          </ComponentCard>

          <ComponentCard title="Historial de movimientos" className="mt-4">
            <InventarioMovimientosList
              movimientos={movimientos}
              itemsById={itemsById}
              loading={movimientosLoading}
              filterItem={filterItem}
              onClearFilter={() => setFilterItem(null)}
            />
          </ComponentCard>
        </div>
      </div>

      <InventarioEditModal
        open={editItem != null}
        item={editItem}
        saving={savingEdit}
        onClose={() => setEditItem(null)}
        onSave={handleSaveEdit}
      />
    </>
  );
}
