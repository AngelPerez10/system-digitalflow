import { describe, expect, it } from "vitest";
import { conIva, numeroCampo, precioDesdeUtilidad, textoPorcentaje, utilidadDesdePrecio } from "./precioUtilidad";

describe("precioUtilidad", () => {
  it("calcula el precio con la utilidad sobre el costo", () => {
    expect(precioDesdeUtilidad(100, 30)).toBe(130);
    expect(precioDesdeUtilidad(1234.5, 17.5)).toBe(1450.54);
  });

  it("calcula la utilidad que deja un precio", () => {
    expect(utilidadDesdePrecio(100, 125)).toBe(25);
    expect(utilidadDesdePrecio(80, 60)).toBe(-25);
  });

  it("sin costo no calcula nada", () => {
    expect(precioDesdeUtilidad(0, 30)).toBeNull();
    expect(precioDesdeUtilidad(null, 30)).toBeNull();
    expect(utilidadDesdePrecio(0, 100)).toBeNull();
  });

  it("suma 16 % de IVA", () => {
    expect(conIva(100)).toBe(116);
    expect(conIva(null)).toBeNull();
  });

  it("lee el campo de texto", () => {
    expect(numeroCampo("")).toBeNull();
    expect(numeroCampo("1,250.50")).toBe(1250.5);
    expect(numeroCampo("abc")).toBeNull();
    expect(textoPorcentaje(30)).toBe("30");
  });
});
