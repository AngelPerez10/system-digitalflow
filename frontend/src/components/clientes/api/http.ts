/** Utilidades HTTP comunes de la capa `api/` de clientes. */
import { fetchApi } from "@/config/api";
import { formatApiErrors } from "./apiErrors";

/** DRF responde lista plana o paginada (`{ results }`): siempre devuelve arreglo. */
export function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const results = (data as { results?: unknown } | null)?.results;
  return Array.isArray(results) ? (results as T[]) : [];
}

type JsonRequest = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  /** Mensaje si el servidor no explica el error. */
  fallbackError: string;
};

/**
 * Petición JSON que lanza `Error` con un mensaje legible si la respuesta no es
 * 2xx. Devuelve `null` en respuestas sin cuerpo (p. ej. 204 de DELETE).
 */
export async function requestJson<T>(path: string, { method = "GET", body, signal, fallbackError }: JsonRequest): Promise<T> {
  const res = await fetchApi(path, {
    method,
    signal,
    cache: method === "GET" ? ("no-store" as RequestCache) : undefined,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    if (res.status === 403) throw new Error("No tienes permiso para realizar esta acción.");
    const txt = await res.text().catch(() => "");
    throw new Error(formatApiErrors(txt) || fallbackError);
  }
  if (res.status === 204) return null as T;
  return (await res.json().catch(() => null)) as T;
}
