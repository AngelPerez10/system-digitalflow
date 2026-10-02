/**
 * Estado del listado que vive en la URL (`?q=…&tipo=…&orden=…&page=…`) y su
 * traducción a la API `/api/clientes/`. Todo es puro y validado: un valor
 * desconocido en la URL nunca llega al backend.
 */
import type { ClienteTipo } from "@/components/clientes/domain";
import { parseFilterTipos, tiposQueryValue } from "./clientesListFilters";

export const CLIENTES_PAGE_SIZE = 25;
export const SEARCH_MAX_LENGTH = 120;

export const ORDEN_OPTIONS = [
  { value: "recientes", label: "Más recientes", ordering: "-fecha_creacion" },
  { value: "nombre", label: "Nombre (A–Z)", ordering: "nombre" },
  { value: "-nombre", label: "Nombre (Z–A)", ordering: "-nombre" },
  { value: "registro", label: "Número de registro", ordering: "idx" },
] as const;

export type ClientesOrden = (typeof ORDEN_OPTIONS)[number]["value"];

/** Mismo orden que el backend usa por omisión (`idx`). */
export const DEFAULT_ORDEN: ClientesOrden = "registro";

export type ClientesListQuery = {
  q: string;
  tipos: ClienteTipo[];
  orden: ClientesOrden;
  page: number;
};

export function parseOrden(raw: string | null): ClientesOrden {
  return ORDEN_OPTIONS.find((o) => o.value === raw)?.value ?? DEFAULT_ORDEN;
}

export function parsePage(raw: string | null): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export function normalizeSearch(raw: string | null | undefined): string {
  return String(raw ?? "").trim().slice(0, SEARCH_MAX_LENGTH);
}

export function parseClientesListQuery(params: URLSearchParams): ClientesListQuery {
  return {
    q: normalizeSearch(params.get("q")),
    tipos: parseFilterTipos(params),
    orden: parseOrden(params.get("orden")),
    page: parsePage(params.get("page")),
  };
}

/** Escribe el estado en la URL omitiendo los valores por omisión (URLs limpias). */
export function writeClientesListQuery(base: URLSearchParams, next: ClientesListQuery): URLSearchParams {
  const params = new URLSearchParams(base);
  const set = (key: string, value: string | null) => (value ? params.set(key, value) : params.delete(key));
  set("q", normalizeSearch(next.q) || null);
  set("tipo", tiposQueryValue(next.tipos));
  set("orden", next.orden === DEFAULT_ORDEN ? null : next.orden);
  set("page", next.page > 1 ? String(next.page) : null);
  return params;
}

export function buildClientesApiParams(query: ClientesListQuery): URLSearchParams {
  const ordering = ORDEN_OPTIONS.find((o) => o.value === query.orden)?.ordering ?? "idx";
  const params = new URLSearchParams({
    page: String(query.page),
    page_size: String(CLIENTES_PAGE_SIZE),
    ordering,
  });
  if (query.q) params.set("search", query.q);
  const tipo = tiposQueryValue(query.tipos);
  if (tipo) params.set("tipo", tipo);
  return params;
}

export function totalPages(count: number): number {
  return Math.max(1, Math.ceil(count / CLIENTES_PAGE_SIZE));
}

/**
 * Páginas a mostrar con huecos: `[1, "gap", 4, 5, 6, "gap", 12]`.
 * Siempre incluye primera, última y `siblings` a cada lado de la actual.
 */
export function paginationRange(current: number, total: number, siblings = 1): (number | "gap")[] {
  if (total <= 0) return [];
  const windowSize = siblings * 2 + 5; // primera, última, actual, vecinas y dos huecos
  if (total <= windowSize) return Array.from({ length: total }, (_, i) => i + 1);

  const page = Math.min(Math.max(current, 1), total);
  const left = Math.max(page - siblings, 2);
  const right = Math.min(page + siblings, total - 1);
  const out: (number | "gap")[] = [1];
  if (left > 2) out.push("gap");
  for (let p = left; p <= right; p++) out.push(p);
  if (right < total - 1) out.push("gap");
  out.push(total);
  return out;
}
