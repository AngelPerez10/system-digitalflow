import { describe, expect, it } from "vitest";
import {
  normalizeStatusAdministrativo,
  normalizeFotosExtraFromOrden,
  ORDEN_BASE_MAX_FOTOS,
} from "./ordenesPageTypes";

describe("ordenesPageTypes single source", () => {
  it("normalizes admin status", () => {
    expect(normalizeStatusAdministrativo("ENVIADO")).toBe("enviado");
    expect(normalizeStatusAdministrativo("nope")).toBe("pendiente");
  });
  it("keeps foto base constant", () => {
    expect(ORDEN_BASE_MAX_FOTOS).toBe(5);
    expect(normalizeFotosExtraFromOrden({ fotos_extra_max: 2 })).toBe(2);
  });
});
