/**
 * Contrato de arrastre del tablero Equipo: una tarjeta se suelta en la celda
 * técnico × día (cambia técnico y/o día) o en el nombre del técnico (solo
 * técnico).
 */
import type { EquipoTecnicoId } from "./equipoGrouping";

export type EquipoItemKind = "orden" | "proyecto";

/** Datos que viajan con la tarjeta arrastrada. */
export type EquipoDragData = {
  type: "equipo-item";
  kind: EquipoItemKind;
  id: string;
  fromKey: string;
  /** Día de la tarjeta arrastrada (`YYYY-MM-DD`). */
  fecha: string;
};

/** Datos de una zona de soltar (`fecha` vacía = solo cambia el técnico). */
export type EquipoDropData = {
  kind: "equipo-columna";
  key: string;
  fecha: string;
};

export type EquipoMoveRequest = {
  kind: EquipoItemKind;
  id: string;
  fromId: EquipoTecnicoId;
  toId: EquipoTecnicoId;
  /** Cambio de día: el de la tarjeta y el de destino (`YYYY-MM-DD`). */
  fromFecha?: string;
  toFecha?: string;
};

export type EquipoDestino = { key: string; id: EquipoTecnicoId; nombre: string; avatarUrl?: string };

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

/** Identificador de la zona bajo el puntero: «técnico» o «técnico|día». */
export function dropOverId(key: string, fecha: string): string {
  return fecha ? `${key}|${fecha}` : key;
}

export function isEquipoDropData(data: Record<string | symbol, unknown>): data is EquipoDropData {
  return data.kind === "equipo-columna";
}

export function isEquipoDragData(data: Record<string | symbol, unknown>): data is EquipoDragData {
  return data.type === "equipo-item";
}
