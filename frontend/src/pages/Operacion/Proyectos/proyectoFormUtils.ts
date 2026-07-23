import type {
  CotizacionResumen,
  EquipoEstadoInstalacion,
  PresupuestoLinea,
  ProyectoCotizacionBloque,
  ProyectoDraft,
  ProyectoEquipoLinea,
  ProyectoEstado,
  ProyectoNotaDia,
  ProyectoPersonaAsignada,
  ProyectoRow,
  ProyectoStats,
} from "./proyectoTypes";

export function emptyPersona(): ProyectoPersonaAsignada {
  return { id: null, nombre: "" };
}

export function createEmptyNotaDia(): ProyectoNotaDia {
  return {
    id: `nota-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    nota: "",
    imagenesUrls: [],
  };
}

/** Normaliza notas legacy sin `imagenesUrls`. */
export function normalizeNotasPorDia(notas?: ProyectoNotaDia[] | null): ProyectoNotaDia[] {
  if (!notas?.length) return [createEmptyNotaDia()];
  return notas.map((n) => ({
    id: n.id || createEmptyNotaDia().id,
    nota: typeof n.nota === "string" ? n.nota : "",
    imagenesUrls: Array.isArray(n.imagenesUrls)
      ? n.imagenesUrls.filter((u): u is string => typeof u === "string" && u.trim().length > 0).slice(0, 2)
      : [],
  }));
}

export function createVinculoId(): string {
  return `vin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Prefija ids de línea para que no choquen entre cotizaciones. */
export function prefixPresupuestoLineas(
  cotizacionId: string,
  lineas: PresupuestoLinea[]
): PresupuestoLinea[] {
  return lineas.map((l) => ({
    ...l,
    id: l.id.includes(":") ? l.id : `${cotizacionId}:${l.id}`,
  }));
}

export function createCotizacionBloque(
  cotizacion: CotizacionResumen,
  lineas: PresupuestoLinea[],
  orden: number,
  vinculoId = createVinculoId()
): ProyectoCotizacionBloque {
  return {
    vinculoId,
    orden,
    cotizacion,
    lineas: prefixPresupuestoLineas(cotizacion.id, lineas),
  };
}

export function reindexCotizacionBloques(
  bloques: ProyectoCotizacionBloque[]
): ProyectoCotizacionBloque[] {
  return bloques.map((b, i) => ({ ...b, orden: i + 1 }));
}

export function flattenPresupuesto(bloques: ProyectoCotizacionBloque[]): PresupuestoLinea[] {
  return bloques.flatMap((b) => b.lineas);
}

/**
 * Normaliza drafts legados (solo `cotizacion` + `presupuesto`) a `cotizaciones[]`.
 */
export function normalizeDraftCotizaciones(draft: ProyectoDraft): ProyectoCotizacionBloque[] {
  if (draft.cotizaciones?.length) {
    return reindexCotizacionBloques(draft.cotizaciones);
  }
  if (draft.cotizacion) {
    return [
      createCotizacionBloque(
        draft.cotizacion,
        draft.presupuesto ?? [],
        1,
        `vin-legacy-${draft.cotizacion.id}`
      ),
    ];
  }
  return [];
}

export function createEmptyProyectoDraft(): ProyectoDraft {
  return {
    cliente: "",
    clienteId: "",
    cotizaciones: [],
    cotizacion: null,
    presupuesto: [],
    equipos: [],
    tipoTrabajoId: null,
    tipoTrabajoNombre: "",
    status: "en_proceso",
    motivoPausa: "",
    fechaAutorizacion: "",
    fechasInicio: [""],
    horaLlegada: "",
    horaSalida: "",
    tecnico: emptyPersona(),
    auxiliar: emptyPersona(),
    vehiculoAsignado: "",
    herramientasGenerales: "",
    notasPorDia: [createEmptyNotaDia()],
    porcentajeAvance: 0,
    incidencias: "",
    requerimientosAdicionales: "",
    requierePresupuestoAdicional: false,
    cotizacionAdicional: null,
    evidenciasUrls: [],
    firmaClienteUrl: "",
    firmaTecnicoUrl: "",
  };
}

export function buildEquiposFromPresupuesto(
  lineas: PresupuestoLinea[],
  meta?: {
    cotizacionVinculoId: string;
    cotizacionOrden: number;
    cotizacionFolio: string;
  }
): ProyectoEquipoLinea[] {
  const equipos: ProyectoEquipoLinea[] = [];
  for (const linea of lineas) {
    if (!linea.esEquipo) continue;
    const qty = Math.max(1, Math.floor(linea.cantidad));
    for (let i = 0; i < qty; i++) {
      const baseId = qty > 1 ? `${linea.id}-${i + 1}` : linea.id;
      equipos.push({
        lineaId: meta ? `${meta.cotizacionVinculoId}:${baseId}` : baseId,
        modelo: linea.descripcion,
        modeloOriginal: linea.descripcion,
        productoId: linea.productoId,
        imagenUrl: linea.imagenUrl,
        fuenteProducto: linea.fuenteProducto,
        estadoInstalacion: "pendiente",
        equipoEntregado: false,
        cotizacionVinculoId: meta?.cotizacionVinculoId,
        cotizacionOrden: meta?.cotizacionOrden,
        cotizacionFolio: meta?.cotizacionFolio,
      });
    }
  }
  return equipos;
}

export function buildEquiposFromCotizaciones(
  bloques: ProyectoCotizacionBloque[],
  previous?: ProyectoEquipoLinea[]
): ProyectoEquipoLinea[] {
  const prevById = new Map((previous ?? []).map((e) => [e.lineaId, e]));
  const next: ProyectoEquipoLinea[] = [];
  for (const bloque of bloques) {
    const built = buildEquiposFromPresupuesto(bloque.lineas, {
      cotizacionVinculoId: bloque.vinculoId,
      cotizacionOrden: bloque.orden,
      cotizacionFolio: bloque.cotizacion.folio,
    });
    for (const eq of built) {
      const prev = prevById.get(eq.lineaId);
      next.push(
        prev
          ? {
              ...eq,
              modelo: prev.modelo,
              productoId: prev.productoId,
              marca: prev.marca,
              imagenUrl: prev.imagenUrl ?? eq.imagenUrl,
              fuenteProducto: prev.fuenteProducto ?? eq.fuenteProducto,
              estadoInstalacion: prev.estadoInstalacion,
              equipoEntregado: prev.equipoEntregado,
            }
          : eq
      );
    }
  }
  return next;
}

export function estadoInstalacionLabel(estado: EquipoEstadoInstalacion): string {
  switch (estado) {
    case "entregado":
      return "Entregado";
    case "no_instalado":
      return "No instalado";
    case "instalado":
      return "Instalado";
    default:
      return "Pendiente";
  }
}

export function estadoProyectoLabel(estado: ProyectoEstado): string {
  switch (estado) {
    case "pausado":
      return "Pausado";
    case "cerrado":
      return "Cerrado";
    default:
      return "En proceso";
  }
}

export function clampPorcentajeAvance(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Hora local del dispositivo en formato `HH:mm` (input type="time"). */
export function getDeviceTimeHHMM(date: Date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function formatCotizacionesFolioLabel(bloques: ProyectoCotizacionBloque[]): string {
  if (!bloques.length) return "—";
  if (bloques.length === 1) return bloques[0].cotizacion.folio;
  return `${bloques.length} cotiz.`;
}

export function proyectoRowFromDraft(draft: ProyectoDraft, existing?: ProyectoRow): ProyectoRow {
  const cotizaciones = normalizeDraftCotizaciones(draft);
  const equipos = draft.equipos;
  const entregados = equipos.filter((e) => e.equipoEntregado).length;
  const instalados = equipos.filter((e) => e.estadoInstalacion === "instalado").length;
  const primary = cotizaciones[0]?.cotizacion;

  return {
    id: existing?.id ?? `prj-${Date.now()}`,
    folio: existing?.folio ?? `PRJ-${String(Date.now()).slice(-4)}`,
    cliente: draft.cliente.trim() || "Sin cliente",
    cotizacionFolio: formatCotizacionesFolioLabel(cotizaciones),
    cotizacionOrigen: primary?.origen ?? "digitalflow",
    cotizacionesCount: cotizaciones.length,
    equiposTotal: equipos.length,
    equiposEntregados: entregados,
    equiposInstalados: instalados,
    estado: draft.status,
    fecha: existing?.fecha ?? new Date().toISOString().slice(0, 10),
    draft: {
      ...draft,
      cotizaciones,
      cotizacion: primary ?? null,
      presupuesto: flattenPresupuesto(cotizaciones),
    },
  };
}

export function computeProyectoStats(rows: ProyectoRow[]): ProyectoStats {
  return {
    total: rows.length,
    enProceso: rows.filter((r) => r.estado === "en_proceso").length,
    pausados: rows.filter((r) => r.estado === "pausado").length,
    cerrados: rows.filter((r) => r.estado === "cerrado").length,
  };
}

export function estadoBadgeClass(estado: EquipoEstadoInstalacion): string {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide";
  switch (estado) {
    case "entregado":
      return `${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300`;
    case "no_instalado":
      return `${base} bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300`;
    case "instalado":
      return `${base} bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300`;
    default:
      return `${base} bg-[#f5f0e8] text-[#57534e] dark:bg-[#1e293b] dark:text-[#aeb8c8]`;
  }
}

export function estadoProyectoBadgeClass(estado: ProyectoEstado): string {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium";
  switch (estado) {
    case "cerrado":
      return `${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`;
    case "pausado":
      return `${base} bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300`;
    default:
      return `${base} bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300`;
  }
}
