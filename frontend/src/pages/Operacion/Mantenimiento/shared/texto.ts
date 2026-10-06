/**
 * «HUGO ENRIQUE» → «Hugo Enrique» (nombres capturados en mayúsculas). Respeta
 * textos ya mixtos y deja en mayúsculas las siglas sin vocales (MCT, SRL, CCTV).
 */
export function titleCase(value: string): string {
  const s = String(value || "").trim();
  if (!s || s !== s.toUpperCase()) return s;
  return s.replace(/\p{L}+/gu, (w) => (w.length <= 5 && !/[AEIOUÁÉÍÓÚÜ]/.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()));
}
