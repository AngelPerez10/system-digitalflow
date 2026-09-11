import { describe, expect, it } from "vitest";
import { clienteComboSelectedKey, usuarioComboLabel } from "./ordenHeroComboBoxUtils";

describe("clienteComboSelectedKey", () => {
  it("returns null without cliente", () => {
    expect(clienteComboSelectedKey(null, 3, ["1::3"])).toBeNull();
  });

  it("prefers contacto key when present in items", () => {
    expect(clienteComboSelectedKey(12, 4, ["12::4", "12"])).toBe("12::4");
  });

  it("falls back to cliente id", () => {
    expect(clienteComboSelectedKey(12, null, ["12"])).toBe("12");
  });

  it("falls back to first nested item for that cliente", () => {
    expect(clienteComboSelectedKey(12, 99, ["12::1"])).toBe("12::1");
  });
});

describe("usuarioComboLabel", () => {
  it("uses full name when both parts exist", () => {
    expect(usuarioComboLabel({ first_name: "Ana", last_name: "Ruiz", email: "a@x.com" })).toBe("Ana Ruiz");
  });

  it("uses email when name is incomplete", () => {
    expect(usuarioComboLabel({ first_name: "", last_name: "", email: "a@x.com" })).toBe("a@x.com");
  });
});
