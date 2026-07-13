import type { CotizacionResumen, PresupuestoLinea, ProyectoRow } from "./proyectoTypes";
import { buildEquiposFromPresupuesto, createEmptyProyectoDraft, proyectoRowFromDraft } from "./proyectoFormUtils";

/** Datos de ejemplo — sustituir por API DigitalFlow / SICAR en fase funcional. */
export const MOCK_COTIZACIONES_DIGITALFLOW: CotizacionResumen[] = [
  {
    id: "df-1042",
    origen: "digitalflow",
    folio: "1042",
    cliente: "Transportes del Norte SA de CV",
    fecha: "2026-07-02",
    contacto: "Ing. Martínez",
  },
  {
    id: "df-1038",
    origen: "digitalflow",
    folio: "1038",
    cliente: "Almacenes Regiomontanos",
    fecha: "2026-06-28",
    contacto: "Lic. Herrera",
  },
];

export const MOCK_COTIZACIONES_SICAR: CotizacionResumen[] = [
  {
    id: "sic-892",
    origen: "sicar",
    folio: "COT-892",
    cliente: "Seguridad Integral del Bajío",
    fecha: "2026-06-25",
    contacto: "Carlos Ruiz",
  },
  {
    id: "sic-901",
    origen: "sicar",
    folio: "COT-901",
    cliente: "Grupo Logístico Pacífico",
    fecha: "2026-07-01",
  },
];

export const MOCK_PRESUPUESTO_BY_COTIZACION: Record<string, PresupuestoLinea[]> = {
  "df-1042": [
    {
      id: "l1",
      categoria: "Alarmas",
      descripcion: "Kit alarma DSC PowerSeries Neo",
      detalle: "Panel, teclado, contactos magnéticos y sirena",
      cantidad: 1,
      unidad: "PZA",
      esEquipo: true,
    },
    {
      id: "l2",
      categoria: "Comunicación",
      descripcion: "Comunicador IP/GPRS DSC",
      cantidad: 1,
      unidad: "PZA",
      esEquipo: true,
    },
    {
      id: "l3",
      categoria: "Conectividad",
      descripcion: "SIM datos M2M 12 meses",
      cantidad: 1,
      unidad: "PZA",
      esEquipo: true,
    },
    {
      id: "l4",
      categoria: "Servicios",
      descripcion: "Instalación y puesta en marcha",
      detalle: "Incluye cableado básico y capacitación",
      cantidad: 1,
      unidad: "SERV",
      esEquipo: false,
    },
  ],
  "df-1038": [
    {
      id: "l1",
      categoria: "GPS",
      descripcion: "Antarix GPS - KITGPSDT16",
      cantidad: 3,
      unidad: "PZA",
      esEquipo: true,
    },
    {
      id: "l2",
      categoria: "Servicios",
      descripcion: "Instalación por unidad",
      cantidad: 3,
      unidad: "SERV",
      esEquipo: false,
    },
  ],
  "sic-892": [
    {
      id: "l1",
      categoria: "CCTV",
      descripcion: "Cámara IP 4MP Hikvision",
      cantidad: 8,
      unidad: "PZA",
      esEquipo: true,
    },
    {
      id: "l2",
      categoria: "CCTV",
      descripcion: "NVR 16 canales",
      cantidad: 1,
      unidad: "PZA",
      esEquipo: true,
    },
  ],
  "sic-901": [
    {
      id: "l1",
      categoria: "GPS",
      descripcion: "Teltonika - KITGPSFMC920",
      cantidad: 5,
      unidad: "PZA",
      esEquipo: true,
    },
  ],
};

function mockRow(
  id: string,
  folio: string,
  cotizacionId: string,
  cotizacion: CotizacionResumen,
  equiposPatch?: (eq: ReturnType<typeof buildEquiposFromPresupuesto>) => ReturnType<typeof buildEquiposFromPresupuesto>
): ProyectoRow {
  const presupuesto = MOCK_PRESUPUESTO_BY_COTIZACION[cotizacionId] ?? [];
  let equipos = buildEquiposFromPresupuesto(presupuesto);
  if (equiposPatch) equipos = equiposPatch(equipos);

  const draft = {
    ...createEmptyProyectoDraft(),
    cliente: cotizacion.cliente,
    clienteId: cotizacion.origen === "digitalflow" ? `df-cli-${cotizacion.id}` : `sic-cli-${cotizacion.id}`,
    cotizacion,
    presupuesto,
    equipos,
  };

  return proyectoRowFromDraft(draft, {
    id,
    folio,
    cliente: cotizacion.cliente,
    cotizacionFolio: cotizacion.folio,
    cotizacionOrigen: cotizacion.origen,
    equiposTotal: equipos.length,
    equiposEntregados: equipos.filter((e) => e.equipoEntregado).length,
    equiposInstalados: equipos.filter((e) => e.estadoInstalacion === "instalado").length,
    estado: draft.status,
    fecha: cotizacion.fecha,
    draft,
  });
}

/** Listado de ejemplo para la vista de diseño. */
export const MOCK_PROYECTOS_ROWS: ProyectoRow[] = [
  (() => {
    const row = mockRow("prj-1", "PRJ-1001", "df-1042", MOCK_COTIZACIONES_DIGITALFLOW[0], (eq) =>
      eq.map((e, i) =>
        i === 0 ? { ...e, equipoEntregado: true, estadoInstalacion: "entregado" } : e
      )
    );
    row.draft = {
      ...row.draft,
      status: "en_proceso",
      tipoTrabajoNombre: "ALARMAS",
      porcentajeAvance: 35,
      fechasInicio: [cotizacionFechaOrToday(MOCK_COTIZACIONES_DIGITALFLOW[0].fecha)],
      notasPorDia: [{ id: "nota-mock-1", nota: "Instalación de panel y teclado iniciada." }],
    };
    row.estado = "en_proceso";
    return row;
  })(),
  (() => {
    const row = mockRow("prj-2", "PRJ-1002", "sic-892", MOCK_COTIZACIONES_SICAR[0], (eq) =>
      eq.map((e, i) =>
        i < 6
          ? { ...e, equipoEntregado: true, estadoInstalacion: "instalado" }
          : { ...e, estadoInstalacion: "no_instalado" }
      )
    );
    row.draft = {
      ...row.draft,
      status: "cerrado",
      tipoTrabajoNombre: "CAMARA",
      porcentajeAvance: 100,
      fechasInicio: [cotizacionFechaOrToday(MOCK_COTIZACIONES_SICAR[0].fecha)],
    };
    row.estado = "cerrado";
    return row;
  })(),
  (() => {
    const row = mockRow("prj-3", "PRJ-1003", "df-1038", MOCK_COTIZACIONES_DIGITALFLOW[1]);
    row.draft = {
      ...row.draft,
      status: "pausado",
      motivoPausa: "Espera de material del cliente",
      tipoTrabajoNombre: "GPS",
      porcentajeAvance: 10,
      fechasInicio: [cotizacionFechaOrToday(MOCK_COTIZACIONES_DIGITALFLOW[1].fecha)],
    };
    row.estado = "pausado";
    return row;
  })(),
];

function cotizacionFechaOrToday(fecha: string): string {
  return fecha || new Date().toISOString().slice(0, 10);
}