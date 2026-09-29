import { describe, expect, it } from "vitest";
import type { Orden } from "../../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import { createEmptyProyectoDraft } from "../../Proyectos/shared/proyectoFormUtils";
import type { ProyectoRow } from "../../Proyectos/shared/proyectoTypes";
import type { EquipoSeccion } from "./equipoGrouping";
import { diasDeSemana, diffDias, lunesDe, mesesDeSemana, rangoSemana, recorrerJornadas, resumenSemana, semanaIso, tarjetasPorDia } from "./equipoSemana";

const orden = (id: number, fecha: string, cliente = "Cliente", status = "pendiente") =>
  ({ id, idx: id, folio: `ODT-${id}`, cliente, status, tecnico_asignado: 1, fecha_inicio: fecha }) as unknown as Orden;

const proyecto = (id: string, fecha: string, estado: ProyectoRow["estado"] = "en_proceso", jornadas: string[] = []): ProyectoRow => ({
  id,
  folio: `PRJ-${id}`,
  cliente: "Proyecto SA",
  fecha,
  estado,
  cotizacionFolio: "—",
  cotizacionOrigen: "digitalflow",
  cotizacionesCount: 0,
  equiposTotal: 0,
  equiposEntregados: 0,
  equiposInstalados: 0,
  draft: { ...createEmptyProyectoDraft(), fechasInicio: jornadas.length ? jornadas : [""] },
});

const seccion = (id: number | null, ordenes: Orden[], proyectos: ProyectoRow[] = []): EquipoSeccion => ({
  tecnico: { id, nombre: id == null ? "Sin asignar" : `Técnico ${id}`, avatarUrl: "" },
  ordenes,
  proyectos,
  pendientes: 0,
});

const LUNES = "2026-09-28";

describe("fechas de la semana", () => {
  it("lunesDe: el domingo cierra la semana", () => {
    expect(lunesDe("2026-09-28")).toBe(LUNES);
    expect(lunesDe("2026-10-04")).toBe(LUNES);
    expect(lunesDe("2026-10-05")).toBe("2026-10-05");
  });

  it("diasDeSemana y mesesDeSemana cruzan de mes", () => {
    expect(diasDeSemana(LUNES)).toEqual(["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
    expect(mesesDeSemana(LUNES)).toEqual(["2026-09", "2026-10"]);
    expect(mesesDeSemana("2026-09-14")).toEqual(["2026-09"]);
  });

  it("rangoSemana abrevia según mes y año", () => {
    expect(rangoSemana("2026-09-14")).toBe("14 – 20 sep 2026");
    expect(rangoSemana(LUNES)).toBe("28 sep – 4 oct 2026");
    expect(rangoSemana("2025-12-29")).toBe("29 dic 2025 – 4 ene 2026");
  });

  it("semanaIso", () => {
    expect(semanaIso("2026-09-28")).toBe(40);
    expect(semanaIso("2025-12-29")).toBe(1);
  });
});

describe("tarjetasPorDia", () => {
  it("reparte por día y descarta lo de otras semanas", () => {
    const s = seccion(1, [orden(1, "2026-09-28"), orden(2, "2026-10-04"), orden(3, "2026-09-27")], [proyecto("p1", "2026-09-30")]);
    const dias = tarjetasPorDia(s, LUNES);
    expect(dias.map((d) => d.length)).toEqual([1, 0, 1, 0, 0, 0, 1]);
    expect(dias[2][0].kind).toBe("proyecto");
  });

  it("en un día: abiertas primero, órdenes antes que proyectos", () => {
    const s = seccion(1, [orden(1, LUNES, "B", "resuelto"), orden(2, LUNES, "Z")], [proyecto("p1", LUNES)]);
    const [lunes] = tarjetasPorDia(s, LUNES);
    expect(lunes.map((t) => (t.kind === "orden" ? t.orden.id : t.row.id))).toEqual([2, "p1", 1]);
  });
});

describe("proyectos de varios días", () => {
  it("aparecen en cada jornada de la semana con su número de día", () => {
    const p = proyecto("p1", "2026-09-01", "en_proceso", ["2026-10-03", "2026-10-04", "2026-10-05"]);
    const dias = tarjetasPorDia(seccion(1, [], [p]), LUNES);
    expect(dias.map((d) => d.length)).toEqual([0, 0, 0, 0, 0, 1, 1]);
    const sab = dias[5][0];
    expect(sab.kind === "proyecto" && sab.jornada).toEqual({ n: 1, total: 3 });
    expect(dias[5][0].key).toBe(dias[6][0].key);
    expect(dias[5][0].uid).not.toBe(dias[6][0].uid);
  });

  it("sin jornadas usa la fecha del proyecto", () => {
    const dias = tarjetasPorDia(seccion(1, [], [proyecto("p1", "2026-09-29")]), LUNES);
    expect(dias[1]).toHaveLength(1);
  });

  it("cuenta el proyecto una vez en la semana, pero en cada día que se trabaja", () => {
    const p = proyecto("p1", "2026-09-01", "en_proceso", ["2026-09-28", "2026-09-29"]);
    const r = resumenSemana([seccion(1, [], [p])], LUNES);
    expect(r.trabajos).toBe(1);
    expect(r.porDia).toEqual([1, 1, 0, 0, 0, 0, 0]);
  });
});

describe("resumenSemana", () => {
  it("cuenta únicos, sin asignar y técnicos con trabajo", () => {
    const p = proyecto("p1", "2026-09-29");
    const resumen = resumenSemana(
      [seccion(null, [orden(9, "2026-09-30")]), seccion(1, [orden(1, LUNES), orden(2, LUNES, "X", "resuelto")], [p]), seccion(2, [], [p]), seccion(3, [])],
      LUNES
    );
    expect(resumen.trabajos).toBe(4);
    expect(resumen.ordenes).toBe(3);
    expect(resumen.proyectos).toBe(1);
    expect(resumen.abiertos).toBe(3);
    expect(resumen.cerrados).toBe(1);
    expect(resumen.sinAsignar).toBe(1);
    expect(resumen.tecnicosConTrabajo).toBe(2);
    expect(resumen.tecnicos).toBe(3);
    expect(resumen.porDia).toEqual([2, 1, 1, 0, 0, 0, 0]);
  });
});

describe("cambio de día", () => {
  it("diffDias cruza meses y es negativo hacia atrás", () => {
    expect(diffDias("2026-09-28", "2026-10-02")).toBe(4);
    expect(diffDias("2026-10-02", "2026-09-28")).toBe(-4);
  });

  it("recorrerJornadas desplaza todas las jornadas los mismos días", () => {
    const p = proyecto("p1", "2026-09-01", "en_proceso", ["2026-09-28", "2026-09-29", "2026-09-30"]);
    expect(recorrerJornadas(p, "2026-09-29", "2026-10-01")).toEqual(["2026-09-30", "2026-10-01", "2026-10-02"]);
  });

  it("sin jornadas, la fecha del proyecto se vuelve la nueva jornada", () => {
    expect(recorrerJornadas(proyecto("p1", "2026-09-29"), "2026-09-29", "2026-09-30")).toEqual(["2026-09-30"]);
  });
});
