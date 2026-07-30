import { describe, expect, it } from "vitest";
import {
  canCerrarProyecto,
  proyectoRequiereCotizacionAdicional,
} from "./proyectoCloseValidation";

describe("proyectoCloseValidation", () => {
  it("permite cerrar sin requerimientos ni presupuesto adicional", () => {
    expect(
      canCerrarProyecto({
        requierePresupuestoAdicional: false,
        requerimientosAdicionales: "",
        cotizacionAdicional: null,
      }).ok
    ).toBe(true);
  });

  it("bloquea cierre si requiere presupuesto adicional sin cotización", () => {
    const result = canCerrarProyecto({
      requierePresupuestoAdicional: true,
      requerimientosAdicionales: "",
      cotizacionAdicional: null,
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/cotización/i);
  });

  it("bloquea cierre si hay requerimientos adicionales sin cotización", () => {
    expect(
      canCerrarProyecto({
        requierePresupuestoAdicional: false,
        requerimientosAdicionales: "Cable extra",
        cotizacionAdicional: null,
      }).ok
    ).toBe(false);
  });

  it("permite cierre cuando la cotización adicional está vinculada", () => {
    expect(
      canCerrarProyecto({
        requierePresupuestoAdicional: true,
        requerimientosAdicionales: "Cable extra",
        cotizacionAdicional: {
          id: "df-1",
          origen: "digitalflow",
          folio: "100",
          cliente: "Cliente",
          fecha: "2026-07-01",
        },
      }).ok
    ).toBe(true);
  });

  it("detecta requerimiento de cotización adicional", () => {
    expect(
      proyectoRequiereCotizacionAdicional({
        requierePresupuestoAdicional: false,
        requerimientosAdicionales: "  ",
      })
    ).toBe(false);
    expect(
      proyectoRequiereCotizacionAdicional({
        requierePresupuestoAdicional: true,
        requerimientosAdicionales: "",
      })
    ).toBe(true);
  });
});
