import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Orden, Usuario } from "../../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import { createEmptyProyectoDraft } from "../../Proyectos/shared/proyectoFormUtils";
import type { ProyectoRow } from "../../Proyectos/shared/proyectoTypes";
import type { EquipoHistorialEntry } from "./equipoHistorialApi";
import { buildReporteMes, describirMovimiento, diaCorto, etiquetaMes, mesDe, moverMes } from "./equipoReporteMes";

const orden = (id: number, fecha: string, status: string, tec: number | null, cliente = `Cliente ${id}`) =>
  ({ id, folio: `ODT-${id}`, cliente, status, fecha_inicio: fecha, tecnico_asignado: tec, servicios_realizados: ["Instalación GPS"], fotos_urls: [], creado_por: null }) as unknown as Orden;

function proyecto(id: string, fechas: string[], estado: string, tecs: { id: number; nombre: string }[], avance = 0): ProyectoRow {
  const draft = createEmptyProyectoDraft();
  draft.tecnicos = tecs.map((t, i) => ({ id: t.id, nombre: t.nombre, avatar_url: "", responsable: i === 0 }));
  draft.fechasInicio = fechas;
  draft.porcentajeAvance = avance;
  return {
    id, folio: `PRJ-${id}`, cliente: "Flotilla Norte", fecha: fechas[0], estado, cotizacionFolio: "—", cotizacionOrigen: "digitalflow",
    cotizacionesCount: 0, equiposTotal: 0, equiposEntregados: 0, equiposInstalados: 0, draft,
  } as unknown as ProyectoRow;
}

const usuarios: Usuario[] = [
  { id: 1, first_name: "Ana", last_name: "Pérez", email: "a@x.com" },
  { id: 2, first_name: "Beto", last_name: "Ruiz", email: "b@x.com" },
] as Usuario[];

const mov = (id: number, creado_at: string, extra: Partial<EquipoHistorialEntry> = {}): EquipoHistorialEntry => ({
  id, tipo: "orden", objeto_id: id, folio: `ODT-${id}`, cliente: "Cliente", accion: "reasignar", desde_id: 2, desde_nombre: "Beto Ruiz",
  hacia_id: 1, hacia_nombre: "Ana Pérez", desde_fecha: null, hacia_fecha: null, usuario: 1, usuario_nombre: "Admin", usuario_avatar_url: "", creado_at, ...extra,
});

const ordenes = [
  orden(1, "2026-09-02", "resuelto", 1),
  orden(2, "2026-09-10", "pendiente", 1),
  orden(3, "2026-09-11", "cancelada", 2),
  orden(4, "2026-08-30", "pendiente", 2), // otro mes
  orden(5, "2026-09-20", "pausado", null),
];
const proyectos = [
  proyecto("101", ["2026-09-08", "2026-09-09"], "en_proceso", [{ id: 1, nombre: "Ana Pérez" }, { id: 2, nombre: "Beto Ruiz" }], 40),
  proyecto("102", ["2026-10-01"], "en_proceso", [{ id: 2, nombre: "Beto Ruiz" }]), // otro mes
  proyecto("103", ["2026-09-15"], "cerrado", [{ id: 2, nombre: "Beto Ruiz" }], 100),
];
const historial = [
  mov(1, "2026-09-05T15:00:00"),
  mov(2, "2026-09-06T15:00:00", { accion: "deshacer", desde_id: 1, hacia_id: 1, desde_fecha: "2026-09-08", hacia_fecha: "2026-09-10" }),
  mov(3, "2026-08-20T15:00:00"), // otro mes
];

