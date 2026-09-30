import { describe, expect, it } from "vitest";
import type { Orden } from "../../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import type { ProyectoRow } from "../../Proyectos/shared/proyectoTypes";
import { bitacoraProyecto, infoOrden, notaTecnicoProyecto } from "./equipoInfo";

/** `fechasInicio` a propósito desordenadas: la nota va por índice, no por jornada. */
const proyecto = (notas: string[], fechas = ["2026-09-30", "2026-09-28", "2026-10-01"]) =>
  ({
    id: "p1",
    folio: "p1",
    cliente: "P",
    estado: "en_proceso",
    draft: { fechasInicio: fechas, notasPorDia: notas.map((nota, i) => ({ id: String(i), nota, imagenesUrls: [] })) },
  }) as unknown as ProyectoRow;

describe("infoOrden", () => {
  it("expone la problemática y el comentario del técnico sin espacios de sobra", () => {
    const d = infoOrden({ id: 1, cliente: "C", status: "pendiente", problematica: "  No  enciende ", comentario_tecnico: "Se cambió\nfuente" } as unknown as Orden, true);
    expect(d.detalleLabel).toBe("Problemática");
    expect(d.detalle).toBe("No enciende");
    expect(d.comentario).toBe("Se cambió fuente");
  });
});

describe("bitacoraProyecto", () => {
  it("empareja cada nota con la fecha de su mismo índice y omite las vacías", () => {
    expect(bitacoraProyecto(proyecto(["uno", "  ", "tres"]))).toEqual([
      { n: 1, fecha: "2026-09-30", nota: "uno" },
      { n: 3, fecha: "2026-10-01", nota: "tres" },
    ]);
  });
});

describe("notaTecnicoProyecto", () => {
  it("usa la nota del día indicado", () => {
    expect(notaTecnicoProyecto(proyecto(["día 30", "día 28"]), "2026-09-28")).toBe("día 28");
  });

  it("sin nota ese día (o sin día), toma la última escrita", () => {
    expect(notaTecnicoProyecto(proyecto(["día 30", "día 28", "  "]), "2026-10-01")).toBe("día 28");
    expect(notaTecnicoProyecto(proyecto(["día 30"]))).toBe("día 30");
    expect(notaTecnicoProyecto(proyecto([]))).toBe("");
  });
});
