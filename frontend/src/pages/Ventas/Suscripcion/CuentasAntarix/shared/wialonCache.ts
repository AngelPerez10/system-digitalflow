import type { WialonHwType, WialonAccessUser, WialonUnitRow } from "./wialonTypes";

export const CATALOGS_TTL_MS = 10 * 60 * 1000;
export const UNITS_TTL_MS = 45 * 1000;

export type WialonCatalogsCache = {
  hwTypes: WialonHwType[];
  accessUsers: WialonAccessUser[];
  loadedAt: number;
};

/** Caché de catálogos (tipos de HW + usuarios de acceso). Se renueva cada CATALOGS_TTL_MS. */
let _catalogsCache: WialonCatalogsCache | null = null;

export function getCatalogsCache(): WialonCatalogsCache | null {
  return _catalogsCache;
}

export function setCatalogsCache(c: WialonCatalogsCache | null) {
  _catalogsCache = c;
}

/** Caché de unidades por usuario (se renueva cada UNITS_TTL_MS). */
const unitsByUserCache = new Map<number, { units: WialonUnitRow[]; loadedAt: number }>();

export function rememberUnits(userId: number, units: WialonUnitRow[]) {
  unitsByUserCache.set(userId, { units, loadedAt: Date.now() });
}

export function cachedUnits(userId: number, maxAgeMs = UNITS_TTL_MS): WialonUnitRow[] | null {
  const hit = unitsByUserCache.get(userId);
  if (!hit) return null;
  if (Date.now() - hit.loadedAt > maxAgeMs) return null;
  return hit.units;
}

export function getUnitsByUserCacheEntry(
  userId: number,
): { units: WialonUnitRow[]; loadedAt: number } | undefined {
  return unitsByUserCache.get(userId);
}
