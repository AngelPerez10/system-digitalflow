import { describe, expect, it } from "vitest";
import { importeConLetra, numeroALetras } from "../shared/contratoFormato";

describe("numeroALetras", () => {
  it.each([
    [1, "uno"],
    [16, "dieciséis"],
    [36, "treinta y seis"],
    [100, "cien"],
    [101, "ciento uno"],
    [1000, "mil"],
    [1250, "mil doscientos cincuenta"],
    [21000, "veintiún mil"],
    [31000, "treinta y un mil"],
    [1_000_000, "un millón"],
    [2_500_000, "dos millones quinientos mil"],
  ])("%i → %s", (n, txt) => {
    expect(numeroALetras(n)).toBe(txt);
  });
});

describe("importeConLetra", () => {
  it("usa el mismo formato que el PDF", () => {
    expect(importeConLetra("8000")).toMatch(/^\$8,000\.00 \(Ocho Mil Pesos 00\/100 M\.N\.\)$/);
    expect(importeConLetra(1250.5)).toContain("(Mil Doscientos Cincuenta Pesos 50/100 M.N.)");
  });
});
