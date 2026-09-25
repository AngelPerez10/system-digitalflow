import type { ProyectoEstado, ProyectoRow } from "./proyectoTypes";

export type ProyectoStatusSectionKey =
  | "EN_PROCESO"
  | "PAUSADO"
  | "SALDO_PENDIENTE"
  | "CERRADO"
  | "CANCELADO"
  | "OTROS";

export type ProyectoStatusSection = {
  key: ProyectoStatusSectionKey;
  label: string;
  rows: ProyectoRow[];
};

const STATUS_SECTION_ORDER: {
  key: ProyectoStatusSectionKey;
  label: string;
  match: (estado: string) => boolean;
}[] = [
  {
    key: "EN_PROCESO",
    label: "En proceso",
    match: (s) => s === "en_proceso" || !s,
  },
  {
    key: "PAUSADO",
    label: "Pausados",
    match: (s) => s === "pausado",
  },
  {
    key: "SALDO_PENDIENTE",
    label: "Saldo pendiente",
    match: (s) => s === "saldo_pendiente",
  },
  {
    key: "CANCELADO",
    label: "Cancelados",
    match: (s) => s === "cancelado",
  },
  {
    key: "CERRADO",
    label: "Cerrados",
    match: (s) => s === "cerrado",
  },
  {
    key: "OTROS",
    label: "Otros",
    match: () => true,
  },
];

export function normalizeProyectoEstado(raw: string | null | undefined): string {
  return String(raw || "").trim().toLowerCase();
}

/** Agrupa proyectos: En proceso → Pausados → Saldo pendiente → Cancelados → Cerrados (y otros al final). Omite secciones vacías. */
export function groupProyectosByStatus(rows: ProyectoRow[]): ProyectoStatusSection[] {
  const buckets: Record<ProyectoStatusSectionKey, ProyectoRow[]> = {
    EN_PROCESO: [],
    PAUSADO: [],
    SALDO_PENDIENTE: [],
    CERRADO: [],
    CANCELADO: [],
    OTROS: [],
  };

  for (const row of rows) {
    const estado = normalizeProyectoEstado(row.estado ?? row.draft?.status);
    const section =
      STATUS_SECTION_ORDER.find((s) => s.key !== "OTROS" && s.match(estado)) ??
      STATUS_SECTION_ORDER[STATUS_SECTION_ORDER.length - 1];
    buckets[section.key].push(row);
  }

  return STATUS_SECTION_ORDER.map((s) => ({
    key: s.key,
    label: s.label,
    rows: buckets[s.key],
  })).filter((s) => s.rows.length > 0);
}

/** Clave de sección para un estado de proyecto conocido (útil en tests y badges). */
export function proyectoEstadoToSectionKey(estado: ProyectoEstado | string): ProyectoStatusSectionKey {
  const normalized = normalizeProyectoEstado(estado);
  const section =
    STATUS_SECTION_ORDER.find((s) => s.key !== "OTROS" && s.match(normalized)) ??
    STATUS_SECTION_ORDER[STATUS_SECTION_ORDER.length - 1];
  return section.key;
}

/**
 * Estado de listado para la barra segmentada / filtro.
 * `null` = no encaja en un segmento (p. ej. valor legacy → sección Otros).
 */
export function proyectoListStatusCountKey(
  estado: ProyectoEstado | string | null | undefined,
): ProyectoEstado | null {
  switch (proyectoEstadoToSectionKey(estado ?? "")) {
    case "EN_PROCESO":
      return "en_proceso";
    case "PAUSADO":
      return "pausado";
    case "SALDO_PENDIENTE":
      return "saldo_pendiente";
    case "CERRADO":
      return "cerrado";
    case "CANCELADO":
      return "cancelado";
    default:
      return null;
  }
}
