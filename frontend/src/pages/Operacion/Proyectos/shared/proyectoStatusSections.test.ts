import { describe, expect, it } from "vitest";
import { createEmptyProyectoDraft } from "./proyectoFormUtils";
import {
  groupProyectosByStatus,
  proyectoListStatusCountKey,
} from "./proyectoStatusSections";
import type { ProyectoRow } from "./proyectoTypes";

function row(id: string, estado: ProyectoRow["estado"] | string): ProyectoRow {
  return {
    id,
    folio: `PRJ-${id}`,
    cliente: "Cliente",
    fecha: "2026-08-01",
    estado: estado as ProyectoRow["estado"],
    cotizacionFolio: "—",
    cotizacionOrigen: "digitalflow",
    cotizacionesCount: 0,
    equiposTotal: 0,
    equiposEntregados: 0,
    equiposInstalados: 0,
    draft: createEmptyProyectoDraft(),
  };
}

describe("groupProyectosByStatus", () => {
  it("ordena secciones En proceso → Pausados → Cancelados → Cerrados → Otros y omite vacías", () => {
    const sections = groupProyectosByStatus([
      row("1", "cerrado"),
      row("2", "en_proceso"),
      row("3", "legacy"),
      row("4", "pausado"),
      row("5", ""),
      row("6", "cancelado"),
    ]);

    expect(sections.map((s) => s.key)).toEqual([
      "EN_PROCESO",
      "PAUSADO",
      "CANCELADO",
      "CERRADO",
      "OTROS",
    ]);
    expect(sections[0].rows.map((r) => r.id)).toEqual(["2", "5"]);
    expect(sections[1].rows.map((r) => r.id)).toEqual(["4"]);
    expect(sections[2].rows.map((r) => r.id)).toEqual(["6"]);
    expect(sections[3].rows.map((r) => r.id)).toEqual(["1"]);
    expect(sections[4].rows.map((r) => r.id)).toEqual(["3"]);
  });

  it("omite secciones sin filas", () => {
    const sections = groupProyectosByStatus([row("1", "en_proceso"), row("2", "en_proceso")]);
    expect(sections).toHaveLength(1);
    expect(sections[0].key).toBe("EN_PROCESO");
    expect(sections[0].rows).toHaveLength(2);
  });
});

describe("proyectoListStatusCountKey", () => {
  it("mapea estados conocidos y vacío a segmentos; legacy a null", () => {
    expect(proyectoListStatusCountKey("en_proceso")).toBe("en_proceso");
    expect(proyectoListStatusCountKey("")).toBe("en_proceso");
    expect(proyectoListStatusCountKey("pausado")).toBe("pausado");
    expect(proyectoListStatusCountKey("cerrado")).toBe("cerrado");
    expect(proyectoListStatusCountKey("cancelado")).toBe("cancelado");
    expect(proyectoListStatusCountKey("legacy")).toBeNull();
  });
});
