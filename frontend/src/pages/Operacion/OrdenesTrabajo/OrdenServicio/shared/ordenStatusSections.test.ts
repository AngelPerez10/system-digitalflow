import { describe, expect, it } from "vitest";
import { groupOrdenesByStatus } from "./ordenStatusSections";

describe("groupOrdenesByStatus", () => {
  it("ordena secciones Pendientes → Pausados → Resueltas → Otros y omite vacías", () => {
    const sections = groupOrdenesByStatus([
      { id: 1, status: "resuelto" },
      { id: 2, status: "pendiente" },
      { id: 3, status: "completado" },
      { id: 4, status: "en_curso" },
      { id: 5, status: "" },
      { id: 6, status: "pausado" },
    ]);

    expect(sections.map((s) => s.key)).toEqual(["PENDIENTE", "PAUSADO", "RESUELTA", "OTROS"]);
    expect(sections[0].ordenes.map((o) => o.id)).toEqual([2, 5]);
    expect(sections[1].ordenes.map((o) => o.id)).toEqual([6]);
    expect(sections[2].ordenes.map((o) => o.id)).toEqual([1, 3]);
    expect(sections[3].ordenes.map((o) => o.id)).toEqual([4]);
  });

  it("omite secciones sin filas", () => {
    const sections = groupOrdenesByStatus([
      { id: 1, status: "pendiente" },
      { id: 2, status: "PENDIENTE" },
    ]);
    expect(sections).toHaveLength(1);
    expect(sections[0].key).toBe("PENDIENTE");
    expect(sections[0].ordenes).toHaveLength(2);
  });
});
