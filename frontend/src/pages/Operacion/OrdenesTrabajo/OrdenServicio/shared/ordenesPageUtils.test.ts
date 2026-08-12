import { describe, expect, it } from "vitest";
import {
  ORDEN_STATUS_CHANGE_RECENT_MS,
  isOrdenStatusChangeRecent,
} from "./ordenesPageUtils";

describe("isOrdenStatusChangeRecent", () => {
  const now = new Date("2026-08-07T12:00:00.000Z").getTime();
  const recent = new Date(now - ORDEN_STATUS_CHANGE_RECENT_MS + 60_000).toISOString();

  it("returns false without status_changed_at", () => {
    expect(isOrdenStatusChangeRecent({ status: "resuelto" }, now)).toBe(false);
    expect(isOrdenStatusChangeRecent({ status: "resuelto", status_changed_at: null }, now)).toBe(false);
    expect(isOrdenStatusChangeRecent(null, now)).toBe(false);
  });

  it("returns true only when status is resuelto within 48 hours", () => {
    expect(isOrdenStatusChangeRecent({ status: "resuelto", status_changed_at: recent }, now)).toBe(true);
  });

  it("returns false when status is pendiente even if timestamp is recent", () => {
    expect(isOrdenStatusChangeRecent({ status: "pendiente", status_changed_at: recent }, now)).toBe(false);
  });

  it("returns false at or beyond 48 hours", () => {
    const old = new Date(now - ORDEN_STATUS_CHANGE_RECENT_MS).toISOString();
    expect(isOrdenStatusChangeRecent({ status: "resuelto", status_changed_at: old }, now)).toBe(false);
  });

  it("returns false for future timestamps", () => {
    const future = new Date(now + 60_000).toISOString();
    expect(isOrdenStatusChangeRecent({ status: "resuelto", status_changed_at: future }, now)).toBe(false);
  });
});
