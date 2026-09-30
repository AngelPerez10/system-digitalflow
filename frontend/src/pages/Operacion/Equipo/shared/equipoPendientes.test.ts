import { describe, expect, it } from "vitest";
import type { Orden } from "../../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import type { ProyectoRow } from "../../Proyectos/shared/proyectoTypes";
import { pendientesDelMes } from "./equipoPendientes";

const orden = (id: number, o: Partial<Orden>) => ({ id, cliente: `C${id}`, status: "pendiente", tecnico_asignado: null, fecha_inicio: "2026-09-10", ...o }) as unknown as Orden;
const proyecto = (id: string, draft: Record<string, unknown>) =>
  ({ id, folio: id, cliente: `P${id}`, estado: "en_proceso", fecha: "2026-09-01", draft: { fechasInicio: ["2026-09-15"], tecnicos: [], auxiliares: [], ...draft } }) as unknown as ProyectoRow;

describe("pendientesDelMes", () => {
  it("incluye órdenes abiertas sin técnico del mes y excluye asignadas, cerradas y de otro mes", () => {
    const r = pendientesDelMes(
      [
        orden(1, {}),
        orden(2, { tecnico_asignado: 7 }),
        orden(3, { status: "resuelto" }),
        orden(4, { fecha_inicio: "2026-10-02" }),
        orden(5, { fecha_inicio: "2026-09-02" }),
      ],
      [],
      "2026-09",
    );
    expect(r.map((p) => p.id)).toEqual(["5", "1"]);
  });

  it("incluye proyectos activos sin equipo con alguna jornada en el mes", () => {
    const r = pendientesDelMes(
      [],
      [
        proyecto("a", {}),
        proyecto("b", { tecnicos: [{ id: 3, nombre: "Ana", responsable: true }] }),
        proyecto("c", { fechasInicio: ["2026-10-05"] }),
      ],
      "2026-09",
    );
    expect(r.map((p) => p.id)).toEqual(["a"]);
    expect(r[0].fecha).toBe("2026-09-15");
  });
});
