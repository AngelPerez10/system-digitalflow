/**
 * Historial de reasignaciones del tablero Equipo (`/api/equipo-historial/`).
 * Compartido entre administradores y persistente en el servidor.
 */
import { fetchApi } from "@/config/api";
import type { EquipoItemKind } from "./equipoDnd";

export type EquipoHistorialAccion = "reasignar" | "deshacer";

export type EquipoHistorialEntry = {
  id: number;
  tipo: EquipoItemKind;
  objeto_id: number;
  folio: string;
  cliente: string;
  accion: EquipoHistorialAccion;
  desde_id: number | null;
  desde_nombre: string;
  hacia_id: number | null;
  hacia_nombre: string;
  usuario: number | null;
  usuario_nombre: string;
  usuario_avatar_url: string;
  creado_at: string;
};

export type EquipoHistorialNuevo = Omit<
  EquipoHistorialEntry,
  "id" | "usuario" | "usuario_nombre" | "usuario_avatar_url" | "creado_at"
>;

export async function listEquipoHistorial(limit = 100): Promise<EquipoHistorialEntry[]> {
  const res = await fetchApi(`/api/equipo-historial/?limit=${limit}`, { cache: "no-store" as RequestCache });
  if (!res.ok) throw new Error("No se pudo cargar el historial.");
  const data = (await res.json().catch(() => null)) as unknown;
  return Array.isArray(data) ? (data as EquipoHistorialEntry[]) : [];
}

export async function registrarEquipoHistorial(entry: EquipoHistorialNuevo): Promise<EquipoHistorialEntry> {
  const res = await fetchApi("/api/equipo-historial/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error("No se pudo registrar el movimiento en el historial.");
  return (await res.json()) as EquipoHistorialEntry;
}
