import { describe, expect, it } from "vitest";
import { contactoPrincipal, initialsFromName, mailHref, telHref, ubicacion } from "./clientesFormat";

describe("initialsFromName", () => {
  it("toma dos iniciales", () => {
    expect(initialsFromName("Grupo Intrax GPS")).toBe("GI");
    expect(initialsFromName("acme")).toBe("AC");
    expect(initialsFromName("   ")).toBe("?");
  });
});

describe("ubicacion", () => {
  it("une ciudad y estado sin huecos", () => {
    expect(ubicacion({ ciudad: "Hermosillo", estado: "Sonora" })).toBe("Hermosillo, Sonora");
    expect(ubicacion({ ciudad: " ", estado: "Sonora" })).toBe("Sonora");
    expect(ubicacion({})).toBe("");
  });
});

describe("contactoPrincipal", () => {
  it("prefiere al representante y al correo del registro", () => {
    expect(
      contactoPrincipal({
        representante: "Ana",
        correo: "ana@acme.mx",
        contactos: [{ nombre_apellido: "Luis", titulo: "", area_puesto: "", celular: "", correo: "luis@acme.mx" }],
      }),
    ).toEqual({ nombre: "Ana", correo: "ana@acme.mx" });
  });

  it("cae al contacto principal", () => {
    expect(
      contactoPrincipal({
        contactos: [
          { nombre_apellido: "Otro", titulo: "", area_puesto: "", celular: "", correo: "" },
          { nombre_apellido: "Luis", titulo: "", area_puesto: "", celular: "", correo: "luis@acme.mx", is_principal: true },
        ],
      }),
    ).toEqual({ nombre: "Luis", correo: "luis@acme.mx" });
  });
});

describe("telHref", () => {
  it("normaliza a dígitos", () => {
    expect(telHref("+52 (662) 123-4567")).toBe("tel:+526621234567");
    expect(telHref("662 123 4567")).toBe("tel:6621234567");
  });

  it("rechaza valores sin forma de teléfono", () => {
    expect(telHref("")).toBeNull();
    expect(telHref("javascript:alert(1)")).toBeNull();
    expect(telHref("123")).toBeNull();
  });
});

describe("mailHref", () => {
  it("acepta correos válidos", () => {
    expect(mailHref(" ventas@acme.com.mx ")).toBe("mailto:ventas@acme.com.mx");
  });

  it("rechaza correos con campos extra o inválidos", () => {
    expect(mailHref("a@b.com?cc=x@y.com")).toBeNull();
    expect(mailHref("a@b.com&body=hola")).toBeNull();
    expect(mailHref("no-es-correo")).toBeNull();
    expect(mailHref(null)).toBeNull();
  });
});
