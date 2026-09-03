import { describe, expect, it } from "vitest";
import { cotizacionListPath, COTIZACION_LIST_PATH } from "./cotizacionListNav";

describe("cotizacionListPath", () => {
  it("sin búsqueda vuelve al listado limpio", () => {
    expect(cotizacionListPath("")).toBe(COTIZACION_LIST_PATH);
    expect(cotizacionListPath("   ")).toBe(COTIZACION_LIST_PATH);
  });

  it("incluye q en la URL", () => {
    expect(cotizacionListPath("mct")).toBe("/cotizacion?q=mct");
    expect(cotizacionListPath("a b")).toBe("/cotizacion?q=a%20b");
  });
});
