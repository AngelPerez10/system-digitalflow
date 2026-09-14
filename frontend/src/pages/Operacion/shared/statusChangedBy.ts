const UNKNOWN_ACTOR = "Autor no registrado";

/** Iniciales cortas para el avatar de auditoría (máx. 2 letras). */
export function initialsFromDisplayName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function resolveStatusChangedByName(
  fullName?: string | null,
  username?: string | null,
): string {
  return String(fullName || "").trim() || String(username || "").trim();
}

/** Resuelve nombre/fecha de auditoría; usa fallback (p. ej. creador) si aún no hay sello. */
export function resolveStatusAudit({
  name,
  at,
  fallbackName,
  fallbackAt,
}: {
  name?: string | null;
  at?: string | null;
  fallbackName?: string | null;
  fallbackAt?: string | null;
}): { name: string; at: string; fromFallback: boolean } | null {
  const primaryName = String(name || "").trim();
  const primaryAt = String(at || "").trim();
  if (primaryName || primaryAt) {
    return { name: primaryName, at: primaryAt, fromFallback: false };
  }
  const fbName = String(fallbackName || "").trim();
  const fbAt = String(fallbackAt || "").trim();
  if (fbName || fbAt) {
    return { name: fbName, at: fbAt, fromFallback: true };
  }
  return null;
}

export { UNKNOWN_ACTOR };
