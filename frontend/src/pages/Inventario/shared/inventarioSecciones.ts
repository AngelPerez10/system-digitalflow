/** Secciones fijas de inventario (mismas slugs que el backend). */
export type InventarioSeccionSlug =
  | "audio_video_profesional"
  | "automatizacion_intrusion"
  | "cableado_estructurado"
  | "control_acceso"
  | "deteccion_fuego"
  | "energia_climatizacion"
  | "gps_telematica"
  | "herramientas_ferreteria"
  | "industria_bms_robots"
  | "radiocomunicacion"
  | "redes_it"
  | "videovigilancia";

export type InventarioSeccionFiltro = "todas" | "sin" | InventarioSeccionSlug;

/** Tono visual del badge / chip (no es un color hex; se mapea en estilos). */
export type InventarioSeccionTono =
  | "neutral"
  | "amber"
  | "rose"
  | "emerald"
  | "sky"
  | "violet"
  | "slate"
  | "orange";

export type InventarioSeccionMeta = {
  slug: InventarioSeccionSlug;
  label: string;
  /** Etiqueta corta para chips en móvil / rail denso. */
  shortLabel: string;
  tono: InventarioSeccionTono;
};

export const INVENTARIO_SECCIONES: ReadonlyArray<InventarioSeccionMeta> = [
  {
    slug: "audio_video_profesional",
    label: "Audio y video profesional",
    shortLabel: "AV Pro",
    tono: "violet",
  },
  {
    slug: "automatizacion_intrusion",
    label: "Automatización e Intrusión",
    shortLabel: "Intrusión",
    tono: "rose",
  },
  {
    slug: "cableado_estructurado",
    label: "Cableado Estructurado",
    shortLabel: "Cableado",
    tono: "amber",
  },
  {
    slug: "control_acceso",
    label: "Control de Acceso",
    shortLabel: "Acceso",
    tono: "sky",
  },
  {
    slug: "deteccion_fuego",
    label: "Detección de Fuego",
    shortLabel: "Fuego",
    tono: "orange",
  },
  {
    slug: "energia_climatizacion",
    label: "Energía y Climatización",
    shortLabel: "Energía",
    tono: "emerald",
  },
  {
    slug: "gps_telematica",
    label: "GPS, Telemática y Equipamiento Vehicular",
    shortLabel: "GPS",
    tono: "sky",
  },
  {
    slug: "herramientas_ferreteria",
    label: "Herramientas, Ferretería y Material Eléctrico",
    shortLabel: "Ferretería",
    tono: "slate",
  },
  {
    slug: "industria_bms_robots",
    label: "Industria / BMS/ Robots",
    shortLabel: "Industria",
    tono: "slate",
  },
  {
    slug: "radiocomunicacion",
    label: "Radiocomunicación",
    shortLabel: "Radio",
    tono: "violet",
  },
  {
    slug: "redes_it",
    label: "Redes e IT",
    shortLabel: "Redes",
    tono: "emerald",
  },
  {
    slug: "videovigilancia",
    label: "Videovigilancia",
    shortLabel: "CCTV",
    tono: "orange",
  },
];

export function seccionMeta(slug: string | null | undefined): InventarioSeccionMeta | null {
  if (!slug) return null;
  return INVENTARIO_SECCIONES.find((s) => s.slug === slug) ?? null;
}

export function seccionLabel(slug: string | null | undefined): string {
  return seccionMeta(slug)?.label ?? "";
}

export function seccionShortLabel(slug: string | null | undefined): string {
  return seccionMeta(slug)?.shortLabel ?? "";
}

export function isSeccionSlug(value: string): value is InventarioSeccionSlug {
  return INVENTARIO_SECCIONES.some((s) => s.slug === value);
}
