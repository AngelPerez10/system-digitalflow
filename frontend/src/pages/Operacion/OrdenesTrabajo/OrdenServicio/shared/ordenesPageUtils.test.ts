import { describe, expect, it } from "vitest";
import {
  ORDEN_STATUS_CHANGE_RECENT_MS,
  isOrdenStatusChangeRecent,
} from "./ordenesPageUtils";

describe("isOrdenStatusChangeRecent", () => {
  const now = new Date("2026-08-07T12:00:00.000Z").getTime();

  it("returns false without status_changed_at", () => {
    expect(isOrdenStatusChangeRecent({}, now)).toBe(false);
    expect(isOrdenStatusChangeRecent({ status_changed_at: null }, now)).toBe(false);
    expect(isOrdenStatusChangeRecent(null, now)).toBe(false);
  });

  it("returns true within 48 hours", () => {
    const recent = new Date(now - ORDEN_STATUS_CHANGE_RECENT_MS + 60_000).toISOString();
    expect(isOrdenStatusChangeRecent({ status_changed_at: recent }, now)).toBe(true);
  });

  it("returns false at or beyond 48 hours", () => {
    const old = new Date(now - ORDEN_STATUS_CHANGE_RECENT_MS).toISOString();
    expect(isOrdenStatusChangeRecent({ status_changed_at: old }, now)).toBe(false);
  });

  it("returns false for future timestamps", () => {
    const future = new Date(now + 60_000).toISOString();
    expect(isOrdenStatusChangeRecent({ status_changed_at: future }, now)).toBe(false);
  });
});
