import { describe, expect, it } from "vitest";
import { computeTasaCierreMensual, tasaCierreVisual } from "../CotizacionesViewParts";

describe("computeTasaCierreMensual", () => {
  it("calcula autorizadas / (autorizadas + pendientes)", () => {
    expect(computeTasaCierreMensual(84301.82, 76047.33)).toBeCloseTo(
      (84301.82 / (84301.82 + 76047.33)) * 100,
      5,
    );
  });

  it("devuelve 100 cuando solo hay autorizadas", () => {
    expect(computeTasaCierreMensual(1500, 0)).toBe(100);
  });

  it("devuelve 0 cuando solo hay pendientes", () => {
    expect(computeTasaCierreMensual(0, 500)).toBe(0);
  });

  it("devuelve null si no hay montos en juego", () => {
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

  it("cambia el matiz con el porcentaje (rojo → azul → verde)", () => {
    const low = tasaCierreVisual(10).color;
    const mid = tasaCierreVisual(50).color;
    const high = tasaCierreVisual(95).color;
    expect(low).toMatch(/^hsl\(\d+ 72% 62%\)$/);
    expect(mid).toMatch(/^hsl\(\d+ 72% 62%\)$/);
    expect(high).toMatch(/^hsl\(\d+ 72% 62%\)$/);
    const hue = (c: string) => Number(c.match(/hsl\((\d+)/)?.[1] ?? -1);
    expect(hue(low)).toBeLessThan(80);
    expect(hue(mid)).toBeGreaterThan(180);
    expect(hue(high)).toBeLessThan(hue(mid));
    expect(hue(high)).toBeGreaterThan(120);
  });

  it("sin datos usa color neutro", () => {
    expect(tasaCierreVisual(null).nivel).toBe("sin-datos");
  });
});
