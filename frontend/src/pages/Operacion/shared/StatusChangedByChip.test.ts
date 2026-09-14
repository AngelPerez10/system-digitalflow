import { describe, expect, it } from "vitest";
import {
  initialsFromDisplayName,
  resolveOrdenStatusFallbackName,
  resolveStatusAudit,
  resolveStatusChangedByName,
} from "./statusChangedBy";

describe("resolveStatusChangedByName", () => {
  it("prioriza nombre completo sobre username", () => {
    expect(resolveStatusChangedByName("Ana García", "ana")).toBe("Ana García");
    expect(resolveStatusChangedByName("", "ana")).toBe("ana");
    expect(resolveStatusChangedByName(null, null)).toBe("");
  });
});

describe("resolveStatusAudit", () => {
  it("usa sello primario y cae a fallback de creador", () => {
    expect(
      resolveStatusAudit({
        name: "Ana",
        at: "2026-09-07T15:27:00Z",
        fallbackName: "Otro",
        fallbackAt: "2026-01-01T00:00:00Z",
      }),
    ).toEqual({
      name: "Ana",
      at: "2026-09-07T15:27:00Z",
      fromFallback: false,
    });
    expect(
      resolveStatusAudit({
        name: "",
        at: "",
        fallbackName: "Creador",
        fallbackAt: "2026-01-01T00:00:00Z",
      }),
    ).toEqual({
      name: "Creador",
      at: "2026-01-01T00:00:00Z",
      fromFallback: true,
    });
    expect(resolveStatusAudit({ name: "", at: "" })).toBeNull();
  });

  it("usa el creador cuando hay fecha de status pero no hay autor", () => {
    expect(
      resolveStatusAudit({
        name: "",
        at: "2026-09-07T15:27:00Z",
        fallbackName: "Ana García",
        fallbackAt: "2026-09-07T15:00:00Z",
      }),
    ).toEqual({
      name: "Ana García",
      at: "2026-09-07T15:27:00Z",
      fromFallback: true,
    });
  });
});

describe("resolveOrdenStatusFallbackName", () => {
  it("prioriza creador y cae a último editor", () => {
    expect(
      resolveOrdenStatusFallbackName({
        creado_por_full_name: "Ana",
        actualizado_por_username: "luis",
      }),
    ).toBe("Ana");
    expect(
      resolveOrdenStatusFallbackName({
        actualizado_por_full_name: "Luis Pérez",
      }),
    ).toBe("Luis Pérez");
  });
});

describe("initialsFromDisplayName", () => {
  it("toma hasta dos iniciales; vacío sin iniciales (icono fallback)", () => {
    expect(initialsFromDisplayName("Ana García")).toBe("AG");
    expect(initialsFromDisplayName("Ana")).toBe("AN");
    expect(initialsFromDisplayName("")).toBe("");
  });
});
