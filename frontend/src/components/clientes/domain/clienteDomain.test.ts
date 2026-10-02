import { describe, expect, it } from "vitest";
import { isValidEmail, mapsUrlFor, parseCoords, telHref } from "./clienteLinks";
import { clienteFieldErrors, firstInvalidField, parseClienteApiError } from "./clienteValidation";
import { clienteStepState } from "./clienteSteps";

describe("clienteFieldErrors", () => {
  it("exige nombre y teléfono de 10 dígitos", () => {
    const e = clienteFieldErrors({ nombre: " ", telefono: "662 123" });
    expect(e.nombre).toBeTruthy();
    expect(e.telefono).toMatch(/10 dígitos \(tiene 6\)/);
  });

  it("acepta un registro mínimo válido", () => {
    expect(clienteFieldErrors({ nombre: "ACME", telefono: "6621234567" })).toEqual({});
  });

  it("valida correos solo si se capturan", () => {
    const e = clienteFieldErrors({ nombre: "A", telefono: "6621234567", correo: "x@", contacto_correo: "y@z.mx" });
    expect(e.correo).toBeTruthy();
    expect(e.contacto_correo).toBeUndefined();
  });

  it("devuelve el primer campo inválido en orden del formulario", () => {
    expect(firstInvalidField({ contacto_correo: "x", telefono: "y" })).toBe("telefono");
    expect(firstInvalidField({})).toBeNull();
  });
});

describe("clienteLinks", () => {
  it("valida correos", () => {
    expect(isValidEmail("ventas@acme.mx")).toBe(true);
    expect(isValidEmail("a@b.com?cc=c@d.com")).toBe(false);
  });

  it("lee coordenadas válidas", () => {
    expect(parseCoords("https://www.google.com/maps?q=19.0653,-104.2831")).toEqual({ lat: 19.0653, lng: -104.2831 });
    expect(parseCoords("200, 10")).toBeNull();
    expect(parseCoords("Av. Juárez 12")).toBeNull();
  });

  it("arma la URL de Maps sin usar texto como liga", () => {
    expect(mapsUrlFor("https://maps.app.goo.gl/abc")).toBe("https://maps.app.goo.gl/abc");
    expect(mapsUrlFor("19.1, -104.2")).toBe("https://www.google.com/maps?q=19.100000,-104.200000");
    expect(mapsUrlFor("javascript:alert(1)")).toBe(
      "https://www.google.com/maps/search/?api=1&query=javascript%3Aalert(1)",
    );
    expect(mapsUrlFor("  ")).toBeNull();
  });

  it("normaliza teléfonos", () => {
    expect(telHref("+52 662 123 4567")).toBe("tel:+526621234567");
    expect(telHref("12")).toBeNull();
  });
});

describe("clienteStepState", () => {
  it("marca completo, pendiente y con error", () => {
    const s = clienteStepState(
      { nombre: "ACME", telefono: "6621234567", contacto_nombre: "", razon_social: "ACME SA", direccion: "" },
      { contacto_correo: "x" },
      false,
    );
    expect(s).toEqual({ general: "done", contacto: "error", more: "idle" });
  });

  it("al editar, las libretas cuentan como completas", () => {
    const s = clienteStepState({ nombre: "A", telefono: "6621234567", razon_social: "A" }, {}, true);
    expect(s).toEqual({ general: "done", contacto: "done", more: "done" });
  });
});

describe("validación al guardar", () => {
  const base = { nombre: "ACME", telefono: "6621234567" };

  it("un correo heredado inválido que no se tocó no bloquea al editar", () => {
    const legacy = { ...base, correo: "a@x.com || b@y.com" };
    expect(clienteFieldErrors(legacy, { initial: legacy, editingSaved: true })).toEqual({});
    expect(clienteFieldErrors({ ...legacy, correo: "otro@" }, { initial: legacy }).correo).toBeTruthy();
  });

  it("al editar no valida el correo del contacto (vive en la libreta)", () => {
    expect(clienteFieldErrors({ ...base, contacto_correo: "x@" }, { editingSaved: true })).toEqual({});
  });

  it("rechaza montos que el backend no acepta en lugar de guardar 0", () => {
    expect(clienteFieldErrors({ ...base, limite_credito: "1.000.50" }).limite_credito).toBeTruthy();
    expect(clienteFieldErrors({ ...base, limite_credito: "12345678901" }).limite_credito).toBeTruthy();
    expect(clienteFieldErrors({ ...base, limite_credito: "15000.5" })).toEqual({});
    expect(clienteFieldErrors({ ...base, dias_credito: "400" }).dias_credito).toBeTruthy();
  });
});

describe("parseClienteApiError", () => {
  it("separa errores por campo y arma un resumen en español", () => {
    const r = parseClienteApiError(JSON.stringify({ limite_credito: ["Demasiados dígitos."], rfc: ["Muy largo."] }));
    expect(r.fields).toEqual({ limite_credito: "Demasiados dígitos." });
    expect(r.message).toBe("Límite de crédito: Demasiados dígitos.\nRFC: Muy largo.");
  });

  it("traduce el error de sesión y descarta páginas HTML", () => {
    expect(parseClienteApiError(JSON.stringify({ detail: "CSRF Failed" })).message).toMatch(/sesión expiró/);
    expect(parseClienteApiError("<html>500</html>").message).toBe("");
  });
});
