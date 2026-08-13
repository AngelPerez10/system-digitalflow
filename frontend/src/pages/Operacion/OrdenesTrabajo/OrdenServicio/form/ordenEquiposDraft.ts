import type { InventarioItem } from "@/pages/Inventario/shared/inventarioTypes";
import type {
  OrdenEquipoEstadoInstalacion,
  OrdenEquipoInventarioLinea,
} from "../shared/ordenesPageTypes";

const INSTALL_STATES = new Set<OrdenEquipoEstadoInstalacion>(["no_instalado", "instalado"]);

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function asPositiveInt(value: unknown, fallback = 1): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.floor(n));
}

/** Snapshot de un ítem de inventario como línea de equipos de la orden. */
export function createEquipoLineaFromItem(item: InventarioItem): OrdenEquipoInventarioLinea {
  return {
    lineaId: crypto.randomUUID(),
    inventarioItemId: Number(item.id),
    codigoBarras: asTrimmedString(item.codigo_barras),
    nombre: asTrimmedString(item.nombre),
    marca: asTrimmedString(item.marca),
    modelo: asTrimmedString(item.modelo),
    imagenUrl: asTrimmedString(item.imagen_url),
    cantidad: 1,
    equipoEntregado: false,
    estadoInstalacion: "no_instalado",
    movimientoSalidaId: null,
  };
}

/**
 * Agrega o incrementa cantidad (clamp al stock del ítem) — una línea por inventarioItemId.
 */
export function addEquipoFromItem(
  equipos: OrdenEquipoInventarioLinea[],
  item: InventarioItem,
): OrdenEquipoInventarioLinea[] {
  const itemId = Number(item.id);
  const stock = Math.max(0, Math.floor(Number(item.cantidad) || 0));
  const existingIdx = equipos.findIndex((e) => e.inventarioItemId === itemId);

  if (existingIdx >= 0) {
    const next = equipos.slice();
    const row = next[existingIdx];
    const maxQty = stock > 0 ? stock : row.cantidad + 1;
    next[existingIdx] = {
      ...row,
      cantidad: Math.min(row.cantidad + 1, maxQty),
      // Refresh snapshot labels from latest item lookup
      codigoBarras: asTrimmedString(item.codigo_barras) || row.codigoBarras,
      nombre: asTrimmedString(item.nombre) || row.nombre,
      marca: asTrimmedString(item.marca) || row.marca,
      modelo: asTrimmedString(item.modelo) || row.modelo,
      imagenUrl: asTrimmedString(item.imagen_url) || row.imagenUrl,
    };
    return next;
  }

  const linea = createEquipoLineaFromItem(item);
  if (stock > 0) {
    linea.cantidad = Math.min(1, stock);
  }
  return [...equipos, linea];
}

export type OrdenEquipoLineaPatch = Partial<
  Pick<
    OrdenEquipoInventarioLinea,
    "cantidad" | "equipoEntregado" | "estadoInstalacion" | "nombre" | "marca" | "modelo" | "imagenUrl"
  >
>;

/** Actualiza una línea; nunca muta `movimientoSalidaId` desde el cliente. */
export function updateEquipoLinea(
  equipos: OrdenEquipoInventarioLinea[],
  lineaId: string,
  patch: OrdenEquipoLineaPatch,
  opts?: { stockMax?: number },
): OrdenEquipoInventarioLinea[] {
  return equipos.map((row) => {
    if (row.lineaId !== lineaId) return row;
    const next: OrdenEquipoInventarioLinea = { ...row };

    if (patch.cantidad != null && !row.equipoEntregado) {
      let qty = asPositiveInt(patch.cantidad, row.cantidad);
      if (opts?.stockMax != null && opts.stockMax > 0) {
        qty = Math.min(qty, opts.stockMax);
      }
      next.cantidad = qty;
    }
    if (typeof patch.equipoEntregado === "boolean") {
      next.equipoEntregado = patch.equipoEntregado;
    }
    if (patch.estadoInstalacion && INSTALL_STATES.has(patch.estadoInstalacion)) {
      next.estadoInstalacion = patch.estadoInstalacion;
    }
    if (patch.nombre != null) next.nombre = asTrimmedString(patch.nombre);
    if (patch.marca != null) next.marca = asTrimmedString(patch.marca);
    if (patch.modelo != null) next.modelo = asTrimmedString(patch.modelo);
    if (patch.imagenUrl != null) next.imagenUrl = asTrimmedString(patch.imagenUrl);

    return next;
  });
}

