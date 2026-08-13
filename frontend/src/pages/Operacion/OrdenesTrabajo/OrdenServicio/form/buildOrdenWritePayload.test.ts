import { describe, expect, it } from "vitest";
import { buildOrdenWritePayload, type OrdenFormData } from "./useOrdenFormDraft";

const baseForm: OrdenFormData = {
  folio: "ODT-1",
  cliente_id: 10,
  contacto_id: 5,
  cliente: "Acme",
  direccion: "Calle 1",
  telefono_cliente: "555",
  nombre_cliente: "Juan",
  problematica: "",
  servicios_realizados: ["GPS"],
  status: "pendiente",
  comentario_tecnico: "",
  fecha_inicio: "2026-07-30",
  hora_inicio: "",
  fecha_finalizacion: "",
  hora_termino: "",
  nombre_encargado: "",
  tecnico_asignado: null,
  quien_instalo: null,
  quien_entrego: null,
  firma_encargado_url: "data:image/png;base64,abc",
  firma_cliente_url: "",
  fotos_urls: [],
  fotos_extra_max: 0,
  equipos_inventario: [],
};

describe("buildOrdenWritePayload", () => {
  it("admin+isAdmin includes status_administrativo and cotizaciones", () => {
    const payload = buildOrdenWritePayload({
      formData: baseForm,
      variant: "admin",
      isAdmin: true,
      statusAdministrativo: "enviado",
      fechaEnvioAdmin: "2026-07-15",
      cotizacionesAdmin: [
        {
          id: "c1",
          origen: "digitalflow",
          folio: "COT-1",
          cliente: "Acme",
          fecha: "2026-07-01",
        },
      ],
    });
    expect(payload.status_administrativo).toBe("enviado");
    expect(payload.fecha_envio).toBe("2026-07-15");
    expect(payload.cotizaciones_adjuntas).toEqual([
      {
        id: "c1",
        origen: "digitalflow",
        folio: "COT-1",
        cliente: "Acme",
        fecha: "2026-07-01",
      },
    ]);
    expect(payload).not.toHaveProperty("contacto_id");
    expect(payload).not.toHaveProperty("firma_encargado_url");
  });

  it("tecnico omits admin seguimiento fields", () => {
    const payload = buildOrdenWritePayload({
      formData: baseForm,
      variant: "tecnico",
      isAdmin: true,
      statusAdministrativo: "enviado",
      fechaEnvioAdmin: "2026-07-15",
      cotizacionesAdmin: [],
    });
    expect(payload).not.toHaveProperty("status_administrativo");
    expect(payload).not.toHaveProperty("fecha_envio");
    expect(payload).not.toHaveProperty("cotizaciones_adjuntas");
  });

  it("admin non-admin omits admin seguimiento fields", () => {
    const payload = buildOrdenWritePayload({
      formData: baseForm,
      variant: "admin",
      isAdmin: false,
      statusAdministrativo: "enviado",
      fechaEnvioAdmin: "2026-07-15",
      cotizacionesAdmin: [],
    });
    expect(payload).not.toHaveProperty("status_administrativo");
    expect(payload).not.toHaveProperty("fecha_envio");
    expect(payload).not.toHaveProperty("cotizaciones_adjuntas");
  });

  it("tecnico sends firma_encargado_url as null when empty", () => {
    const payload = buildOrdenWritePayload({
      formData: { ...baseForm, firma_encargado_url: "  " },
      variant: "tecnico",
      isAdmin: false,
    });
    expect(payload.firma_encargado_url).toBeNull();
  });

  it("includes equipos_inventario from formData", () => {
    const payload = buildOrdenWritePayload({
      formData: {
        ...baseForm,
        equipos_inventario: [
          {
            lineaId: "l1",
            inventarioItemId: 7,
            codigoBarras: "750",
            nombre: "GPS",
            marca: "X",
            modelo: "M1",
            imagenUrl: "",
            cantidad: 2,
            equipoEntregado: true,
            estadoInstalacion: "no_instalado",
            movimientoSalidaId: 15,
          },
        ],
      },
      variant: "admin",
      isAdmin: true,
    });
    expect(payload.equipos_inventario).toEqual([
      expect.objectContaining({
        lineaId: "l1",
        inventarioItemId: 7,
        cantidad: 2,
        equipoEntregado: true,
        movimientoSalidaId: 15,
      }),
    ]);
  });

  it("non-admin payload only allows estadoInstalacion vs baseline", () => {
    const baseline = [
      {
        lineaId: "l1",
        inventarioItemId: 7,
        codigoBarras: "750",
        nombre: "GPS",
        marca: "X",
        modelo: "M1",
        imagenUrl: "",
        cantidad: 2,
        equipoEntregado: true,
        estadoInstalacion: "no_instalado" as const,
        movimientoSalidaId: 15,
      },
    ];
    const payload = buildOrdenWritePayload({
      formData: {
        ...baseForm,
        equipos_inventario: [
          {
            ...baseline[0],
            cantidad: 9,
            equipoEntregado: false,
            estadoInstalacion: "instalado",
          },
        ],
      },
      variant: "tecnico",
      isAdmin: false,
      baselineEquipos: baseline,
    });
    expect(payload.equipos_inventario).toEqual([
      expect.objectContaining({
        lineaId: "l1",
        cantidad: 2,
        equipoEntregado: true,
        estadoInstalacion: "instalado",
        movimientoSalidaId: 15,
      }),
    ]);
  });

  it("non-admin create sends empty equipos_inventario", () => {
    const payload = buildOrdenWritePayload({
      formData: {
        ...baseForm,
        equipos_inventario: [
          {
            lineaId: "new",
            inventarioItemId: 1,
            codigoBarras: "",
            nombre: "X",
            marca: "",
            modelo: "",
            imagenUrl: "",
            cantidad: 1,
            equipoEntregado: false,
            estadoInstalacion: "instalado",
            movimientoSalidaId: null,
          },
        ],
      },
      variant: "tecnico",
      isAdmin: false,
      baselineEquipos: [],
    });
    expect(payload.equipos_inventario).toEqual([]);
  });
});
