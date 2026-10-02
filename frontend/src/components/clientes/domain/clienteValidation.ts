/**
 * Validación del formulario de cliente, campo por campo, para mostrar cada
 * error junto a su campo (WCAG 3.3.1) y enfocar el primero inválido. También
 * traduce los errores del backend (DRF) a mensajes por campo en español.
 */
import { isValidEmail } from "./clienteLinks";
import type { ClienteFormTab } from "./clienteTipos";

export type ClienteFieldName = "nombre" | "telefono" | "correo" | "limite_credito" | "dias_credito" | "contacto_correo";
export type ClienteFieldErrors = Partial<Record<ClienteFieldName, string>>;

/** Orden de enfoque y pestaña donde vive cada campo. */
export const CLIENTE_FIELD_TAB: Record<ClienteFieldName, ClienteFormTab> = {
  nombre: "general",
  telefono: "general",
  correo: "general",
  limite_credito: "general",
  dias_credito: "general",
  contacto_correo: "contacto",
};

const text = (v: unknown) => String(v ?? "").trim();

/** `DecimalField(max_digits=12, decimal_places=2)` del backend. */
const MONEY_RE = /^\d{1,10}(\.\d{1,2})?$/;

export type ClienteValidationOptions = {
  /** Valores con los que se abrió el formulario: un dato heredado que no se tocó no bloquea el guardado. */
  initial?: Record<string, unknown>;
  /** Editando un registro guardado: el contacto vive en su libreta, no en el formulario. */
  editingSaved?: boolean;
};

export function clienteFieldErrors(formData: Record<string, unknown>, opts: ClienteValidationOptions = {}): ClienteFieldErrors {
  const errors: ClienteFieldErrors = {};
  const changed = (key: string) => !opts.initial || text(opts.initial[key]) !== text(formData[key]);

  if (!text(formData.nombre)) errors.nombre = "Escribe el nombre del contacto.";

  const tel = text(formData.telefono).replace(/\D/g, "");
  if (!tel) errors.telefono = "Escribe el teléfono.";
  else if (tel.length !== 10) errors.telefono = `El teléfono debe tener 10 dígitos (tiene ${tel.length}).`;

  const correo = text(formData.correo);
  if (correo && changed("correo") && !isValidEmail(correo)) errors.correo = "Revisa el correo; debe ser como nombre@empresa.com.";

  const limite = text(formData.limite_credito);
  if (limite && changed("limite_credito") && !MONEY_RE.test(limite)) {
    errors.limite_credito = "Escribe una cantidad válida, p. ej. 15000 o 15000.50 (sin comas).";
  }

  const dias = text(formData.dias_credito);
  if (dias && changed("dias_credito") && (!/^\d+$/.test(dias) || Number(dias) > 365)) {
    errors.dias_credito = "Escribe un número de días entre 0 y 365.";
  }

  const contactoCorreo = text(formData.contacto_correo);
  if (!opts.editingSaved && contactoCorreo && changed("contacto_correo") && !isValidEmail(contactoCorreo)) {
    errors.contacto_correo = "Revisa el correo del contacto; debe ser como nombre@empresa.com.";
  }
  return errors;
}

/** Primer campo con error en el orden del formulario (para enfocarlo). */
export function firstInvalidField(errors: ClienteFieldErrors): ClienteFieldName | null {
  return (Object.keys(CLIENTE_FIELD_TAB) as ClienteFieldName[]).find((k) => errors[k]) ?? null;
}

/* --------------------------------------------------------------------------
   Errores del backend
   -------------------------------------------------------------------------- */

const API_FIELD_LABEL: Record<string, string> = {
  nombre: "Nombre",
  telefono: "Teléfono",
  celular: "Celular",
  correo: "Correo",
  rfc: "RFC",
  curp: "CURP",
  clave: "Clave",
  representante: "Representante",
  limite_credito: "Límite de crédito",
  dias_credito: "Días de crédito",
  numero_precio: "Lista de precios",
  nombre_facturacion: "Razón social",
  regimen_fiscal: "Régimen fiscal",
  uso_cfdi: "Uso CFDI",
  idcif: "idCIF",
  codigo_postal: "Código postal",
  tipo: "Tipo de contacto",
};

const FORM_FIELDS = new Set<string>(Object.keys(CLIENTE_FIELD_TAB));

/**
 * `{"limite_credito": ["Asegúrese…"], "detail": "…"}` → errores por campo
 * (los que el formulario muestra) + un resumen legible para el aviso.
 */
export function parseClienteApiError(raw: string): { fields: ClienteFieldErrors; message: string } {
  const fields: ClienteFieldErrors = {};
  let data: unknown = null;
  try {
    data = JSON.parse(raw);
  } catch {
    return { fields, message: raw.trim().startsWith("<") ? "" : raw.trim().slice(0, 300) };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return { fields, message: "" };

  const lines: string[] = [];
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const msg = (Array.isArray(value) ? value.map(String).join(" ") : String(value ?? "")).trim();
    if (!msg) continue;
    if (key === "detail" || key === "non_field_errors") {
      lines.push(/csrf/i.test(msg) ? "La sesión expiró. Cierra sesión, vuelve a entrar e inténtalo de nuevo." : msg);
      continue;
    }
    if (FORM_FIELDS.has(key)) fields[key as ClienteFieldName] = msg;
    lines.push(`${API_FIELD_LABEL[key] ?? key}: ${msg}`);
  }
  return { fields, message: lines.join("\n") };
}
