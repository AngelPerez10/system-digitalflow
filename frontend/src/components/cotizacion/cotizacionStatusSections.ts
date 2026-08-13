export type CotizacionRow = {
  id: number;
  idx: number;
  fecha: string;
  medioContacto: string;
  status: string;
  creadaPor: string;
  editadaPor: string;
  cliente: string;
  clienteTelefono?: string;
  contacto: string;
  tipoTrabajo: string;
  monto: string;
  totalAmount: number;
};

export type CotizacionStatusSectionKey = "PENDIENTE" | "AUTORIZADA" | "CANCELADA" | "OTROS";

export type CotizacionStatusSection = {
  key: CotizacionStatusSectionKey;
  label: string;
  rows: CotizacionRow[];
};

export type CotizacionStatusSectionStyles = {
  /** Contenedor del encabezado */
  shell: string;
  /** Barra lateral de color */
  accent: string;
  /** Color del ícono */
  icon: string;
  /** Pill del conteo */
  badge: string;
  /** Texto del título */
  label: string;
};

const STATUS_SECTION_ORDER: {
  key: CotizacionStatusSectionKey;
  label: string;
  match: (s: string) => boolean;
}[] = [
  { key: "PENDIENTE", label: "Pendientes", match: (s) => s === "PENDIENTE" || !s || s === "—" },
  { key: "AUTORIZADA", label: "Autorizadas", match: (s) => s === "AUTORIZADA" },
  { key: "CANCELADA", label: "Canceladas", match: (s) => s === "CANCELADA" },
  { key: "OTROS", label: "Otros estados", match: () => true },
];

export const normalizeCotizacionStatus = (raw: string) => String(raw || "").trim().toUpperCase();

/** Agrupa cotizaciones: Pendientes → Autorizadas → Canceladas (y otros al final). */
export function groupCotizacionesByStatus(rows: CotizacionRow[]): CotizacionStatusSection[] {
  const buckets: Record<CotizacionStatusSectionKey, CotizacionRow[]> = {
    PENDIENTE: [],
    AUTORIZADA: [],
    CANCELADA: [],
    OTROS: [],
  };

  for (const row of rows) {
    const status = normalizeCotizacionStatus(row.status);
    const section = STATUS_SECTION_ORDER.find((s) => s.key !== "OTROS" && s.match(status)) ?? STATUS_SECTION_ORDER[3];
    buckets[section.key].push(row);
  }

  return STATUS_SECTION_ORDER.map((s) => ({
    key: s.key,
    label: s.label,
    rows: buckets[s.key],
  })).filter((s) => s.rows.length > 0);
}

/**
 * Tokens de sección pensados para contraste AA en claro y oscuro:
 * superficie neutra del ERP + acento semántico (no wash de color a pantalla completa).
 */
export function getStatusSectionStyles(key: CotizacionStatusSectionKey): CotizacionStatusSectionStyles {
  if (key === "AUTORIZADA") {
    return {
      shell:
        "border-[#d8e8dc] bg-[#f4faf6] dark:border-emerald-500/30 dark:bg-[#0f1f18]",
      accent: "bg-emerald-600 dark:bg-emerald-400",
      icon: "text-emerald-700 dark:text-emerald-300",
      badge:
        "border-emerald-300/80 bg-emerald-100 text-emerald-900 dark:border-emerald-400/35 dark:bg-emerald-500/20 dark:text-emerald-100",
      label: "text-[#14532d] dark:text-emerald-100",
    };
  }
  if (key === "CANCELADA") {
    return {
      shell:
        "border-[#edd5d8] bg-[#fbf4f5] dark:border-rose-500/30 dark:bg-[#211416]",
      accent: "bg-rose-600 dark:bg-rose-400",
      icon: "text-rose-700 dark:text-rose-300",
      badge:
        "border-rose-300/80 bg-rose-100 text-rose-900 dark:border-rose-400/35 dark:bg-rose-500/20 dark:text-rose-100",
      label: "text-[#881337] dark:text-rose-100",
    };
  }
  if (key === "PENDIENTE") {
    return {
      shell:
        "border-[#ead9b8] bg-[#fbf6ea] dark:border-amber-500/30 dark:bg-[#1f1a10]",
      accent: "bg-amber-600 dark:bg-amber-400",
      icon: "text-amber-800 dark:text-amber-300",
      badge:
        "border-amber-300/90 bg-amber-100 text-amber-950 dark:border-amber-400/35 dark:bg-amber-500/20 dark:text-amber-100",
      label: "text-[#78350f] dark:text-amber-100",
    };
  }
  return {
    shell: "border-[#e7ded0] bg-[#fcfaf6] dark:border-[#334155] dark:bg-[#0f172a]",
    accent: "bg-[#a8a29e] dark:bg-[#64748b]",
    icon: "text-[#57534e] dark:text-[#94a3b8]",
    badge:
      "border-[#e2d9ca] bg-white text-[#1c1917] dark:border-[#475569] dark:bg-[#1e293b] dark:text-[#e2e8f0]",
    label: "text-[#292524] dark:text-[#e2e8f0]",
  };
}
