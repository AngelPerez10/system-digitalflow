/** Fecha y hora locales (es-MX) desde ISO; metadatos de auditoría en listados. */
export function formatIsoDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
}

/** Autorizadas ÷ (Autorizadas + Pendientes) por conteo; ignora canceladas. */
export function computeTasaCierreMensual(
  autorizadas: number,
  pendientes: number,
): number | null {
  const a = Number.isFinite(autorizadas) ? Math.max(0, autorizadas) : 0;
  const p = Number.isFinite(pendientes) ? Math.max(0, pendientes) : 0;
  const denom = a + p;
  if (denom <= 0) return null;
  return Math.min(100, Math.max(0, (a / denom) * 100));
}

/** Color + nivel textual (no solo color) según el %. Rojo / ámbar / verde por umbral. */
export function tasaCierreVisual(tasa: number | null): {
  color: string;
  nivel: "sin-datos" | "baja" | "media" | "alta";
  nivelLabel: string;
} {
  if (tasa == null) {
    return {
      color: "rgba(255,255,255,0.35)",
      nivel: "sin-datos",
      nivelLabel: "Sin datos",
    };
  }
  const nivel = tasa < 40 ? "baja" : tasa < 70 ? "media" : "alta";
  const nivelLabel = nivel === "baja" ? "Baja" : nivel === "media" ? "Media" : "Alta";
  // Colores fijos por nivel. Media en ámbar: legible sobre el header azul oscuro.
  const color =
    nivel === "baja"
      ? "rgb(248 113 113)" // rose-400
      : nivel === "media"
        ? "rgb(251 191 36)" // amber-400
        : "rgb(74 222 128)"; // green-400
  return { color, nivel, nivelLabel };
}
