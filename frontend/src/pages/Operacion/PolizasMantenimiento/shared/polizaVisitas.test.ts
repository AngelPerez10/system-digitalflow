import { describe, expect, it } from "vitest";
import {
  addMonthsIso,
  inferIntervaloMeses,
  visitDatesFromStart,
} from "./polizaVisitas";

describe("polizaVisitas", () => {
  it("addMonthsIso respeta fin de mes", () => {
    expect(addMonthsIso("2026-01-31", 1)).toBe("2026-03-03");
  });

  it("visitDatesFromStart espacia cada 4 meses", () => {
    expect(visitDatesFromStart("2026-04-20", 4)).toEqual([
      "2026-04-20",
      "2026-08-20",
      "2026-12-20",
    ]);
  });

  it("visitDatesFromStart espacia cada 2 meses", () => {
    expect(visitDatesFromStart("2026-08-18", 2)).toEqual([
      "2026-08-18",
      "2026-10-18",
      "2026-12-18",
    ]);
  });

  it("inferIntervaloMeses detecta 2 o 4 meses", () => {
    expect(inferIntervaloMeses("2026-08-18", "2026-10-18")).toBe(2);
    expect(inferIntervaloMeses("2026-04-20", "2026-08-20")).toBe(4);
  });
});
