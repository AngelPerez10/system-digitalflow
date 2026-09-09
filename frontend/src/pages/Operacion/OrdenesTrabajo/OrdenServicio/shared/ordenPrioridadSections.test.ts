import { describe, expect, it } from "vitest";
import {
  ordenPrioridadEscalada,
  prioridadPoolEfectiva,
  sortOrdenesByPrioridad,
} from "./ordenPrioridadSections";

const NOW = Date.parse("2026-09-09T12:00:00Z");
const hace = (horas: number) => new Date(NOW - horas * 3_600_000).toISOString();

describe("prioridadPoolEfectiva", () => {
  it("no escala antes de 72 h", () => {
    expect(prioridadPoolEfectiva("baja", hace(10), "pendiente", NOW)).toBe("baja");
    expect(prioridadPoolEfectiva("media", hace(71), "pendiente", NOW)).toBe("media");
  });

  it("escala +1 nivel entre 72 y 96 h", () => {
    expect(prioridadPoolEfectiva("baja", hace(72), "pendiente", NOW)).toBe("media");
    expect(prioridadPoolEfectiva("baja", hace(95), "pendiente", NOW)).toBe("media");
    expect(prioridadPoolEfectiva("media", hace(80), "pendiente", NOW)).toBe("alta");
  });

  it("escala +2 niveles a partir de 96 h", () => {
    expect(prioridadPoolEfectiva("baja", hace(96), "pendiente", NOW)).toBe("alta");
    expect(prioridadPoolEfectiva("baja", hace(500), "pausado", NOW)).toBe("alta");
  });

  it("alta se mantiene en alta", () => {
    expect(prioridadPoolEfectiva("alta", hace(500), "pendiente", NOW)).toBe("alta");
  });

  it("no escala si la orden está resuelta", () => {
    expect(prioridadPoolEfectiva("baja", hace(500), "resuelto", NOW)).toBe("baja");
  });

  it("no escala sin prioridad base ni sin fecha", () => {
    expect(prioridadPoolEfectiva("", hace(500), "pendiente", NOW)).toBe("");
    expect(prioridadPoolEfectiva("baja", null, "pendiente", NOW)).toBe("baja");
  });
});

describe("ordenPrioridadEscalada", () => {
  it("marca escalada cuando la efectiva supera la base", () => {
    expect(
      ordenPrioridadEscalada(
        { prioridad_pool: "baja", fecha_creacion: hace(100), status: "pendiente" },
        NOW,
      ),
    ).toBe(true);
    expect(
      ordenPrioridadEscalada(
        { prioridad_pool: "baja", fecha_creacion: hace(10), status: "pendiente" },
        NOW,
      ),
    ).toBe(false);
  });
});

describe("sortOrdenesByPrioridad", () => {
  it("ordena por prioridad efectiva: una baja antigua sube sobre una media reciente", () => {
    const bajaAntigua = { id: 1, prioridad_pool: "baja", fecha_creacion: hace(100), status: "pendiente" };
    const mediaReciente = { id: 2, prioridad_pool: "media", fecha_creacion: hace(2), status: "pendiente" };
    const orden = sortOrdenesByPrioridad([mediaReciente, bajaAntigua]).map((o) => o.id);
    expect(orden).toEqual([1, 2]);
  });
});
