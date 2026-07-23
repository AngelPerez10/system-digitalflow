import type { CotizacionResumen, PresupuestoLinea, ProyectoRow } from "./proyectoTypes";
import {
  buildEquiposFromCotizaciones,
  createCotizacionBloque,
  createEmptyProyectoDraft,
  flattenPresupuesto,
  proyectoRowFromDraft,
} from "./proyectoFormUtils";

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
    id: "df-1055",
    origen: "digitalflow",
    folio: "1055",
    cliente: "Transportes del Norte SA de CV",
    fecha: "2026-07-10",
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
      productoId: "dsc-neo-kit",
      fuenteProducto: "syscom",
      imagenUrl: "https://placehold.co/120x120/f5f0e8/57534e?text=DSC",
    },
    {
      id: "l2",
      categoria: "Comunicación",
      descripcion: "Comunicador IP/GPRS DSC",
      cantidad: 1,
      unidad: "PZA",
      esEquipo: true,
      productoId: "dsc-ipgprs",
      fuenteProducto: "syscom",
      imagenUrl: "https://placehold.co/120x120/efe9de/57534e?text=IP",
    },
    {
      id: "l3",
      categoria: "Conectividad",
      descripcion: "SIM datos M2M 12 meses",
      cantidad: 1,
      unidad: "PZA",
      esEquipo: true,
      fuenteProducto: "manual",
      productoId: "manual:sim-m2m",
      imagenUrl: "https://placehold.co/120x120/e8e0d2/57534e?text=SIM",
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
  "df-1055": [
    {
      id: "l1",
      categoria: "GPS",
      descripcion: "Antarix GPS - KITGPSDT16",
      cantidad: 2,
      unidad: "PZA",
      esEquipo: true,
      productoId: "kitgpsdt16-b",
      fuenteProducto: "tvc",
      imagenUrl: "https://placehold.co/120x120/dbeafe/1e40af?text=GPS2",
    },
    {
      id: "l2",
      categoria: "Servicios",
      descripcion: "Instalación GPS unidades adicionales",
      cantidad: 2,
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
      productoId: "kitgpsdt16",
      fuenteProducto: "tvc",
      imagenUrl: "https://placehold.co/120x120/dbeafe/1e40af?text=GPS",
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
      productoId: "hik-4mp",
      fuenteProducto: "syscom",
      imagenUrl: "https://placehold.co/120x120/ecfccb/365314?text=CAM",
    },
    {
      id: "l2",
      categoria: "CCTV",
      descripcion: "NVR 16 canales",
      cantidad: 1,
      unidad: "PZA",
      esEquipo: true,
      productoId: "nvr-16",
      fuenteProducto: "syscom",
      imagenUrl: "https://placehold.co/120x120/e0e7ff/312e81?text=NVR",
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
      productoId: "fmc920",
      fuenteProducto: "tvc",
      imagenUrl: "https://placehold.co/120x120/ffedd5/9a3412?text=FMC",
    },
  ],
};

function mockRow(
  id: string,
  folio: string,
  cotizacionIds: string[],
  cotizaciones: CotizacionResumen[],
  equiposPatch?: (
    eq: ReturnType<typeof buildEquiposFromCotizaciones>
  ) => ReturnType<typeof buildEquiposFromCotizaciones>
): ProyectoRow {
  const bloques = cotizacionIds.map((cid, i) => {
    const cot = cotizaciones.find((c) => c.id === cid)!;
    return createCotizacionBloque(cot, MOCK_PRESUPUESTO_BY_COTIZACION[cid] ?? [], i + 1, `vin-mock-${cid}`);
  });
  let equipos = buildEquiposFromCotizaciones(bloques);
  if (equiposPatch) equipos = equiposPatch(equipos);
  const primary = bloques[0]?.cotizacion;

  const draft = {
    ...createEmptyProyectoDraft(),
    cliente: primary?.cliente ?? "",
    clienteId: primary
      ? primary.origen === "digitalflow"
        ? `df-cli-${primary.id}`
        : `sic-cli-${primary.id}`
      : "",
    cotizaciones: bloques,
    cotizacion: primary ?? null,
    presupuesto: flattenPresupuesto(bloques),
    equipos,
  };

  return proyectoRowFromDraft(draft, {
    id,
    folio,
    cliente: primary?.cliente ?? "",
    cotizacionFolio: primary?.folio ?? "—",
    cotizacionOrigen: primary?.origen ?? "digitalflow",
    cotizacionesCount: bloques.length,
    equiposTotal: equipos.length,
    equiposEntregados: equipos.filter((e) => e.equipoEntregado).length,
    equiposInstalados: equipos.filter((e) => e.estadoInstalacion === "instalado").length,
    estado: draft.status,
    fecha: primary?.fecha ?? new Date().toISOString().slice(0, 10),
    draft,
  });
}

/** Listado de ejemplo para la vista de diseño. */
export const MOCK_PROYECTOS_ROWS: ProyectoRow[] = [
  (() => {
    const row = mockRow(
      "prj-1",
      "PRJ-1001",
      ["df-1042", "df-1055"],
      MOCK_COTIZACIONES_DIGITALFLOW,
      (eq) =>
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
      notasPorDia: [{ id: "nota-mock-1", nota: "Instalación de panel y teclado iniciada.", imagenesUrls: [] }],
    };
    row.estado = "en_proceso";
    return row;
  })(),
  (() => {
    const row = mockRow("prj-2", "PRJ-1002", ["sic-892"], MOCK_COTIZACIONES_SICAR, (eq) =>
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
    const row = mockRow("prj-3", "PRJ-1003", ["df-1038"], MOCK_COTIZACIONES_DIGITALFLOW);
    row.draft = {
      ...row.draft,
      status: "pausado",
      motivoPausa: "Espera de material del cliente",
      tipoTrabajoNombre: "GPS",
      porcentajeAvance: 10,
      fechasInicio: [cotizacionFechaOrToday(MOCK_COTIZACIONES_DIGITALFLOW[2].fecha)],
    };
    row.estado = "pausado";
    return row;
  })(),
];

function cotizacionFechaOrToday(fecha: string): string {
  return fecha || new Date().toISOString().slice(0, 10);
}
