import { describe, expect, it } from "vitest";
import { getOrdenesListPath, isOrdenesOwnOnly } from "./useOrdenesPagePermissions";

describe("getOrdenesListPath", () => {
  it("admin always uses full list", () => {
    expect(getOrdenesListPath({ ordenes: { view: true, own_only: true } }, true)).toBe("/ordenes");
  });

  it("own_only false uses full list", () => {
    expect(getOrdenesListPath({ ordenes: { view: true, own_only: false } }, false)).toBe("/ordenes");
  });

  it("own_only true uses tecnico list", () => {
    expect(getOrdenesListPath({ ordenes: { view: true, own_only: true } }, false)).toBe(
      "/ordenes-tecnico",
    );
  });

  it("defaults own_only to true when absent", () => {
    expect(isOrdenesOwnOnly({ ordenes: { view: true } }, false)).toBe(true);
    expect(getOrdenesListPath({ ordenes: { view: true } }, false)).toBe("/ordenes-tecnico");
  });
});