export function removeEquipoLinea(
  equipos: OrdenEquipoInventarioLinea[],
  lineaId: string,
): OrdenEquipoInventarioLinea[] {
  return equipos.filter((e) => e.lineaId !== lineaId);
}

/**
 * Payload de escritura alineado al BE: no-admin solo puede cambiar
 * `estadoInstalacion` sobre la membresía/qty/entrega del baseline cargado.
 * En create (baseline vacío) → lista vacía.
 */
export function filterEquiposForWritePayload(opts: {
  isAdmin: boolean;
  draft: unknown;
  baseline?: unknown;
}): OrdenEquipoInventarioLinea[] {
  const draftNorm = normalizeEquiposInventario(opts.draft);
  if (opts.isAdmin) return draftNorm;

  const baselineNorm = normalizeEquiposInventario(opts.baseline);
  if (baselineNorm.length === 0) return [];

  const draftByLinea = new Map(draftNorm.map((row) => [row.lineaId, row]));
  const draftByItem = new Map(draftNorm.map((row) => [row.inventarioItemId, row]));

  return baselineNorm.map((base) => {
    const fromDraft = draftByLinea.get(base.lineaId) ?? draftByItem.get(base.inventarioItemId);
    if (!fromDraft || !INSTALL_STATES.has(fromDraft.estadoInstalacion)) return base;
    return { ...base, estadoInstalacion: fromDraft.estadoInstalacion };
  });
}

/** Normaliza el JSON del servidor / draft al shape tipado. */
export function normalizeEquiposInventario(raw: unknown): OrdenEquipoInventarioLinea[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const out: OrdenEquipoInventarioLinea[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const inventarioItemId = Number(row.inventarioItemId ?? row.inventario_item_id);
    if (!Number.isFinite(inventarioItemId) || inventarioItemId <= 0) continue;
    if (seen.has(inventarioItemId)) continue;
    seen.add(inventarioItemId);

    const estadoRaw = asTrimmedString(row.estadoInstalacion ?? row.estado_instalacion);
    const estadoInstalacion: OrdenEquipoEstadoInstalacion =
      estadoRaw === "instalado" ? "instalado" : "no_instalado";

    const movRaw = row.movimientoSalidaId ?? row.movimiento_salida_id;
    let movimientoSalidaId: number | null = null;
    if (movRaw != null && movRaw !== "") {
      const n = Number(movRaw);
      if (Number.isFinite(n) && n > 0) movimientoSalidaId = n;
    }

    const lineaId =
      asTrimmedString(row.lineaId ?? row.linea_id) ||
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `linea-${inventarioItemId}-${out.length}`);

    out.push({
      lineaId,
      inventarioItemId,
      codigoBarras: asTrimmedString(row.codigoBarras ?? row.codigo_barras),
      nombre: asTrimmedString(row.nombre),
      marca: asTrimmedString(row.marca),
      modelo: asTrimmedString(row.modelo),
      imagenUrl: asTrimmedString(row.imagenUrl ?? row.imagen_url),
      cantidad: asPositiveInt(row.cantidad, 1),
      equipoEntregado: Boolean(row.equipoEntregado ?? row.equipo_entregado),
      estadoInstalacion,
      movimientoSalidaId,
    });
  }

  return out;
}
