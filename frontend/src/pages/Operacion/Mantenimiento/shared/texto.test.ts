import { describe, expect, it } from "vitest";
import { titleCase } from "./texto";

describe("titleCase", () => {
  it("pasa nombres en mayúsculas a formato de título y respeta siglas", () => {
    expect(titleCase("HUGO ENRIQUE")).toBe("Hugo Enrique");
    expect(titleCase("MCT LOGISTIC S.A. DE C.V.")).toBe("MCT Logistic S.A. De C.V.");
    expect(titleCase("CONDOMINIOS LA TERRAZA")).toBe("Condominios La Terraza");
    expect(titleCase("Alfa SA")).toBe("Alfa SA");
  });
});
