import { describe, expect, it } from "vitest";
import {
  addMonthsIso,
  detectarPlan,
  visitasProgramadas,
  daysBetween,
  normalizarVisitas,
  proximaVisita,
  unAnioDespues,
  validarVisitas,
  visitasRealizadas,
} from "./polizaVisitas";

describe("polizaVisitas", () => {
  it("unAnioDespues maneja el 29 de febrero", () => {
    expect(unAnioDespues("2026-04-20")).toBe("2027-04-20");
    expect(unAnioDespues("2028-02-29")).toBe("2029-02-28");
  });

  it("normaliza: quita vacías y ordena, conservando repetidas", () => {
    expect(normalizarVisitas(["2026-06-01", "", "2026-04-20", "2026-04-20"])).toEqual([
      "2026-04-20",
      "2026-04-20",
      "2026-06-01",
    ]);
  });

  it("valida de 1 a 4 visitas dentro de 12 meses; permite el mismo día", () => {
    expect(validarVisitas([])).toMatch(/al menos una/);
    expect(validarVisitas(["2026-04-20", ""])).toMatch(/fecha de cada visita/);
    expect(validarVisitas(["2026-04-20", "2026-04-20"])).toBeNull();
    expect(validarVisitas(["2026-04-20", "2026-05-01", "2026-06-01", "2026-07-01", "2026-08-01"])).toMatch(
      /Máximo 4/,
    );
    expect(validarVisitas(["2026-04-20", "2027-04-20"])).toBeNull();
    expect(validarVisitas(["2026-04-20", "2027-04-21"])).toMatch(/12 meses/);
  });

  it("próxima visita, realizadas y días entre fechas", () => {
    const visitas = ["2026-01-10", "2026-05-10", "2026-05-10", "2026-09-10"];
    expect(proximaVisita(visitas, "2026-05-10")).toBe("2026-05-10");
    expect(proximaVisita(visitas, "2026-09-11")).toBe("");
    expect(visitasRealizadas(visitas, "2026-05-11")).toBe(3);
    expect(daysBetween("2026-05-10", "2026-05-15")).toBe(5);
    expect(daysBetween("2026-05-10", "2026-05-01")).toBe(-9);
  });

  it("addMonthsIso respeta fin de mes", () => {
    expect(addMonthsIso("2026-01-31", 1)).toBe("2026-03-03");
  });

  it("programa N visitas parejas en el año", () => {
    expect(visitasProgramadas("2026-09-29", 1)).toEqual(["2026-09-29"]);
    expect(visitasProgramadas("2026-09-29", 2)).toEqual(["2026-09-29", "2027-03-29"]);
    expect(visitasProgramadas("2026-04-20", 3)).toEqual(["2026-04-20", "2026-08-20", "2026-12-20"]);
    expect(visitasProgramadas("2026-04-20", 4)).toEqual(["2026-04-20", "2026-07-20", "2026-10-20", "2027-01-20"]);
    expect(visitasProgramadas("", 3)).toEqual([]);
  });

  it("detecta el plan de visitas guardadas", () => {
    expect(detectarPlan(["2026-04-20", "2026-08-20", "2026-12-20"])).toBe(3);
    expect(detectarPlan(["2026-04-20", "2026-04-20"])).toBe("libre");
    expect(detectarPlan([])).toBe("libre");
  });
});
