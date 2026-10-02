/**
 * Enlaces externos a partir de datos capturados por usuarios. Puro y probado.
 *
 * El texto libre nunca se usa tal cual como `href`: solo se construyen
 * `tel:`, `mailto:` y URLs de Google Maps validadas.
 */

/** Liga real de Google Maps (`google.com/maps…` o `maps.app.goo.gl`), solo http(s). */
export const isGoogleMapsLink = (value: string | null | undefined) => {
  if (!value) return false;
  const s = String(value).trim();
  if (!s) return false;
  if (!(s.startsWith("http://") || s.startsWith("https://"))) return false;
  try {
    const u = new URL(s);
    const host = (u.hostname || "").toLowerCase();
    if (host === "maps.app.goo.gl") return true;
    // `google.com` exacto o subdominio real (`maps.google.com`); `evilgoogle.com` NO.
    const isGoogleHost = host === "google.com" || host.endsWith(".google.com");
    if (isGoogleHost && u.pathname.toLowerCase().startsWith("/maps")) return true;
    return false;
  } catch {
    return false;
  }
};

/** `tel:+526621234567` solo si hay entre 7 y 15 dígitos (E.164); si no, `null`. */
export function telHref(raw: string | null | undefined): string | null {
  const s = String(raw ?? "").trim();
  const digits = s.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return `tel:${s.startsWith("+") ? "+" : ""}${digits}`;
}

// Sin `?`, `&`, `#` ni `%`: en un `mailto:` abrirían campos extra (`?cc=`, `&body=`).
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"?&#%]+@[^\s@<>()[\]\\,;:"?&#%]+\.[^\s@<>()[\]\\,;:"?&#%]{2,}$/;

export function isValidEmail(raw: string | null | undefined): boolean {
  const s = String(raw ?? "").trim();
  return s.length > 0 && s.length <= 254 && EMAIL_RE.test(s);
}

/** `mailto:` solo para un correo con forma válida. */
export function mailHref(raw: string | null | undefined): string | null {
  const s = String(raw ?? "").trim();
  return isValidEmail(s) ? `mailto:${s}` : null;
}

/** Lee «lat, lng» o `?q=lat,lng` de un texto; `null` si no hay coordenadas válidas. */
export function parseCoords(raw: string | null | undefined): { lat: number; lng: number } | null {
  const s = String(raw ?? "");
  const m = s.match(/(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function mapsUrlForCoords({ lat, lng }: { lat: number; lng: number }): string {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/**
 * URL de Google Maps para un domicilio: la liga tal cual si ya es de Maps,
 * coordenadas si las trae, o una búsqueda del texto. `null` si está vacío.
 */
export function mapsUrlFor(direccion: string | null | undefined): string | null {
  const s = String(direccion ?? "").trim();
  if (!s) return null;
  if (isGoogleMapsLink(s)) return s;
  const coords = parseCoords(s);
  if (coords) return mapsUrlForCoords(coords);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.slice(0, 300))}`;
}
