export const COTIZACION_LIST_PATH = "/cotizacion";
export const COTIZACION_LIST_SEARCH_PARAM = "q";
export const COTIZACION_LIST_SEARCH_STATE_KEY = "listSearch";

const STORAGE_KEY = "cotizaciones.listSearch";

export function readCotizacionListSearch(): string {
  try {
    return String(sessionStorage.getItem(STORAGE_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function writeCotizacionListSearch(q: string): void {
  try {
    const trimmed = String(q || "").trim();
    if (trimmed) sessionStorage.setItem(STORAGE_KEY, trimmed);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // sessionStorage puede fallar en modo privado
  }
}

export function listSearchFromLocationState(state: unknown): string {
  if (!state || typeof state !== "object") return "";
  const raw = (state as Record<string, unknown>)[COTIZACION_LIST_SEARCH_STATE_KEY];
  return typeof raw === "string" ? raw.trim() : "";
}

export function cotizacionListPath(search?: string): string {
  const q = String(search ?? readCotizacionListSearch()).trim();
  if (!q) return COTIZACION_LIST_PATH;
  return `${COTIZACION_LIST_PATH}?${COTIZACION_LIST_SEARCH_PARAM}=${encodeURIComponent(q)}`;
}

export function cotizacionListSearchState(search: string): { [COTIZACION_LIST_SEARCH_STATE_KEY]: string } {
  return { [COTIZACION_LIST_SEARCH_STATE_KEY]: String(search || "").trim() };
}
