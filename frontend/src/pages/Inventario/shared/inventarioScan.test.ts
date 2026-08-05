import { describe, expect, it } from "vitest";
import { shouldAcceptScan } from "./scanDebounce";

describe("shouldAcceptScan", () => {
  it("rechaza código vacío", () => {
    expect(shouldAcceptScan("", 1000, null)).toBe(false);
  });

  it("acepta el primer escaneo", () => {
    expect(shouldAcceptScan("ABC123", 1000, null)).toBe(true);
  });

  it("rechaza el mismo código dentro de la ventana de debounce", () => {
    const last = { code: "ABC123", at: 1000 };
    expect(shouldAcceptScan("ABC123", 1100, last)).toBe(false);
  });

  it("acepta el mismo código después de la ventana de debounce", () => {
    const last = { code: "ABC123", at: 1000 };
    expect(shouldAcceptScan("ABC123", 1400, last)).toBe(true);
  });

  it("acepta códigos distintos sin importar la ventana", () => {
    const last = { code: "ABC123", at: 1000 };
    expect(shouldAcceptScan("XYZ789", 1050, last)).toBe(true);
  });
});
