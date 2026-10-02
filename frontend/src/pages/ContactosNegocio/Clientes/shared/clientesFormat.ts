/**
 * Formato de presentación de un registro del listado. Puro y probado.
 *
 * Los enlaces (`tel:`, `mailto:`) se construyen solo con datos validados:
 * el texto capturado por usuarios nunca se usa tal cual como `href`.
 */
import { type ClienteTipo, TIPO_OPTIONS } from "@/components/clientes/domain";
import type { Cliente } from "@/types/cliente";

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function tipoLabel(tipo?: ClienteTipo): string {
  return TIPO_OPTIONS.find((o) => o.value === tipo)?.label ?? "Sin tipo";
}

/** «Hermosillo, Sonora» · «Sonora» · "" */
export function ubicacion(cliente: Pick<Cliente, "ciudad" | "estado">): string {
  return [cliente.ciudad, cliente.estado].map((v) => String(v ?? "").trim()).filter(Boolean).join(", ");
}

/** Persona de contacto: el representante o, si no hay, el contacto principal. */
export function contactoPrincipal(cliente: Pick<Cliente, "representante" | "correo" | "contactos">): {
  nombre: string;
  correo: string;
} {
  const contactos = cliente.contactos ?? [];
  const principal = contactos.find((c) => c.is_principal) ?? contactos[0];
  return {
    nombre: String(cliente.representante ?? "").trim() || String(principal?.nombre_apellido ?? "").trim(),
    correo: String(cliente.correo ?? "").trim() || String(principal?.correo ?? "").trim(),
  };
}

// Enlaces validados: viven junto al formulario compartido para que también los use.
export { mailHref, telHref } from "@/components/clientes/domain";
