import { describe, expect, it } from "vitest";
import {
  PROYECTO_FECHA_AUTORIZACION_FIELD_ID,
  PROYECTO_FECHA_DESDE_FIELD_ID,
  PROYECTO_TIPOS_TRABAJO_FIELD_ID,
  validateProyectoOperacionRequired,
} from "./proyectoOperacionValidation";

describe("validateProyectoOperacionRequired", () => {
  it("acepta tipo, autorización y desde", () => {
    const result = validateProyectoOperacionRequired({
      tiposTrabajo: [{ id: 1 }],
      fechaAutorizacion: "2026-08-11",
      fechaDesde: "2026-08-12",
    });
    expect(result.ok).toBe(true);
  });

  it("exige tipo de trabajo primero", () => {
    const result = validateProyectoOperacionRequired({
      tiposTrabajo: [],
      fechaAutorizacion: "",
      fechaDesde: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.firstFieldId).toBe(PROYECTO_TIPOS_TRABAJO_FIELD_ID);
      expect(result.errors.tipos).toMatch(/tipo de trabajo/i);
    }
  });

  it("exige fecha de autorización si ya hay tipo", () => {
    const result = validateProyectoOperacionRequired({
      tiposTrabajo: [{ id: 3 }],
      fechaAutorizacion: "  ",
      fechaDesde: "2026-08-12",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.firstFieldId).toBe(PROYECTO_FECHA_AUTORIZACION_FIELD_ID);
    }
  });

  it("exige Desde si ya hay tipo y autorización", () => {
    const result = validateProyectoOperacionRequired({
      tiposTrabajo: [{ id: 3 }],
      fechaAutorizacion: "2026-08-11",
      fechaDesde: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.firstFieldId).toBe(PROYECTO_FECHA_DESDE_FIELD_ID);
    }
  });
});
