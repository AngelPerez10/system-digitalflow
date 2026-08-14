import { describe, expect, it } from "vitest";
import { catalogFuenteLabel } from "./ordenCatalogoSearch";

describe("ordenCatalogoSearch", () => {
  it("nombra las fuentes como en Productos", () => {
    expect(catalogFuenteLabel("syscom")).toBe("SYSCOM");
    expect(catalogFuenteLabel("tvc")).toBe("TVC");
    expect(catalogFuenteLabel("manual")).toBe("Manual");
  });
});
