/** Utilidades del campo «Técnicos» del reporte (guardado como nombres separados por coma). */
import type { Usuario } from "../../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";

export function splitTecnicos(value: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of String(value || "").split(",")) {
    const name = raw.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

export function joinTecnicos(names: string[]): string {
  return names.join(", ");
}

export function usuarioDisplayName(u: Pick<Usuario, "id" | "first_name" | "last_name" | "username" | "email">): string {
  const full = `${u.first_name || ""} ${u.last_name || ""}`.trim();
  return full || u.username || u.email || `Usuario #${u.id}`;
}
