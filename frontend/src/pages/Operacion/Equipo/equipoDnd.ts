/**
 * Contrato de arrastre del tablero Equipo (tarjetas ↔ columnas).
 */
import type { EquipoTecnicoId } from "./equipoGrouping";

export type EquipoItemKind = "orden" | "proyecto";

/** Datos que viajan con la tarjeta arrastrada. */
export type EquipoDragData = {
  type: "equipo-item";
  kind: EquipoItemKind;
  id: string;
  fromKey: string;
};

export type EquipoMoveRequest = {
  kind: EquipoItemKind;
  id: string;
  fromId: EquipoTecnicoId;
  toId: EquipoTecnicoId;
};

export type EquipoDestino = { key: string; id: EquipoTecnicoId; nombre: string };

/** Llave del riel para «Todo el equipo» (no es zona de soltar). */
export const RAIL_TODOS = "todos";

/** Llave de columna: el id del técnico, o «sin» para «Sin asignar». */
export function columnKey(id: EquipoTecnicoId): string {
  return id == null ? "sin" : String(id);
}

/** Llave de tarjeta dentro de una columna (un proyecto puede estar en varias). */
export function itemKey(kind: EquipoItemKind, id: string | number, colKey: string): string {
  return `${kind}:${id}@${colKey}`;
}

export function isEquipoDragData(data: Record<string | symbol, unknown>): data is EquipoDragData {
  return data.type === "equipo-item";
}
