import { fetchApi } from "@/config/api";
import type { Orden } from "./ordenesPageTypes";

/** Tamaño de página al pedir el listado paginado (opt-in) del backend. */
export const ORDENES_PAGE_SIZE = 200;
/** Tope de páginas por mes: 200 × 50 = 10 000 órdenes, defensa ante un bucle. */
const MAX_PAGES = 50;

type ListEnvelope = { results?: unknown; next?: unknown };

function readPayload(data: unknown): { rows: Orden[]; paginado: boolean; hayMas: boolean } {
  // Backend antiguo (o `pagination_class` desactivada): array plano.
  if (Array.isArray(data)) {
    return { rows: data as Orden[], paginado: false, hayMas: false };
  }
  // Backend con `OrdenOptInPagination`: sobre { count, next, previous, results }.
  const env = (data ?? {}) as ListEnvelope;
  if (Array.isArray(env.results)) {
    return { rows: env.results as Orden[], paginado: true, hayMas: env.next != null };
  }
  return { rows: [], paginado: false, hayMas: false };
}

export class OrdenesFetchError extends Error {
  status: number;
  constructor(status: number) {
    super(`No se pudo cargar órdenes (HTTP ${status})`);
    this.name = "OrdenesFetchError";
    this.status = status;
  }
}

/**
 * Trae **todas** las órdenes de un mes.
 *
 * Contra el backend paginado (`?page`), pide páginas de {@link ORDENES_PAGE_SIZE}
 * y sigue `next` hasta agotar; contra el backend antiguo (array plano) usa la
 * única respuesta. En ambos casos devuelve el dataset completo del mes: el
 * filtrado, la búsqueda y las estadísticas siguen calculándose en cliente sobre
 * ese conjunto. La ganancia es que ninguna respuesta individual carga miles de
 * filas de golpe (serialización acotada, sin riesgo de timeout en Render).
 *
 * Para un mes normal (decenas de órdenes) es una sola petición, igual que antes.
 *
 * Lanza {@link OrdenesFetchError} si falla la **primera** página; si fallan las
 * siguientes devuelve lo acumulado (mejor parcial que nada).
 */
export async function fetchOrdenesMes(
  mes: string,
  opts: { signal?: AbortSignal; arrastreAbiertas?: boolean } = {},
): Promise<Orden[]> {
  const acc: Orden[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const params = new URLSearchParams({
      mes,
      page: String(page),
      page_size: String(ORDENES_PAGE_SIZE),
      _ts: String(Date.now()),
    });
    if (opts.arrastreAbiertas) {
      params.set("arrastre_abiertas", "1");
    }

    const res = await fetchApi(`/api/ordenes/?${params.toString()}`, {
      cache: "no-store" as RequestCache,
      ...(opts.signal ? { signal: opts.signal } : {}),
    });

    if (!res.ok) {
      if (page === 1) throw new OrdenesFetchError(res.status);
      break;
    }

    const { rows, paginado, hayMas } = readPayload(await res.json());
    acc.push(...rows);

    if (!paginado || !hayMas || rows.length === 0) break;
  }

  return acc;
}
