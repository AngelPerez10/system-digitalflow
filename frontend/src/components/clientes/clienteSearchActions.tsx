import type { ReactNode } from "react";
import type { Cliente } from "@/types/cliente";

export type ClienteSearchAction = {
  id: string;
  label: string;
  icon: ReactNode;
  description?: string;
  short: string;
  end: string;
  __cliente?: Cliente;
  __contacto?: Record<string, unknown> | null;
};

function clientePhoneLabel(c: Cliente) {
  const cel = String(c.celular || "").trim();
  if (cel) return cel;
  return String(c.telefono || c.correo || "-");
}

/**
 * Opciones para ActionSearchBar / SearchableSelect (órdenes, levantamientos, …).
 * Sin contactos anidados usa representante / celular del cliente simplificado.
 *
 * `searchQuery` vacío: el caller filtra en el combobox (más fluido al teclear).
 * Con query: filtra aquí (listas que no usan filtro local del select).
 */
export function buildClienteSearchActions(
  clientes: Cliente[],
  searchQuery: string,
  options?: { includeNew?: boolean }
): ClienteSearchAction[] {
  const q = searchQuery.trim().toLowerCase();
  const includeNew = options?.includeNew !== false;

  const base: ClienteSearchAction[] = (clientes || []).flatMap((c): ClienteSearchAction[] => {
      const contactos = Array.isArray(c.contactos) ? c.contactos : [];

      if (!contactos.length) {
        const labelBase = (c.nombre || "-").toString();
        const rep = String(c.representante || "").trim();
        const label = rep ? `${labelBase} — ${rep}` : labelBase;
        return [
          {
            id: String(c.id),
            label,
            icon: null,
            description: clientePhoneLabel(c),
            short: "",
            end: "",
            __cliente: c,
            __contacto: null,
          },
        ];
      }

      // Dedupe contactos duplicados dentro del mismo cliente (mismo nombre + celular
      // capturados más de una vez): sin esto, un cliente con contactos repetidos
      // muestra la misma fila varias veces en el buscador.
      const seenContactoKeys = new Set<string>();

      return contactos
        .filter((ct) => {
          const nombre = String(ct?.nombre_apellido || "").trim().toLowerCase();
          const tel = String(ct?.celular || "").replace(/\D/g, "");
          if (!nombre && !tel) return true;
          const key = `${nombre}::${tel}`;
          if (seenContactoKeys.has(key)) return false;
          seenContactoKeys.add(key);
          return true;
        })
        .map((ct, idx) => {
          const labelBase = (c.nombre || "-").toString();
          const contactoNombre = String(ct?.nombre_apellido || "").trim();
          const contactoTel = String(ct?.celular || "").trim();
          // Evitar "PEPE - PEPE" cuando el contacto es el mismo nombre del cliente.
          const sameName =
            contactoNombre &&
            contactoNombre.localeCompare(labelBase, "es", { sensitivity: "accent" }) === 0;
          const label =
            contactoNombre && !sameName ? `${labelBase} — ${contactoNombre}` : labelBase;

          return {
            id: `${String(c.id)}::${String(ct?.id ?? idx)}`,
            label,
            icon: null,
            description: contactoTel || clientePhoneLabel(c),
            short: "",
            end: "",
            __cliente: c,
            __contacto: ct as Record<string, unknown>,
          };
        });
    }).filter((a: ClienteSearchAction) => {
      if (!q) return true;
      const label = String(a.label || "").toLowerCase();
      const desc = String(a.description || "").toLowerCase();
      return label.includes(q) || desc.includes(q);
    });

  if (!includeNew) return base;

  const newAction: ClienteSearchAction = {
    id: "__new__",
    label: "Nuevo contacto",
    icon: null,
    description: "Crear contacto",
    short: "",
    end: "",
  };

  // Al final: si va primero, el ComboBox deja `__new__` como activedescendant
  // y Enter/blur parece “seleccionar” al cliente cuando en realidad abre alta.
  return [...base, newAction];
}
