import { describe, expect, it } from "vitest";
import { computePolizaEstado } from "./polizaEstado";
import { gruposAgenda, lunesDe, tiraDeDias, urgencia, visitasPorDia } from "./polizaAgenda";
import type { PolizaRow } from "./polizaListTypes";

// Miércoles 6 de mayo de 2026.
const HOY = "2026-05-06";

const row = (id: number, cliente: string, visitas: string[]): PolizaRow => ({
  id,
  idx: id,
  folio: `POL-${id}`,
  clienteId: "1",
  cliente,
  tipo: "cctv",
  tipoLabel: "Videovigilancia CCTV",
  servicioTipo: "",
  equiposAtendidos: "",
  cotizacionId: "1",
  cotizacionFolio: "COT-1",
  visitas,
  estado: computePolizaEstado(visitas, HOY),
});

const rows = [
  row(1, "Zeta", ["2026-01-10", "2026-05-06", "2026-09-06"]),
  row(2, "Alfa", ["2026-05-06"]),
  row(3, "Beta", ["2026-05-09", "2026-05-14"]),
  row(4, "Gama", ["2026-05-30"]),
  row(5, "Fuera", ["2026-07-01"]),
];

describe("polizaAgenda", () => {
  it("agrupa por día dentro del rango y ordena por cliente", () => {
    const dias = visitasPorDia(rows, HOY, 30);
    expect(dias.map((d) => d.fecha)).toEqual(["2026-05-06", "2026-05-09", "2026-05-14", "2026-05-30"]);
    expect(dias[0].visitas.map((v) => `${v.row.cliente} ${v.numero}/${v.total}`)).toEqual(["Alfa 1/1", "Zeta 2/3"]);
  });

  it("la tira empieza el lunes y cuenta visitas", () => {
    expect(lunesDe(HOY)).toBe("2026-05-04");
    const tira = tiraDeDias(visitasPorDia(rows, HOY, 30), HOY);
    expect(tira).toHaveLength(14);
    expect(tira[0]).toEqual({ fecha: "2026-05-04", visitas: 0, pasado: true });
    expect(tira[2]).toEqual({ fecha: "2026-05-06", visitas: 2, pasado: false });
  });

  it("separa hoy, esta semana, la próxima y más adelante", () => {
    const grupos = gruposAgenda(visitasPorDia(rows, HOY, 30), HOY);
    expect(grupos.map((g) => [g.id, g.dias.map((d) => d.fecha)])).toEqual([
      ["hoy", ["2026-05-06"]],
      ["semana", ["2026-05-09"]],
      ["proxima", ["2026-05-14"]],
      ["despues", ["2026-05-30"]],
    ]);
  });

  it("urgencia según la cercanía", () => {
    expect(urgencia("2026-05-06", HOY)).toBe("hoy");
    expect(urgencia("2026-05-09", HOY)).toBe("pronto");
    expect(urgencia("2026-05-20", HOY)).toBe("normal");
  });
});

describe("calendario mensual", () => {
  it("cuadrícula de 42 días desde el lunes y visitas del rango", async () => {
    const { cuadriculaMes, shiftMes, visitasEntre } = await import("./polizaAgenda");
    const grid = cuadriculaMes("2026-05");
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe("2026-04-27");
    expect(shiftMes("2026-12", 1)).toBe("2027-01");
    const mapa = visitasEntre(rows, grid[0], grid[41]);
    expect(mapa.get("2026-05-06")?.map((v) => v.row.cliente)).toEqual(["Alfa", "Zeta"]);
    expect(mapa.has("2026-07-01")).toBe(false);
  });
});
