import { describe, expect, it } from "vitest";
import type { Orden } from "./ordenesPageTypes";
import {
  countActiveListFilters,
  ordenPassesListFilters,
  type OrdenListFilters,
} from "./useOrdenesList";

function baseOrden(overrides: Partial<Orden> = {}): Orden {
  return {
    id: 1,
    idx: 1,
    cliente_id: 1,
    cliente: "Acme",
    direccion: "Calle 1",
    telefono_cliente: "",
    problematica: "",
    servicios_realizados: ["GPS"],
    status: "pendiente",
    comentario_tecnico: "",
    fecha_inicio: "2026-07-15",
    hora_inicio: "09:00",
    fecha_finalizacion: "",
    hora_termino: "",
    nombre_encargado: "",
    nombre_cliente: "",
    tecnico_asignado: 42,
    firma_encargado_url: "",
    firma_cliente_url: "",
    fotos_urls: [],
    fecha_creacion: "2026-07-15T12:00:00Z",
    ...overrides,
  };
}

const emptyFilters: OrdenListFilters = {
  status: "",
  servicio: [],
  date: "",
  tecnicoId: null,
};

describe("ordenPassesListFilters", () => {
  it("pasa con filtros vacíos", () => {
    expect(ordenPassesListFilters(baseOrden(), emptyFilters)).toBe(true);
  });

  it("filtra por estado", () => {
    expect(
      ordenPassesListFilters(baseOrden({ status: "pendiente" }), { ...emptyFilters, status: "resuelto" }),
    ).toBe(false);
    expect(
      ordenPassesListFilters(baseOrden({ status: "resuelto" }), { ...emptyFilters, status: "resuelto" }),
    ).toBe(true);
  });

  it("exige todos los servicios seleccionados", () => {
    const orden = baseOrden({ servicios_realizados: ["GPS", "Cámara"] });
    expect(ordenPassesListFilters(orden, { ...emptyFilters, servicio: ["GPS"] })).toBe(true);
    expect(ordenPassesListFilters(orden, { ...emptyFilters, servicio: ["GPS", "Audio"] })).toBe(false);
  });

  it("filtra por fecha (prefijo YYYY-MM-DD)", () => {
    expect(
      ordenPassesListFilters(baseOrden({ fecha_inicio: "2026-07-15" }), {
        ...emptyFilters,
        date: "2026-07-15",
      }),
    ).toBe(true);
    expect(
      ordenPassesListFilters(baseOrden({ fecha_inicio: "2026-07-16" }), {
        ...emptyFilters,
        date: "2026-07-15",
      }),
    ).toBe(false);
  });

  it("filtra por técnico asignado", () => {
    expect(
      ordenPassesListFilters(baseOrden({ tecnico_asignado: 42 }), { ...emptyFilters, tecnicoId: 42 }),
    ).toBe(true);
    expect(
      ordenPassesListFilters(baseOrden({ tecnico_asignado: 7 }), { ...emptyFilters, tecnicoId: 42 }),
    ).toBe(false);
  });

  it("filtra sin técnico asignado (tecnicoId = 0)", () => {
    expect(
      ordenPassesListFilters(baseOrden({ tecnico_asignado: null }), { ...emptyFilters, tecnicoId: 0 }),
    ).toBe(true);
    expect(
      ordenPassesListFilters(baseOrden({ tecnico_asignado: 42 }), { ...emptyFilters, tecnicoId: 0 }),
    ).toBe(false);
  });
});

describe("countActiveListFilters", () => {
  it("cuenta cada dimensión activa una vez", () => {
    expect(countActiveListFilters(emptyFilters)).toBe(0);
    expect(
      countActiveListFilters({
        status: "pendiente",
        servicio: ["GPS", "Cámara"],
        date: "2026-07-15",
        tecnicoId: 42,
      }),
    ).toBe(4);
  });
});
