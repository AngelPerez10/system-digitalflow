/** Contactos de un cliente: borrador editable y conversión desde el formulario. Puro. */
import type { ClienteContacto } from "@/types/cliente";
import type { ClienteFormData } from "./clienteFormData";

export type ClienteContactoInput = {
  nombre_apellido: string;
  titulo: string;
  area_puesto: string;
  celular: string;
  correo: string;
  is_principal: boolean;
};

export const emptyClienteContactoInput = (overrides?: Partial<ClienteContactoInput>): ClienteContactoInput => ({
  nombre_apellido: "",
  titulo: "",
  area_puesto: "",
  celular: "",
  correo: "",
  is_principal: false,
  ...overrides,
});

export const contactoToInput = (c: ClienteContacto): ClienteContactoInput => ({
  nombre_apellido: c.nombre_apellido.toUpperCase(),
  titulo: c.titulo,
  area_puesto: c.area_puesto,
  celular: c.celular,
  correo: c.correo,
  is_principal: Boolean(c.is_principal),
});

const trim = (v: unknown) => String(v ?? "").trim();

/**
 * Contacto principal capturado en el alta (`contacto_*` del formulario), ya
 * normalizado y recortado a los límites del modelo. `null` si no hay nombre.
 */
export function contactoPrincipalFromForm(formData: ClienteFormData): ClienteContactoInput | null {
  const nombre = trim(formData.contacto_nombre);
  if (!nombre) return null;
  return {
    nombre_apellido: nombre.slice(0, 200).toUpperCase(),
    titulo: "",
    area_puesto: trim(formData.contacto_puesto).slice(0, 150),
    celular: trim(formData.contacto_telefono).replace(/\D/g, "").slice(0, 25),
    correo: trim(formData.contacto_correo).slice(0, 254),
    is_principal: true,
  };
}
