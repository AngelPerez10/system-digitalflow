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
 * Opciones para ActionSearchBar (órdenes, levantamientos, etc.).
 * Sin contactos anidados usa representante / celular del cliente simplificado.
 */
export function buildClienteSearchActions(
  clientes: Cliente[],
  searchQuery: string,
  options?: { includeNew?: boolean }
): ClienteSearchAction[] {
  const q = searchQuery.trim().toLowerCase();
  const includeNew = options?.includeNew !== false;

  const base = (clientes || [])
    .flatMap((c) => {
      const contactos = Array.isArray(c.contactos) ? c.contactos : [];

      if (!contactos.length) {
        const labelBase = (c.nombre || "-").toString();
        const rep = String(c.representante || "").trim();
        const label = rep ? `${labelBase} — ${rep}` : labelBase;
        return [
          {
            id: String(c.id),
            label,
            icon: (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-[11px] font-semibold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                {(labelBase || "?").slice(0, 1).toUpperCase()}
              </span>
            ),
            description: clientePhoneLabel(c),
            short: "",
            end: "",
            __cliente: c,
            __contacto: null,
          },
        ];
      }

      return contactos.map((ct, idx) => {
        const labelBase = (c.nombre || "-").toString();
        const contactoNombre = String(ct?.nombre_apellido || "").trim();
        const contactoTel = String(ct?.celular || "").trim();
        const label = contactoNombre ? `${labelBase} - ${contactoNombre}` : labelBase;

        return {
          id: `${String(c.id)}::${String(ct?.id ?? idx)}`,
          label,
          icon: (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-[11px] font-semibold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
              {(labelBase || "?").slice(0, 1).toUpperCase()}
            </span>
          ),
          description: contactoTel || clientePhoneLabel(c),
          short: "",
          end: "",
          __cliente: c,
          __contacto: ct as Record<string, unknown>,
        };
      });
    })
    .filter((a) => {
      if (!q) return true;
      const label = String(a?.label || "").toLowerCase();
      const desc = String(a?.description || "").toLowerCase();
      return label.includes(q) || desc.includes(q);
    });

  if (!includeNew) return base;

  const newAction: ClienteSearchAction = {
    id: "__new__",
    label: "Nuevo Cliente",
    icon: (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#fff3e8] text-[#ea580c] dark:bg-[#ff801f]/20 dark:text-[#fb923c]">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </span>
    ),
    description: "Crear cliente",
    short: "",
    end: "",
  };

  return [newAction, ...base];
}
