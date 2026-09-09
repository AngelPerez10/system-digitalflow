import { isOrdenResuelta, normalizeStatus } from "./useOrdenesShared";

/**
 * Agrupamiento del listado admin por prioridad de la bolsa (`prioridad_pool`).
 * Orden fijo: Alta arriba → Media → Baja → Sin prioridad al final.
 * Las órdenes resueltas se excluyen del listado (salvo que el usuario filtre
 * explícitamente por estado = Resuelto).
 */

export type OrdenPrioridadSectionKey = "ALTA" | "MEDIA" | "BAJA" | "SIN";

export type OrdenPrioridadRow = {
  status?: string | null;
  prioridad_pool?: string | null;
};

export type OrdenPrioridadSection<T extends OrdenPrioridadRow = OrdenPrioridadRow> = {
  key: OrdenPrioridadSectionKey;
  label: string;
  ordenes: T[];
};

const SECTION_META: { key: OrdenPrioridadSectionKey; label: string; match: string }[] = [
  { key: "ALTA", label: "Prioridad alta", match: "alta" },
  { key: "MEDIA", label: "Prioridad media", match: "media" },
  { key: "BAJA", label: "Prioridad baja", match: "baja" },
  { key: "SIN", label: "Sin prioridad", match: "" },
];

const RANK: Record<OrdenPrioridadSectionKey, number> = {
  ALTA: 0,
  MEDIA: 1,
  BAJA: 2,
  SIN: 3,
};

export function ordenPrioridadKey(value: unknown): OrdenPrioridadSectionKey {
  switch (normalizeStatus(value)) {
    case "alta":
      return "ALTA";
    case "media":
      return "MEDIA";
    case "baja":
      return "BAJA";
    default:
      return "SIN";
  }
}

export function ordenPrioridadRank(value: unknown): number {
  return RANK[ordenPrioridadKey(value)];
}

/** ¿Se muestra la orden en el listado activo? Oculta resueltas salvo filtro explícito. */
export function ordenEsVisibleEnListado(
  orden: OrdenPrioridadRow,
  opts: { incluirResueltas?: boolean } = {},
): boolean {
  if (opts.incluirResueltas) return true;
  return !isOrdenResuelta(normalizeStatus(orden.status));
}

/**
 * Ordena por prioridad (Alta → Baja → Sin) de forma estable: dentro de cada
 * nivel conserva el orden de entrada (que ya viene por fecha desc).
 */
export function sortOrdenesByPrioridad<T extends OrdenPrioridadRow>(list: T[]): T[] {
  return list
    .map((orden, index) => ({ orden, index }))
    .sort((a, b) => {
      const byRank = ordenPrioridadRank(a.orden.prioridad_pool) - ordenPrioridadRank(b.orden.prioridad_pool);
      return byRank !== 0 ? byRank : a.index - b.index;
    })
    .map((entry) => entry.orden);
}

/** Agrupa por prioridad; omite secciones vacías. Espera la lista ya filtrada. */
export function groupOrdenesByPrioridad<T extends OrdenPrioridadRow>(
  ordenes: T[],
): OrdenPrioridadSection<T>[] {
  const buckets: Record<OrdenPrioridadSectionKey, T[]> = {
    ALTA: [],
    MEDIA: [],
    BAJA: [],
    SIN: [],
  };

  for (const orden of ordenes) {
    buckets[ordenPrioridadKey(orden.prioridad_pool)].push(orden);
  }

  return SECTION_META.map((meta) => ({
    key: meta.key,
    label: meta.label,
    ordenes: buckets[meta.key],
  })).filter((section) => section.ordenes.length > 0);
}

export type OrdenPrioridadSectionStyles = {
  shell: string;
  accent: string;
  icon: string;
  badge: string;
  label: string;
  /** Franja izquierda de la fila / borde de la tarjeta. */
  rowAccent: string;
  /** Punto de color junto al folio. */
  dot: string;
  /** Segmento de prioridad dentro de la pastilla combinada estado+prioridad (fondo + texto, sin borde). */
  cap: string;
};

export function getOrdenPrioridadSectionStyles(
  key: OrdenPrioridadSectionKey,
): OrdenPrioridadSectionStyles {
  if (key === "ALTA") {
    return {
      shell: "border-rose-200/90 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-950/25",
      accent: "bg-rose-600 dark:bg-rose-400",
      icon: "text-rose-700 dark:text-rose-300",
      badge:
        "border-rose-300/90 bg-rose-100 text-rose-900 dark:border-rose-400/35 dark:bg-rose-500/20 dark:text-rose-100",
      label: "text-rose-900 dark:text-rose-100",
      rowAccent: "shadow-[inset_3px_0_0_0_#e11d48] dark:shadow-[inset_3px_0_0_0_#fb7185]",
      dot: "bg-rose-500 dark:bg-rose-400",
      cap: "bg-rose-200 text-rose-900 dark:bg-rose-500/30 dark:text-rose-50",
    };
  }
  if (key === "MEDIA") {
    return {
      shell: "border-amber-200/90 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/25",
      accent: "bg-amber-500 dark:bg-amber-400",
      icon: "text-amber-700 dark:text-amber-300",
      badge:
        "border-amber-300/90 bg-amber-100 text-amber-900 dark:border-amber-400/35 dark:bg-amber-500/20 dark:text-amber-100",
      label: "text-amber-900 dark:text-amber-100",
      rowAccent: "shadow-[inset_3px_0_0_0_#f59e0b] dark:shadow-[inset_3px_0_0_0_#fbbf24]",
      dot: "bg-amber-500 dark:bg-amber-400",
      cap: "bg-amber-200 text-amber-900 dark:bg-amber-500/30 dark:text-amber-50",
    };
  }
  if (key === "BAJA") {
    return {
      shell: "border-sky-200/90 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-950/25",
      accent: "bg-sky-500 dark:bg-sky-400",
      icon: "text-sky-700 dark:text-sky-300",
      badge:
        "border-sky-300/90 bg-sky-100 text-sky-900 dark:border-sky-400/35 dark:bg-sky-500/20 dark:text-sky-100",
      label: "text-sky-900 dark:text-sky-100",
      rowAccent: "shadow-[inset_3px_0_0_0_#0ea5e9] dark:shadow-[inset_3px_0_0_0_#38bdf8]",
      dot: "bg-sky-500 dark:bg-sky-400",
      cap: "bg-sky-200 text-sky-900 dark:bg-sky-500/30 dark:text-sky-50",
    };
  }
  return {
    shell: "border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#0f172a]",
    accent: "bg-[#A1A1AA] dark:bg-[#64748b]",
    icon: "text-[#52525B] dark:text-[#8EA0B8]",
    badge:
      "border-[#E7E7EA] bg-white text-[#52525B] dark:border-[#475569] dark:bg-[#1e293b] dark:text-[#e2e8f0]",
    label: "text-[#52525B] dark:text-[#e2e8f0]",
    rowAccent: "shadow-[inset_3px_0_0_0_#d4d4d8] dark:shadow-[inset_3px_0_0_0_#475569]",
    dot: "bg-[#A1A1AA] dark:bg-[#64748b]",
    cap: "bg-[#EDEDED] text-[#52525B] dark:bg-white/10 dark:text-[#cbd5e1]",
  };
}
