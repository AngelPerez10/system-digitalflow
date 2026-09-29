/** Tipos y utilidades comunes a las dos vistas del tablero (escritorio y angosta). */
import type { EquipoDestino } from "../../shared/equipoDnd";
import type { EquipoSeccion } from "../../shared/equipoGrouping";
import type { EquipoTarjeta } from "../../shared/equipoSemana";
import type { EquipoJobHandlers } from "./EquipoJobCard";

export type EquipoBoardRowCommon = {
  lunes: string;
  hoy: string;
  draggingItemKey: string | null;
  dragFromKey: string | null;
  overKey: string | null;
  onOverChange: (key: string, over: boolean) => void;
  justMovedKey: string | null;
  destinos: EquipoDestino[];
  handlers: EquipoJobHandlers;
};

export type EquipoBoardProps = EquipoBoardRowCommon & {
  secciones: EquipoSeccion[];
  /** Trabajos únicos por día (lun → dom) para el encabezado. */
  porDia: number[];
};

/** Trabajos únicos de una fila (un proyecto de varios días cuenta una vez). */
export function conteoFila(dias: EquipoTarjeta[][]) {
  const trabajos = new Set<string>();
  const abiertos = new Set<string>();
  for (const d of dias)
    for (const t of d) {
      trabajos.add(t.key);
      if (t.abierta) abiertos.add(t.key);
    }
  return { trabajos: trabajos.size, abiertos: abiertos.size };
}

export function cargaDe(abiertos: number, max: number): number {
  return max > 0 ? Math.min(1, abiertos / max) : 0;
}
