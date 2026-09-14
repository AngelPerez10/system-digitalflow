/**
 * URL de firma del encargado para el pad (modal).
 * El listado no trae firma; el detalle sí. El perfil se pide aparte y puede
 * llegar antes — no hay que dejar el pad vacío si ya hay URL en la orden.
 */
export function toHttpsImageUrl(url: unknown): string {
  const raw = typeof url === "string" ? url.trim() : "";
  if (!raw) return "";
  if (raw.startsWith("http://")) return `https://${raw.slice("http://".length)}`;
  return raw;
}

export function pickTecnicoSignatureDisplayUrl(opts: {
  tecnicoAsignadoId: number | null | undefined;
  fetchedProfileUrl?: string | null;
  storedOrdenUrl?: string | null;
}): string {
  if (opts.tecnicoAsignadoId == null || !Number.isFinite(Number(opts.tecnicoAsignadoId))) {
    return "";
  }
  return toHttpsImageUrl(opts.fetchedProfileUrl) || toHttpsImageUrl(opts.storedOrdenUrl);
}

/** Si el técnico no cambió, no hay que vaciar la firma al rehidratar el formulario. */
export function shouldClearFetchedSignature(
  previousTecnicoId: number | null,
  nextTecnicoId: number | null,
): boolean {
  return previousTecnicoId !== nextTecnicoId;
}
