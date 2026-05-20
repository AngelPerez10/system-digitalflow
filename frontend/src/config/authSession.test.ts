import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  clearAccessToken,
  getAccessToken,
  hasBearerFallback,
  isAccessTokenUsable,
  jwtExpiresAtMs,
  setAccessTokenFromLogin,
} from "./authSession";

function makeJwt(expSec: number): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ exp: expSec }));
  return `${header}.${payload}.sig`;
}

beforeEach(() => {
  sessionStorage.clear();
  clearAccessToken();
});

afterEach(() => {
  clearAccessToken();
});

describe("isAccessTokenUsable", () => {
  it("rejects expired tokens", () => {
    const expired = makeJwt(Math.floor(Date.now() / 1000) - 60);
    expect(isAccessTokenUsable(expired)).toBe(false);
  });

  it("accepts valid tokens", () => {
    const valid = makeJwt(Math.floor(Date.now() / 1000) + 3600);
    expect(isAccessTokenUsable(valid)).toBe(true);
  });
});

describe("setAccessTokenFromLogin", () => {
  it("stores token in memory for the tab session", () => {
    const token = makeJwt(Math.floor(Date.now() / 1000) + 3600);
    setAccessTokenFromLogin(token);
    expect(getAccessToken()).toBe(token);
    expect(hasBearerFallback()).toBe(true);
  });

  it("clears invalid tokens", () => {
    setAccessTokenFromLogin("short");
    expect(hasBearerFallback()).toBe(false);
  });

  it("removes legacy refresh key on clear", () => {
    sessionStorage.setItem("auth_refresh_fallback", "legacy");
    clearAccessToken();
    expect(sessionStorage.getItem("auth_refresh_fallback")).toBeNull();
  });
});

describe("jwtExpiresAtMs", () => {
  it("reads exp from payload", () => {
    const exp = Math.floor(Date.now() / 1000) + 100;
    const token = makeJwt(exp);
    expect(jwtExpiresAtMs(token)).toBe(exp * 1000);
  });
});
