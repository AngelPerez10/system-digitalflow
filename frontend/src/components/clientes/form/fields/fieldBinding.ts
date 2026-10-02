/** Enlace entre los campos y el estado plano del formulario de cliente. */
import type { Dispatch, SetStateAction } from "react";
import type { Cliente } from "@/types/cliente";
import type { ClienteFormData } from "../../domain/clienteFormData";
import type { ClienteFieldErrors } from "../../domain/clienteValidation";

/** Props comunes de cada pestaña del formulario. */
export type ClienteFieldsTabProps = {
  formData: ClienteFormData;
  setFormData: Dispatch<SetStateAction<ClienteFormData>>;
  errors: ClienteFieldErrors;
  editingCliente?: Cliente | null;
};

/** Solo dígitos, opcionalmente recortados. */
export const digitsOnly = (v: string, max?: number) => {
  const d = v.replace(/\D/g, "");
  return max ? d.slice(0, max) : d;
};

/**
 * `str` lee un campo como texto; `set` lo escribe con actualización funcional
 * (no se pierden teclazos aunque React agrupe renders); `bind` devuelve
 * `name`/`value`/`onChange` para un input, con una transformación opcional.
 */
export function createFieldBinding(formData: ClienteFormData, setFormData: Dispatch<SetStateAction<ClienteFormData>>) {
  const str = (key: string) => String(formData[key] ?? "");
  const set = (key: string, value: unknown) => setFormData((prev) => ({ ...prev, [key]: value }));
  const bind = (key: string, transform?: (v: string) => string) => ({
    name: key,
    value: str(key),
    onChange: (e: { target: { value: string } }) => set(key, transform ? transform(e.target.value) : e.target.value),
  });
  return { str, set, bind };
}
