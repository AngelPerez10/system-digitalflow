import { describe, expect, it } from "vitest";
import {
  dateRangeFromFechasInicio,
  expandFechasInicioRange,
  filledFechasInicio,
} from "./proyectoFormUtils";

describe("expandFechasInicioRange", () => {
  it("expande un rango inclusivo día a día", () => {
    expect(expandFechasInicioRange("2026-07-01", "2026-07-03")).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
    ]);
  });

  it("intercambia si fin es anterior a inicio", () => {
    expect(expandFechasInicioRange("2026-07-05", "2026-07-03")).toEqual([
      "2026-07-03",
      "2026-07-04",
      "2026-07-05",
    ]);
  });

  it("con solo inicio devuelve un día", () => {
    expect(expandFechasInicioRange("2026-07-10", "")).toEqual(["2026-07-10"]);
  });

  it("vacío devuelve placeholder", () => {
    expect(expandFechasInicioRange("", "")).toEqual([""]);
  });
});

describe("dateRangeFromFechasInicio", () => {
  it("toma extremos de la lista", () => {
    expect(dateRangeFromFechasInicio(["2026-07-03", "2026-07-01", "2026-07-02"])).toEqual({
      start: "2026-07-01",
      end: "2026-07-03",
    });
  });

  it("lista vacía", () => {
    expect(dateRangeFromFechasInicio([""])).toEqual({ start: "", end: "" });
    expect(filledFechasInicio(["", "  "])).toEqual([]);
  });
});
