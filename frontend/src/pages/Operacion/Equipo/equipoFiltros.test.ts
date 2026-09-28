import { describe, expect, it } from "vitest";
import type { Orden } from "../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import { createEmptyProyectoDraft } from "../Proyectos/shared/proyectoFormUtils";
import type { ProyectoRow } from "../Proyectos/shared/proyectoTypes";
import { EQUIPO_FILTROS_DEFAULT, filtrarSeccionesEquipo } from "./equipoFiltros";
import type { EquipoSeccion } from "./equipoGrouping";

const orden = (id: number, cliente: string, status = "pendiente") =>
  ({ id, idx: id, folio: `ODT-${id}`, cliente, status, tecnico_asignado: 1 }) as unknown as Orden;

const proyecto = (id: string, cliente: string, estado: ProyectoRow["estado"] = "en_proceso"): ProyectoRow => ({
  id,
  folio: `PRJ-${id}`,
  cliente,
  fecha: "2026-09-01",
  estado,
  cotizacionFolio: "—",
  cotizacionOrigen: "digitalflow",
  cotizacionesCount: 0,
  equiposTotal: 0,
  equiposEntregados: 0,
  equiposInstalados: 0,
  draft: createEmptyProyectoDraft(),
});

const seccion = (nombre: string, ordenes: Orden[], proyectos: ProyectoRow[]): EquipoSeccion => ({
  tecnico: { id: 1, nombre, avatarUrl: "" },
  ordenes,
  proyectos,
  pendientes: 0,
});

describe("filtrarSeccionesEquipo", () => {
  const base = [
    seccion("Ana Pérez", [orden(1, "Zeta SA"), orden(2, "Alfa SA", "resuelto")], [proyecto("p1", "Beta"), proyecto("p2", "Gama", "cerrado")]),
  ];

  it("por defecto deja solo lo abierto", () => {
    const [s] = filtrarSeccionesEquipo(base, EQUIPO_FILTROS_DEFAULT);
    expect(s.ordenes.map((o) => o.id)).toEqual([1]);
    expect(s.proyectos.map((r) => r.id)).toEqual(["p1"]);
  });

  it("«Todos» incluye cerrados", () => {
    const [s] = filtrarSeccionesEquipo(base, { ...EQUIPO_FILTROS_DEFAULT, estado: "todos" });
    expect(s.ordenes).toHaveLength(2);
    expect(s.proyectos).toHaveLength(2);
  });

  it("tipo filtra órdenes o proyectos", () => {
    const [s] = filtrarSeccionesEquipo(base, { ...EQUIPO_FILTROS_DEFAULT, tipo: "proyectos" });
    expect(s.ordenes).toEqual([]);
    expect(s.proyectos).toHaveLength(1);
  });

  it("buscar por cliente o folio", () => {
    const [s] = filtrarSeccionesEquipo(base, { ...EQUIPO_FILTROS_DEFAULT, estado: "todos", q: "alfa" });
    expect(s.ordenes.map((o) => o.id)).toEqual([2]);
    expect(s.proyectos).toEqual([]);
  });

  it("si el técnico coincide se ven todas sus filas", () => {
    const [s] = filtrarSeccionesEquipo(base, { ...EQUIPO_FILTROS_DEFAULT, q: "ana" });
    expect(s.ordenes.map((o) => o.id)).toEqual([1]);
    expect(s.proyectos.map((r) => r.id)).toEqual(["p1"]);
  });

  it("ordenar por cliente A–Z", () => {
    const [s] = filtrarSeccionesEquipo(base, { ...EQUIPO_FILTROS_DEFAULT, estado: "todos", orden: "cliente" });
    expect(s.ordenes.map((o) => o.cliente)).toEqual(["Alfa SA", "Zeta SA"]);
  });
});
