import { useCallback, useEffect, useMemo, useState } from "react";
import { getInventarioItem } from "@/pages/Inventario/shared/inventarioApi";
import type { InventarioItem } from "@/pages/Inventario/shared/inventarioTypes";
import type { OrdenEquipoInventarioLinea } from "../../shared/ordenesPageTypes";
import type { OrdenEquipoLineaPatch } from "../ordenEquiposDraft";
import { OrdenInventarioPicker } from "../fields/OrdenInventarioPicker";
import { OrdenEquiposSection } from "../fields/OrdenEquiposSection";

export type OrdenEquiposTabProps = {
  panelId: string;
  labelledBy: string;
  equipos: OrdenEquipoInventarioLinea[];
  isAdmin: boolean;
  isReadOnly?: boolean;
  canMarkInstalacion: boolean;
  onAddFromItem: (item: InventarioItem) => void;
  onUpdateEquipo: (lineaId: string, patch: OrdenEquipoLineaPatch, stockMax?: number) => void;
  onRemoveEquipo: (lineaId: string) => void;
  /** Stock conocido por ítem (refresco al buscar / al abrir). */
  stockByItemId?: Record<number, number>;
  onStockKnown?: (itemId: number, stock: number) => void;
};

/**
 * Pestaña Equipos: picker de inventario (admin) + seguimiento entrega/instalación.
 */
export function OrdenEquiposTab({
  panelId,
  labelledBy,
  equipos,
  isAdmin,
  isReadOnly = false,
  canMarkInstalacion,
  onAddFromItem,
  onUpdateEquipo,
  onRemoveEquipo,
  stockByItemId: stockByItemIdProp,
  onStockKnown,
}: OrdenEquiposTabProps) {
  const [localStock, setLocalStock] = useState<Record<number, number>>({});
  const canAdminMutate = isAdmin && !isReadOnly;

  const stockByItemId = { ...localStock, ...stockByItemIdProp };

  const itemIdsKey = useMemo(() => {
    const ids = [...new Set(equipos.map((e) => e.inventarioItemId).filter((id) => id > 0))];
    ids.sort((a, b) => a - b);
    return ids.join(",");
  }, [equipos]);

  useEffect(() => {
    if (!itemIdsKey) return;
    const ids = itemIdsKey.split(",").map(Number).filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length === 0) return;

    let cancelled = false;
    (async () => {
      const updates: Record<number, number> = {};
      await Promise.all(
        ids.map(async (id) => {
          try {
            const item = await getInventarioItem(id);
            updates[id] = Math.max(0, Math.floor(Number(item.cantidad) || 0));
          } catch (err) {
            // Sin inventario.view o ítem borrado: omitir badge (no bloquear la pestaña).
            console.error("No se pudo refrescar stock del ítem", id, err);
          }
        }),
      );
      if (cancelled || Object.keys(updates).length === 0) return;
      setLocalStock((prev) => ({ ...prev, ...updates }));
      for (const [idStr, stock] of Object.entries(updates)) {
        onStockKnown?.(Number(idStr), stock);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [itemIdsKey, onStockKnown]);

  const handlePick = useCallback(
    (item: InventarioItem) => {
      const stock = Math.max(0, Math.floor(Number(item.cantidad) || 0));
      setLocalStock((prev) => ({ ...prev, [item.id]: stock }));
      onStockKnown?.(item.id, stock);
      onAddFromItem(item);
    },
    [onAddFromItem, onStockKnown],
  );

  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={labelledBy}
      className="space-y-5"
    >
      {canAdminMutate ? <OrdenInventarioPicker onPick={handlePick} /> : null}
      <OrdenEquiposSection
        equipos={equipos}
        isAdmin={isAdmin}
        canAdminMutate={canAdminMutate}
        canMarkInstalacion={canMarkInstalacion}
        stockByItemId={stockByItemId}
        onUpdateEquipo={onUpdateEquipo}
        onRemoveEquipo={onRemoveEquipo}
      />
      {!isAdmin && !canMarkInstalacion && equipos.length > 0 ? (
        <p className="text-xs text-[#78716c] dark:text-[#8ea0b8]" role="status">
          Solo puedes consultar el estado de los equipos en esta orden.
        </p>
      ) : null}
    </div>
  );
}
