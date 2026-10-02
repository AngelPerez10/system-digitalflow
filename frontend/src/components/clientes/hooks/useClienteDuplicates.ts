import { useEffect, useState } from "react";
import type { Cliente } from "@/types/cliente";
import { searchClientes } from "../api/clientesApi";

const normalizeName = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();
const digits = (value: string) => value.replace(/\D/g, "");

/**
 * Avisa de posibles duplicados al crear: mismo nombre normalizado o mismo
 * teléfono de 10 dígitos. Solo consulta con datos suficientes, con debounce y
 * cancelando la petición anterior.
 */
export function useClienteDuplicates({
  enabled,
  nombre,
  telefono,
}: {
  enabled: boolean;
  nombre: string;
  telefono: string;
}): Cliente[] {
  const [matches, setMatches] = useState<Cliente[]>([]);

  useEffect(() => {
    const normalizedNombre = normalizeName(nombre);
    const phone = digits(telefono);
    const hasName = normalizedNombre.length >= 3;
    const hasPhone = phone.length === 10;
    if (!enabled || (!hasName && !hasPhone)) {
      setMatches([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const rows = await searchClientes(hasName ? nombre.trim() : phone, controller.signal);
        if (controller.signal.aborted) return;
        setMatches(
          rows.filter((c) => {
            const sameName = hasName && normalizeName(String(c.nombre ?? "")) === normalizedNombre;
            const samePhone = hasPhone && digits(String(c.telefono ?? "")).slice(-10) === phone;
            return sameName || samePhone;
          }),
        );
      } catch {
        if (!controller.signal.aborted) setMatches([]);
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, nombre, telefono]);

  return matches;
}
