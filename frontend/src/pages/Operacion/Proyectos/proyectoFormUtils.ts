import type {
  EquipoEstadoInstalacion,
  PresupuestoLinea,
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
  };
}

export function createEmptyProyectoDraft(): ProyectoDraft {
  return {
    cliente: "",
    clienteId: "",
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

export function buildEquiposFromPresupuesto(lineas: PresupuestoLinea[]): ProyectoEquipoLinea[] {
  const equipos: ProyectoEquipoLinea[] = [];
  for (const linea of lineas) {
    if (!linea.esEquipo) continue;
    const qty = Math.max(1, Math.floor(linea.cantidad));
    for (let i = 0; i < qty; i++) {
      equipos.push({
        lineaId: qty > 1 ? `${linea.id}-${i + 1}` : linea.id,
        modelo: linea.descripcion,
        modeloOriginal: linea.descripcion,
        estadoInstalacion: "pendiente",
        equipoEntregado: false,
      });
    }
  }
  return equipos;
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

export function proyectoRowFromDraft(draft: ProyectoDraft, existing?: ProyectoRow): ProyectoRow {
  const equipos = draft.equipos;
  const entregados = equipos.filter((e) => e.equipoEntregado).length;
  const instalados = equipos.filter((e) => e.estadoInstalacion === "instalado").length;

  return {
    id: existing?.id ?? `prj-${Date.now()}`,
    folio: existing?.folio ?? `PRJ-${String(Date.now()).slice(-4)}`,
    cliente: draft.cliente.trim() || "Sin cliente",
    cotizacionFolio: draft.cotizacion?.folio ?? "—",
    cotizacionOrigen: draft.cotizacion?.origen ?? "digitalflow",
    equiposTotal: equipos.length,
    equiposEntregados: entregados,
    equiposInstalados: instalados,
    estado: draft.status,
    fecha: existing?.fecha ?? new Date().toISOString().slice(0, 10),
    draft,
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
