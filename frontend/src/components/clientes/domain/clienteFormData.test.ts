import { describe, expect, it } from "vitest";
import type { Cliente } from "@/types/cliente";
import { contactoPrincipalFromForm } from "./clienteContacto";
import { direccionInputFromFormData, direccionParaOrden, direccionResumen, hasAnyAddressData } from "./clienteDireccion";
import { buildClientePayload, emptyFormData, formDataFromCliente } from "./clienteFormData";

const cliente = {
  id: 7,
  idx: 12,
  nombre: "acme sa",
  telefono: "+526621234567",
  direccion: "",
  fecha_creacion: "2026-01-01",
  calle: "Juárez",
  ciudad: "Colima",
  limite_credito: "15000.00",
  dias_credito: 30,
  tipo: "PROVEEDOR",
  contactos: [
    { id: 1, nombre_apellido: "Otro", titulo: "", area_puesto: "", celular: "", correo: "" },
    { id: 2, nombre_apellido: "luis", titulo: "", area_puesto: "Compras", celular: "6620000000", correo: "l@acme.mx", is_principal: true },
  ],
} as Cliente;

describe("clienteFormData", () => {
  it("carga un registro: teléfono separado, mayúsculas y contacto principal", () => {
    const f = formDataFromCliente(cliente);
    expect(f).toMatchObject({
      nombre: "ACME SA",
      telefono_pais: "MX",
      telefono: "6621234567",
      no_cliente: "12",
      tipo: "PROVEEDOR",
      contacto_id: 2,
      contacto_nombre: "LUIS",
      contacto_puesto: "Compras",
    });
  });

  it("al editar no reenvía el domicilio (lo administra la libreta)", () => {
    const f = formDataFromCliente(cliente);
    const editPayload = buildClientePayload(f, undefined, true);
    expect(editPayload).not.toHaveProperty("calle");
    expect(buildClientePayload(f, undefined, false)).toMatchObject({ calle: "Juárez", ciudad: "Colima" });
  });

  it("normaliza el payload: E.164, números y tipo fijo", () => {
    const p = buildClientePayload({ ...emptyFormData(), nombre: " acme ", telefono: "6621234567", limite_credito: "", dias_credito: "15" }, "EMPRESA");
    expect(p).toMatchObject({ nombre: "ACME", telefono: "+526621234567", limite_credito: 0, dias_credito: 15, tipo: "EMPRESA" });
  });
});

describe("clienteContacto", () => {
  it("arma el contacto principal solo si hay nombre", () => {
    expect(contactoPrincipalFromForm({ contacto_nombre: "  " })).toBeNull();
    expect(contactoPrincipalFromForm({ contacto_nombre: "ana", contacto_telefono: "(662) 123", contacto_correo: " a@b.mx " })).toEqual({
      nombre_apellido: "ANA",
      titulo: "",
      area_puesto: "",
      celular: "662123",
      correo: "a@b.mx",
      is_principal: true,
    });
  });
});

describe("clienteDireccion", () => {
  const d = { calle: "Juárez", numero_exterior: "12", colonia: "Centro", ciudad: "Colima", estado: "Colima", direccion: "" };

  it("resume y elige el valor para la orden", () => {
    expect(direccionResumen(d)).toBe("Juárez 12 — Centro, Colima, Colima");
    expect(direccionParaOrden(d)).toBe("Juárez 12 — Centro, Colima, Colima");
    expect(direccionParaOrden({ ...d, direccion: "https://maps.app.goo.gl/x" })).toBe("https://maps.app.goo.gl/x");
    expect(direccionParaOrden({ calle: "", numero_exterior: "", colonia: "", ciudad: "", estado: "", direccion: "" })).toBe("");
  });

  it("convierte el domicilio del formulario en la dirección principal", () => {
    expect(hasAnyAddressData(emptyFormData())).toBe(false);
    const input = direccionInputFromFormData({ ...emptyFormData(), calle: "Juárez" });
    expect(input).toMatchObject({ etiqueta: "Principal", calle: "Juárez", pais: "México", is_principal: true });
  });
});
