/**
 * Folios de negocio Intrax: SERIE-número (COT / ODT / PRJ).
 * El número sigue siendo el `idx` interno; el prefijo es solo etiqueta visible.
 */

export const FOLIO_SERIE = {
  cotizacion: "COT",
  orden: "ODT",
  proyecto: "PRJ",
  poliza: "POL",
} as const;

export type DocumentFolioSerie = (typeof FOLIO_SERIE)[keyof typeof FOLIO_SERIE];

const PREFIXED_FOLIO_RE = /^([A-Za-z]{3})-(\d+)$/;

export function formatDocumentFolio(
  serie: DocumentFolioSerie | string,
  n: number | string | null | undefined,
  empty = "—"
): string {
  if (n == null || n === "") return empty;
  const num = typeof n === "number" ? n : Number(String(n).replace(/\D/g, ""));
  if (!Number.isFinite(num) || num <= 0) {
    const raw = String(n).trim();
    return raw || empty;
  }
  const s = String(serie || "").trim().toUpperCase() || "DOC";
  return `${s}-${Math.trunc(num)}`;
}

/** Si `folio` ya es SERIE-n, se respeta; si no, formatea con la serie dada y `idx`. */
export function resolveDocumentFolio(
  serie: DocumentFolioSerie | string,
  folio: string | null | undefined,
  idx: number | string | null | undefined,
  empty = "—"
): string {
  const existing = String(folio ?? "").trim();
  if (existing && PREFIXED_FOLIO_RE.test(existing)) {
    const m = existing.match(PREFIXED_FOLIO_RE)!;
    return `${m[1].toUpperCase()}-${m[2]}`;
  }
  if (existing && !/^\d+$/.test(existing)) {
    // Folio libre no numérico (legado): mostrar tal cual.
    return existing;
  }
  const fromExistingDigits = existing && /^\d+$/.test(existing) ? existing : idx;
  return formatDocumentFolio(serie, fromExistingDigits, empty);
}

export function parseDocumentFolio(input: string): { serie?: string; n?: number } {
  const raw = String(input || "").trim().replace(/^#/, "");
  if (!raw) return {};
  const m = raw.match(PREFIXED_FOLIO_RE);
  if (m) {
    return { serie: m[1].toUpperCase(), n: Number(m[2]) };
  }
  const digits = raw.replace(/\D/g, "");
  if (digits) return { n: Number(digits) };
  return {};
}

/** true si haystack (folio o idx) coincide con query flexible. */
export function matchesDocumentFolio(
  haystack: string | number | null | undefined,
  query: string
): boolean {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  const h = String(haystack ?? "").trim().toLowerCase();
  if (!h) return false;
  if (h.includes(q) || h.replace(/^#/, "").includes(q.replace(/^#/, ""))) return true;

  const pq = parseDocumentFolio(q);
  const ph = parseDocumentFolio(h);
  if (pq.n != null && ph.n != null && pq.n === ph.n) {
    if (!pq.serie || !ph.serie) return true;
    return pq.serie === ph.serie;
  }
  if (pq.n != null && h === String(pq.n)) return true;
  return false;
}
