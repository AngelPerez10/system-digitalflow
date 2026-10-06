import { describe, expect, it } from "vitest";
import { clienteNombreFromOptionLabel, clienteToSelectOption, mergeClienteOptions } from "./polizaClienteOptions";

describe("clienteToSelectOption", () => {
  it("incluye empresa, persona y proveedor en la etiqueta", () => {
    expect(
      clienteToSelectOption({ id: 1, nombre: "ACME S.A. DE C.V.", tipo: "EMPRESA" }).label
    ).toBe("ACME S.A. DE C.V. · Empresa");
    expect(
      clienteToSelectOption({ id: 2, nombre: "Ana Pérez", tipo: "PERSONA_FISICA" }).label
    ).toBe("Ana Pérez · Persona");
    expect(
      clienteToSelectOption({ id: 3, nombre: "SYSCOM", tipo: "PROVEEDOR" }).label
    ).toBe("SYSCOM · Proveedor");
  });
});

describe("clienteNombreFromOptionLabel", () => {
  it("quita el tipo para el nombre de la póliza", () => {
    expect(clienteNombreFromOptionLabel("ACME S.A. DE C.V. · Empresa")).toBe("ACME S.A. DE C.V.");
  });
});

describe("mergeClienteOptions", () => {
  it("conserva el contacto elegido si no viene en la búsqueda", () => {
    const extra = { value: "9", label: "MCT LOGISTIC · Empresa" };
    const merged = mergeClienteOptions([{ value: "1", label: "Otro · Empresa" }], extra);
    expect(merged[0]).toEqual(extra);
  });
});
