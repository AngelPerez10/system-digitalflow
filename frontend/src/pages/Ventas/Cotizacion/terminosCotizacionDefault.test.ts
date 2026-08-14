import { describe, expect, it } from "vitest";
import { terminosCotizacionDefault } from "./terminosCotizacionDefault";

describe("terminosCotizacionDefault", () => {
  it("usa el nombre de la empresa en las cláusulas", () => {
    const text = terminosCotizacionDefault("Acme GPS");
    expect(text).toContain("Acme GPS");
    expect(text).not.toContain("Grupo Intrax");
  });
});
