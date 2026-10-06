import { describe, expect, it } from "vitest";
import {
  computePolizaEstado,
  computePolizaStats,
  fechaRelativa,
  formatFechaCorta,
  sortPolizasPorUrgencia,
} from "./polizaEstado";
import type { PolizaRow } from "./polizaListTypes";

const HOY = "2026-05-10";

const row = (id: number, visitas: string[]): PolizaRow => ({
  id,
  idx: 10000 + id,
  folio: `POL-${10000 + id}`,
  clienteId: "1",
  cliente: "Cliente",
  tipo: "cctv",
  tipoLabel: "Videovigilancia CCTV",
  servicioTipo: "",
  equiposAtendidos: "",
  cotizacionId: "1",
  cotizacionFolio: "COT-1",
  visitas,
  estado: computePolizaEstado(visitas, HOY),
});

describe("polizaEstado", () => {
  it("estado según la próxima visita", () => {
    expect(computePolizaEstado(["2026-05-10"], HOY)).toBe("proxima_visita");
    expect(computePolizaEstado(["2026-06-09"], HOY)).toBe("proxima_visita");
    expect(computePolizaEstado(["2026-06-10"], HOY)).toBe("vigente");
    expect(computePolizaEstado(["2026-01-01", "2026-05-09"], HOY)).toBe("vencida");
  });

  it("ordena vencidas → próximas → vigentes", () => {
    const vigente = row(1, ["2026-09-01"]);
    const proximaLejana = row(2, ["2026-06-01"]);
    const proximaCercana = row(3, ["2026-05-12"]);
    const vencida = row(4, ["2026-02-01"]);
    const orden = sortPolizasPorUrgencia([vigente, proximaLejana, vencida, proximaCercana], HOY);
    expect(orden.map((r) => r.id)).toEqual([4, 3, 2, 1]);
  });

  it("cuenta por estado", () => {
    const stats = computePolizaStats([row(1, ["2026-09-01"]), row(2, ["2026-05-12"]), row(3, ["2026-02-01"])]);
    expect(stats).toEqual({ total: 3, vigentes: 1, proximaVisita: 1, vencidas: 1 });
  });

  it("formatea fechas cortas y relativas", () => {
    expect(formatFechaCorta("2026-10-12", HOY)).toBe("12 oct");
    expect(formatFechaCorta("2027-01-03", HOY)).toBe("3 ene 2027");
    expect(fechaRelativa("2026-05-10", HOY)).toBe("hoy");
    expect(fechaRelativa("2026-05-11", HOY)).toBe("mañana");
    expect(fechaRelativa("2026-05-15", HOY)).toBe("en 5 días");
    expect(fechaRelativa("2026-05-07", HOY)).toBe("hace 3 días");
  });
});
