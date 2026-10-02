/** Convierte el cuerpo de error de DRF en texto legible (respaldo genérico). */
export const formatApiErrors = (txt: string): string => {
  if (!txt) return "";
  try {
    const data = JSON.parse(txt);
    if (data && typeof data === "object") {
      const detail = typeof (data as { detail?: unknown }).detail === "string"
        ? String((data as { detail: string }).detail)
        : "";
      if (/csrf/i.test(detail)) {
        return "La sesión no pudo validarse (CSRF). Cierra sesión, vuelve a entrar e intenta de nuevo.";
      }
      return Object.entries(data)
        .map(([k, v]) => {
          if (Array.isArray(v)) return `${k}: ${v.join(", ")}`;
          if (typeof v === "string") return `${k}: ${v}`;
          return `${k}: ${JSON.stringify(v)}`;
        })
        .join("\n");
    }
  } catch {
    // ignore
  }
  return txt;
};
