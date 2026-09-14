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

/** Creador, o último editor si no hay creador. */
export function resolveOrdenStatusFallbackName(orden: {
  creado_por_full_name?: string | null;
  creado_por_username?: string | null;
  actualizado_por_full_name?: string | null;
  actualizado_por_username?: string | null;
}): string {
  return (
    resolveStatusChangedByName(orden.creado_por_full_name, orden.creado_por_username) ||
    resolveStatusChangedByName(orden.actualizado_por_full_name, orden.actualizado_por_username)
  );
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
  const fbName = String(fallbackName || "").trim();
  const fbAt = String(fallbackAt || "").trim();
  // Fecha de status sin persona (alta o filas previas a status_changed_by):
  // no es un sello de autor. Usar creador/editor y marcar fallback.
  if (primaryName) {
    return { name: primaryName, at: primaryAt, fromFallback: false };
  }
  if (fbName) {
    return { name: fbName, at: primaryAt || fbAt, fromFallback: true };
  }
  if (primaryAt) {
    return { name: "", at: primaryAt, fromFallback: false };
  }
  if (fbAt) {
    return { name: "", at: fbAt, fromFallback: true };
  }
  return null;
}

export { UNKNOWN_ACTOR };
