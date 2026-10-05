/**
 * Última lista de cuentas + índice de unidades, para pintar al instante al
 * volver a la página (memoria del módulo) o al recargar la pestaña
 * (`sessionStorage`, se borra al cerrarla). Por usuario: otra sesión en la
 * misma pestaña no ve los datos de la anterior. Luego se refresca en segundo
 * plano y se reemplaza.
 */
import type { WialonUnitSearchEntry, WialonUserRow } from "./wialonTypes";

export type CaaSnapshot = { users: WialonUserRow[]; units: WialonUnitSearchEntry[]; savedAt: number };

const PREFIX = "caa:snapshot:v1:";
/** Más viejo que esto no se muestra (se espera a Wialon). */
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

const memoria = new Map<string, CaaSnapshot>();

function clave(userKey: string | number | null | undefined): string | null {
  return userKey == null || userKey === "" ? null : `${PREFIX}${userKey}`;
}

export function leerSnapshot(userKey: string | number | null | undefined): CaaSnapshot | null {
  const k = clave(userKey);
  if (!k) return null;
  let snap = memoria.get(k) ?? null;
  if (!snap) {
    try {
      const raw = window.sessionStorage.getItem(k);
      if (raw) snap = JSON.parse(raw) as CaaSnapshot;
    } catch {
      snap = null;
    }
  }
  if (!snap || !Array.isArray(snap.users) || Date.now() - Number(snap.savedAt || 0) > MAX_AGE_MS) return null;
  memoria.set(k, snap);
  return snap;
}

export function guardarSnapshot(userKey: string | number | null | undefined, users: WialonUserRow[], units: WialonUnitSearchEntry[]): void {
  const k = clave(userKey);
  if (!k) return;
  const snap: CaaSnapshot = { users, units, savedAt: Date.now() };
  memoria.set(k, snap);
  try {
    window.sessionStorage.setItem(k, JSON.stringify(snap));
  } catch {
    // Cuota llena o almacenamiento bloqueado: basta con la memoria.
  }
}