describe("reporte mensual de Equipo", () => {
  const data = buildReporteMes({ mes: "2026-09", ordenes, proyectos, usuarios, roster: usuarios, historial });

  it("solo incluye lo del mes", () => {
    expect(data.ordenes.map((o) => o.folio)).toEqual(["ODT-1", "ODT-2", "ODT-3", "ODT-5"]);
    expect(data.proyectos.map((p) => p.folio)).toEqual(["PRJ-101", "PRJ-103"]);
    expect(data.historial.map((h) => h.id)).toEqual([1, 2]);
  });

  it("calcula el resumen (completados, abiertos, cancelados y avance sin contar cancelados)", () => {
    expect(data.resumen).toMatchObject({ ordenes: 4, proyectos: 2, completados: 2, abiertos: 3, cancelados: 1, reasignaciones: 2 });
    expect(data.resumen.avance).toBeCloseTo(2 / 5);
  });

  it("agrupa por técnico ordenado por total y con su avance", () => {
    expect(data.tecnicos.map((t) => [t.nombre, t.total])).toEqual([["Ana Pérez", 3], ["Beto Ruiz", 3], ["Sin asignar", 1]]);
    const ana = data.tecnicos.find((t) => t.nombre === "Ana Pérez")!;
    expect(ana).toMatchObject({ ordenes: 2, proyectos: 1, completados: 1, abiertos: 2 });
  });

  it("divide el mes en semanas de lunes a domingo", () => {
    expect(data.semanas).toHaveLength(5);
    expect(data.semanas.map((w) => [w.lunes, w.domingo])).toEqual([
      ["2026-08-31", "2026-09-06"], ["2026-09-07", "2026-09-13"], ["2026-09-14", "2026-09-20"], ["2026-09-21", "2026-09-27"], ["2026-09-28", "2026-10-04"],
    ]);
    expect(data.semanas[0].filas.map((f) => f.folio)).toEqual(["ODT-1"]);
    expect(data.semanas[1].filas.map((f) => f.folio)).toEqual(["PRJ-101", "ODT-2", "ODT-3"]);
    expect(data.semanas[2].filas.map((f) => f.folio)).toEqual(["PRJ-103", "ODT-5"]);
    expect(data.semanas[1].filas[0]).toMatchObject({ tipo: "proyecto", fecha: "2026-09-08", fechaFin: "2026-09-09" });
    expect(data.semanas.map((w) => w.historial.length)).toEqual([2, 0, 0, 0, 0]);
    expect(diaCorto("2026-09-08")).toBe("Mar 08");
  });

  it("etiquetas y navegación de meses", () => {
    expect(etiquetaMes("2026-09")).toBe("Septiembre 2026");
    expect(moverMes("2026-01", -1)).toBe("2025-12");
    expect(moverMes("2026-12", 1)).toBe("2027-01");
    expect(mesDe("2026-09-29")).toBe("2026-09");
  });

  it("describe movimientos sin flechas", () => {
    expect(describirMovimiento(historial[0])).toBe("Beto Ruiz a Ana Pérez");
    expect(describirMovimiento(historial[1])).toBe("día 08/09 a 10/09");
  });

  it("genera el PDF (humo)", async () => {
    const { crearReporteMesPdf } = await import("./equipoReportePdf");
    const doc = await crearReporteMesPdf(data);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    if (process.env.REPORT_OUT) writeFileSync(process.env.REPORT_OUT, Buffer.from(doc.output("arraybuffer")));
  });

  it("pagina con datos abundantes (humo)", async () => {
    const muchas = Array.from({ length: 70 }, (_, i) => orden(100 + i, `2026-09-${String((i % 27) + 1).padStart(2, "0")}`, i % 4 === 0 ? "resuelto" : "pendiente", (i % 2) + 1, `Cliente con nombre largo número ${i}`));
    const hist = Array.from({ length: 45 }, (_, i) => mov(500 + i, `2026-09-${String((i % 27) + 1).padStart(2, "0")}T10:00:00`));
    const grande = buildReporteMes({ mes: "2026-09", ordenes: muchas, proyectos, usuarios, roster: usuarios, historial: hist });
    const { crearReporteMesPdf } = await import("./equipoReportePdf");
    const doc = await crearReporteMesPdf(grande);
    expect(doc.getNumberOfPages()).toBeGreaterThan(2);
    if (process.env.REPORT_OUT_BIG) writeFileSync(process.env.REPORT_OUT_BIG, Buffer.from(doc.output("arraybuffer")));
  });
});
