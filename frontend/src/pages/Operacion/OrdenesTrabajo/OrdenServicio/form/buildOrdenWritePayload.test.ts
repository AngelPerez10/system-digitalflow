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
});
