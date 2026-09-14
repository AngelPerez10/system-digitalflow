import { describe, expect, it } from "vitest";
import { clienteComboSelectedKey, usuarioComboLabel, withSelectedComboItem } from "./ordenHeroComboBoxUtils";

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

describe("withSelectedComboItem", () => {
  it("injects the selected row when the catalog no longer contains it", () => {
    const items = [
      { id: "__new__", label: "Nuevo Cliente" },
      { id: "9", label: "Otro" },
    ];
    expect(
      withSelectedComboItem(items, "12", { id: "12", label: "Alejandra" }).map((i) => i.id),
    ).toEqual(["12", "__new__", "9"]);
  });

  it("keeps the list unchanged when the key is already present", () => {
    const items = [{ id: "12::4", label: "Alejandra" }];
    expect(withSelectedComboItem(items, "12::4", { id: "12::4", label: "Alejandra" })).toBe(items);
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
