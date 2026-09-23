import { fetchApi } from "@/config/api";

export type CotizacionOcupadaInfo = {
  id: number;
  folio: string;
};

export type CotizacionesOcupadasResponse = {
  ids: string[];
  by_id: Record<string, CotizacionOcupadaInfo>;
};

/** GET /api/proyectos/cotizaciones-ocupadas/ */
export async function fetchCotizacionesOcupadas(
  excludeProyectoId?: number | null
): Promise<{ byId: Record<string, CotizacionOcupadaInfo>; error: string }> {
  const params = new URLSearchParams();
  if (excludeProyectoId != null && Number.isFinite(excludeProyectoId) && excludeProyectoId > 0) {
    params.set("exclude_proyecto_id", String(excludeProyectoId));
  }
  const qs = params.toString();
  const url = qs
    ? `/api/proyectos/cotizaciones-ocupadas/?${qs}`
    : "/api/proyectos/cotizaciones-ocupadas/";

  try {
    const res = await fetchApi(url);
    if (!res.ok) {
      return { byId: {}, error: "No se pudo cargar qué cotizaciones ya están en uso." };
    }
    const data = (await res.json()) as CotizacionesOcupadasResponse;
    const byId =
      data?.by_id && typeof data.by_id === "object" ? data.by_id : {};
    return { byId, error: "" };
  } catch {
    return { byId: {}, error: "No se pudo cargar qué cotizaciones ya están en uso." };
  }
}
