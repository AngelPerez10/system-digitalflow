import type { WialonUserRow } from "./wialonTypes";

/** Devuelve la inicial del nombre de una cuenta (usado en avatares). */
export function accountInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.slice(0, 1).toUpperCase();
}

/** Normaliza claves de cuenta para emparejar creador / padre / login. */
export function accountKey(value: string | null | undefined): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Cuentas espejo / hijas: las creó esta cuenta o cuelgan de su cuenta padre.
 * Prioriza creator_id (crt) y cae a comparación por login/nombre.
 */
export function findMirrorAccounts(
  current: WialonUserRow,
  allUsers: WialonUserRow[],
): WialonUserRow[] {
  const selfId = Number(current.wialon_id);
  const keys = new Set(
    [current.user_id, current.name]
      .map(accountKey)
      .filter((k) => k && k !== "—"),
  );

  return allUsers
    .filter((row) => {
      if (Number(row.wialon_id) === selfId) return false;

      const creatorId = row.creator_id != null ? Number(row.creator_id) : null;
      if (creatorId != null && creatorId === selfId) return true;

      if (keys.size === 0) return false;
      const creator = accountKey(row.creator);
      const parent = accountKey(row.parent_account);
      return (creator !== "" && keys.has(creator)) || (parent !== "" && keys.has(parent));
    })
    .sort((a, b) => {
      const aBlocked = a.status === "Bloqueado" ? 0 : 1;
      const bBlocked = b.status === "Bloqueado" ? 0 : 1;
      if (aBlocked !== bBlocked) return aBlocked - bBlocked;
      return (a.name || a.user_id || "").localeCompare(b.name || b.user_id || "", "es", {
        sensitivity: "base",
      });
    });
}
