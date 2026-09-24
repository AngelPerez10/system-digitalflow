import { describe, expect, it } from "vitest";
import { formatPct, precioMercadoInfo } from "./precioMercado";

const item = (precio_mercado: string | null, precio_mercado_anterior: string | null, precio_unitario: string | null) => ({
  precio_mercado,
  precio_mercado_anterior,
  precio_unitario,
});

describe("precioMercadoInfo", () => {
  it("detecta que el precio subió y cuánto", () => {
    const r = precioMercadoInfo(item("1100.00", "1000.00", "900.00"));
    expect(r.tendencia).toBe("sube");
    expect(r.variacionPct).toBeCloseTo(10);
    expect(r.vsCostoPct).toBeCloseTo(22.22, 1);
  });

  it("detecta baja e igualdad", () => {
    expect(precioMercadoInfo(item("900", "1000", null)).tendencia).toBe("baja");
    expect(precioMercadoInfo(item("1000", "1000", null)).tendencia).toBe("igual");
  });

  it("sin precio anterior no hay tendencia", () => {
    const r = precioMercadoInfo(item("1000", null, null));
    expect(r.tendencia).toBeNull();
    expect(r.variacionPct).toBeNull();
    expect(r.vsCostoPct).toBeNull();
  });

  it("sin precio de mercado todo queda vacío salvo el costo", () => {
    const r = precioMercadoInfo(item(null, null, "500"));
    expect(r.mercado).toBeNull();
    expect(r.costo).toBe(500);
  });
});

describe("formatPct", () => {
  it("pone signo y un decimal", () => {
    expect(formatPct(10)).toBe("+10%");
    expect(formatPct(-2.345)).toBe("−2.3%");
    expect(formatPct(null)).toBe("");
  });
});
