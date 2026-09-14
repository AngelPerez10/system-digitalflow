import { describe, expect, it } from "vitest";
import {
  groupOrdenesByPrioridad,
  ordenPrioridadEscalada,
  ordenPrioridadListBadge,
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
    const orden = sortOrdenesByPrioridad([mediaReciente, bajaAntigua], NOW).map((o) => o.id);
    expect(orden).toEqual([1, 2]);
  });
});

describe("ordenPrioridadListBadge", () => {
  it("el chip visible es la del formulario (Alta / Media / Baja), no la escalada", () => {
    const labels = [
      ordenPrioridadListBadge(
        { prioridad_pool: "baja", fecha_creacion: hace(10), status: "pendiente" },
        NOW,
      ).visibleLabel,
      ordenPrioridadListBadge(
        { prioridad_pool: "baja", fecha_creacion: hace(80), status: "pendiente" },
        NOW,
      ).visibleLabel,
      ordenPrioridadListBadge(
        { prioridad_pool: "media", fecha_creacion: hace(80), status: "pendiente" },
        NOW,
      ).visibleLabel,
      ordenPrioridadListBadge(
        { prioridad_pool: "alta", fecha_creacion: hace(100), status: "pendiente" },
        NOW,
      ).visibleLabel,
    ];
    expect(labels).toEqual(["Baja", "Baja", "Media", "Alta"]);
    for (const label of labels) {
      expect(["Alta", "Media", "Baja"]).toContain(label);
      expect(label).not.toMatch(/ a /);
    }
  });

  it("una media antigua sigue diciendo Media; las horas solo marcan escalada para la cola", () => {
    const badge = ordenPrioridadListBadge(
      { prioridad_pool: "media", fecha_creacion: hace(80), status: "pendiente" },
      NOW,
    );
    expect(badge.visibleLabel).toBe("Media");
    expect(badge.assignedKey).toBe("MEDIA");
    expect(badge.effectiveKey).toBe("ALTA");
    expect(badge.escalada).toBe(true);
    expect(badge.ariaLabel).toMatch(/Media/i);
    expect(badge.ariaLabel).toMatch(/antigüedad/i);
  });

  it("si no escala, muestra la asignada", () => {
    const badge = ordenPrioridadListBadge(
      { prioridad_pool: "media", fecha_creacion: hace(10), status: "pendiente" },
      NOW,
    );
    expect(badge.visibleLabel).toBe("Media");
    expect(badge.effectiveKey).toBe("MEDIA");
    expect(badge.escalada).toBe(false);
  });
});

describe("groupOrdenesByPrioridad", () => {
  it("agrupa por la prioridad del formulario, no por la escalada", () => {
    const sections = groupOrdenesByPrioridad(
      [
        { id: 1, prioridad_pool: "media", fecha_creacion: hace(80), status: "pendiente" },
        { id: 2, prioridad_pool: "baja", fecha_creacion: hace(10), status: "pendiente" },
      ],
      NOW,
    );
    const media = sections.find((s) => s.key === "MEDIA");
    const baja = sections.find((s) => s.key === "BAJA");
    expect(media?.ordenes.map((o) => o.id)).toEqual([1]);
    expect(baja?.ordenes.map((o) => o.id)).toEqual([2]);
    expect(sections.some((s) => s.key === "ALTA")).toBe(false);
  });
});
