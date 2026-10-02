import { describe, expect, it } from "vitest";
import { activeTipoFilterCount, parseFilterTipos, tiposQueryValue } from "./clientesListFilters";

describe("parseFilterTipos", () => {
  it("lee un tipo", () => {
    expect(parseFilterTipos(new URLSearchParams("tipo=EMPRESA"))).toEqual(["EMPRESA"]);
  });

  it("lee varios tipos separados por coma", () => {
    expect(parseFilterTipos(new URLSearchParams("tipo=EMPRESA,PROVEEDOR"))).toEqual([
      "EMPRESA",
      "PROVEEDOR",
    ]);
  });

  it("ignora valores inválidos y duplicados", () => {
    expect(parseFilterTipos(new URLSearchParams("tipo=EMPRESA,foo,EMPRESA"))).toEqual(["EMPRESA"]);
  });
});

describe("tiposQueryValue", () => {
  it("omite la query cuando no hay filtro o están todos", () => {
    expect(tiposQueryValue([])).toBeNull();
    expect(tiposQueryValue(["EMPRESA", "PERSONA_FISICA", "PROVEEDOR"])).toBeNull();
  });

  it("serializa un subconjunto", () => {
    expect(tiposQueryValue(["PERSONA_FISICA", "PROVEEDOR"])).toBe("PERSONA_FISICA,PROVEEDOR");
  });
});

describe("activeTipoFilterCount", () => {
  it("cuenta solo un subconjunto de tipos", () => {
    expect(activeTipoFilterCount([])).toBe(0);
    expect(activeTipoFilterCount(["EMPRESA"])).toBe(1);
    expect(activeTipoFilterCount(["EMPRESA", "PERSONA_FISICA", "PROVEEDOR"])).toBe(0);
  });
});
