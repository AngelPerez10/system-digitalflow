import { afterEach, describe, expect, it } from "vitest";
import {
  REMEMBERED_LOGIN_KEY,
  clearRememberedLogin,
  loadRememberedLogin,
  persistRememberedLogin,
} from "./rememberLogin";

afterEach(() => {
  localStorage.clear();
});

describe("rememberLogin", () => {
  it("guarda y recupera el usuario recortado", () => {
    persistRememberedLogin("  ana@sertel.mx  ");
    expect(loadRememberedLogin()).toBe("ana@sertel.mx");
    expect(localStorage.getItem(REMEMBERED_LOGIN_KEY)).toBe("ana@sertel.mx");
  });

  it("borra la clave si el valor queda vacío", () => {
    persistRememberedLogin("ana");
    persistRememberedLogin("   ");
    expect(loadRememberedLogin()).toBe("");
    expect(localStorage.getItem(REMEMBERED_LOGIN_KEY)).toBeNull();
  });

  it("clearRememberedLogin elimina el usuario", () => {
    persistRememberedLogin("ana");
    clearRememberedLogin();
    expect(loadRememberedLogin()).toBe("");
  });
});
