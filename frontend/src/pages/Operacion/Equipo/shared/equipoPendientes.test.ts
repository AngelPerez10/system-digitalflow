import { describe, expect, it } from "vitest";
import type { Orden } from "../../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import type { ProyectoRow } from "../../Proyectos/shared/proyectoTypes";
import { pendientesSinAsignar } from "./equipoPendientes";

const orden = (id: number, o: Partial<Orden>) => ({ id, cliente: `C${id}`, status: "pendiente", tecnico_asignado: null, fecha_inicio: "2026-09-10", ...o }) as unknown as Orden;
const proyecto = (id: string, draft: Record<string, unknown>) =>
  ({ id, folio: id, cliente: `P${id}`, estado: "en_proceso", fecha: "2026-09-01", draft: { fechasInicio: ["2026-09-15"], tecnicos: [], auxiliares: [], ...draft } }) as unknown as ProyectoRow;

describe("pendientesSinAsignar", () => {
  it("incluye órdenes abiertas sin técnico de cualquier mes y excluye asignadas y cerradas", () => {
    const r = pendientesSinAsignar(
      [
        orden(1, {}),
        orden(2, { tecnico_asignado: 7 }),
        orden(3, { status: "resuelto" }),
        orden(4, { fecha_inicio: "2026-10-02" }),
        orden(5, { fecha_inicio: "2026-09-02" }),
      ],
      [],
    );
    expect(r.map((p) => p.id)).toEqual(["5", "1", "4"]);
  });

  it("incluye proyectos activos sin equipo de cualquier mes, con su primera jornada", () => {
    const r = pendientesSinAsignar(
      [],
      [
        proyecto("a", {}),
        proyecto("b", { tecnicos: [{ id: 3, nombre: "Ana", responsable: true }] }),
        proyecto("c", { fechasInicio: ["2026-10-05"] }),
      ],
    );
    expect(r.map((p) => p.id)).toEqual(["a", "c"]);
    expect(r[0].fecha).toBe("2026-09-15");
  });
});
