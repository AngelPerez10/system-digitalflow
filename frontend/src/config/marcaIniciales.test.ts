import { describe, expect, it } from "vitest";
import { inicialesDeNombre } from "./marcaIniciales";

describe("inicialesDeNombre", () => {
  it("usa las dos primeras palabras", () => {
    expect(inicialesDeNombre("Grupo Intrax")).toBe("GI");
  });

  it("usa las dos primeras letras si hay una sola palabra", () => {
    expect(inicialesDeNombre("Intrax")).toBe("IN");
  });

  it("cae a GI si el nombre está vacío", () => {
    expect(inicialesDeNombre("   ")).toBe("GI");
  });
});
