import { describe, expect, it } from "vitest";
import { computePolizaEstado } from "../polizas/list/polizaEstado";
import type { PolizaRow } from "../polizas/list/polizaListTypes";
import type { ReporteMantenimiento } from "../reportes/reporteTypes";
import {
  buildItems,
  contarPorTipo,
  FILTROS_VACIOS,
  filtrarItems,
  filtrarSinTipo,
  filtrosSecundariosActivos,
  ordenarItems,
  reportesDelMes,
} from "./mantenimientoItems";

const HOY = "2026-05-10";

const pol = (id: number, cliente: string, visitas: string[]): PolizaRow => ({
  id,
  idx: id,
  folio: `POL-${id}`,
  clienteId: "1",
  cliente,
  tipo: "cctv",
  tipoLabel: "Videovigilancia CCTV",
  servicioTipo: "Preventivo",
  equiposAtendidos: "",
  cotizacionId: "1",
  cotizacionFolio: `COT-${id}`,
  visitas,
  estado: computePolizaEstado(visitas, HOY),
});

const rep = (id: number, cliente: string, fecha: string, tecnicos = "Ana Pérez", fotos = 1): ReporteMantenimiento => ({
  id,
  idx: id,
  folio: `RM-${id}`,
  orden_id: null,
  proyecto_id: id,
  origen_tipo: "proyecto",
  orden_folio: `PRJ-${id}`,
  orden_cliente: cliente,
  fecha_servicio: fecha,
  tecnico_nombre: tecnicos,
  foto_orden_url: "",
  secciones: [{ id: "s", titulo: "Zona", fotos_antes: Array(fotos).fill("a"), fotos_despues: [] }],
});

const polizas = [
  pol(1, "Vigente SA", ["2026-09-01"]),
  pol(2, "Vencida SA", ["2026-01-15"]),
  pol(3, "Proxima SA", ["2026-05-20"]),
];
const reportes = [rep(10, "Alfa", "2026-05-08"), rep(11, "Beta", "2026-04-02", "Luis Gómez", 0)];
const items = buildItems(polizas, reportes, HOY);

describe("mantenimientoItems", () => {
  it("junta pólizas y reportes con campos comunes", () => {
    expect(items).toHaveLength(5);
    expect(items.find((i) => i.key === "p-3")?.fecha).toBe("2026-05-20");
    expect(items.find((i) => i.key === "p-2")?.fecha).toBe("2026-01-15");
    expect(items.find((i) => i.key === "r-10")?.cliente).toBe("Alfa");
  });

  it("ordena: urgentes primero, luego lo más reciente", () => {
    expect(ordenarItems(items, HOY).map((i) => i.key)).toEqual(["p-2", "p-3", "p-1", "r-10", "r-11"]);
  });

  it("busca en ambos tipos", () => {
    const keys = (q: string) => filtrarItems(items, { ...FILTROS_VACIOS, q }).map((i) => i.key);
    expect(keys("alfa")).toEqual(["r-10"]);
    expect(keys("vencida")).toEqual(["p-2"]);
    expect(keys("luis")).toEqual(["r-11"]);
    expect(keys("cot-3")).toEqual(["p-3"]);
  });

  it("filtra por tipo y cuenta por tipo", () => {
    expect(filtrarItems(items, { ...FILTROS_VACIOS, tipo: "reporte" }).every((i) => i.kind === "reporte")).toBe(true);
    expect(contarPorTipo(filtrarSinTipo(items, FILTROS_VACIOS))).toEqual({ todo: 5, poliza: 3, reporte: 2 });
  });

  it("los filtros de un tipo dejan fuera al otro", () => {
    expect(filtrarItems(items, { ...FILTROS_VACIOS, estadoPoliza: "vencida" }).map((i) => i.key)).toEqual(["p-2"]);
    expect(filtrarItems(items, { ...FILTROS_VACIOS, evidencia: "sin" }).map((i) => i.key)).toEqual(["r-11"]);
    expect(filtrarItems(items, { ...FILTROS_VACIOS, tecnico: "Ana Pérez" }).map((i) => i.key)).toEqual(["r-10"]);
    expect(filtrosSecundariosActivos({ ...FILTROS_VACIOS, evidencia: "con", tecnico: "x" })).toBe(2);
  });

  it("cuenta reportes del mes", () => {
    expect(reportesDelMes(reportes, "2026-05")).toBe(1);
  });
});
