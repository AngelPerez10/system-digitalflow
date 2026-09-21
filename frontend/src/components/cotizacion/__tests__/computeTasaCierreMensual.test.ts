import { describe, expect, it } from "vitest";
import { computeTasaCierreMensual, tasaCierreVisual } from "../CotizacionesViewParts";

describe("computeTasaCierreMensual", () => {
  it("calcula autorizadas / (autorizadas + pendientes) por conteo", () => {
    expect(computeTasaCierreMensual(26, 49)).toBeCloseTo((26 / (26 + 49)) * 100, 5);
    expect(computeTasaCierreMensual(10, 11)).toBeCloseTo((10 / 21) * 100, 5);
  });

  it("devuelve 100 cuando solo hay autorizadas", () => {
    expect(computeTasaCierreMensual(15, 0)).toBe(100);
  });

  it("devuelve 0 cuando solo hay pendientes", () => {
    expect(computeTasaCierreMensual(0, 5)).toBe(0);
  });

  it("devuelve null si no hay cotizaciones en juego", () => {
    expect(computeTasaCierreMensual(0, 0)).toBeNull();
  });

  it("ignora valores no finitos tratados como 0", () => {
    expect(computeTasaCierreMensual(Number.NaN, 0)).toBeNull();
    expect(computeTasaCierreMensual(200, Number.NaN)).toBe(100);
  });
});

describe("tasaCierreVisual", () => {
  it("marca baja / media / alta según umbrales", () => {
    expect(tasaCierreVisual(20).nivel).toBe("baja");
    expect(tasaCierreVisual(52.6).nivel).toBe("media");
    expect(tasaCierreVisual(85).nivel).toBe("alta");
  });

  it("usa rojo en baja, ámbar en media y verde en alta", () => {
    expect(tasaCierreVisual(20).color).toBe("rgb(248 113 113)");
    expect(tasaCierreVisual(52.6).color).toBe("rgb(251 191 36)");
    expect(tasaCierreVisual(85).color).toBe("rgb(74 222 128)");
  });

  it("sin datos usa color neutro", () => {
    expect(tasaCierreVisual(null).nivel).toBe("sin-datos");
  });
});
