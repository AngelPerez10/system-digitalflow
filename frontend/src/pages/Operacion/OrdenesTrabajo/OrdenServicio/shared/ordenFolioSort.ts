/**
 * Folio más nuevo primero (`idx` desc). Desempate por `id`.
 * Criterio único del listado de órdenes (admin y técnico).
 */
export function sortOrdenesByFolio<T extends { idx?: number | null; id?: number | null }>(
  list: T[],
): T[] {
  return list.slice().sort((a, b) => {
    const ai = Number(a.idx ?? 0);
    const bi = Number(b.idx ?? 0);
    if (bi !== ai) return bi - ai;
    return Number(b.id || 0) - Number(a.id || 0);
  });
}
