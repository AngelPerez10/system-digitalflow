/**
 * Zona donde soltar trabajos: la celda técnico × día (cambia técnico y/o
 * día) o el nombre del técnico (`fecha` vacía: solo cambia el técnico). El
 * monitor de la página (`useEquipoDragMonitor`) hace el movimiento al soltar.
 */
import { useEffect, type RefObject } from "react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { dropOverId, isEquipoDragData, type EquipoDropData } from "../shared/equipoDnd";

export function useTecnicoDropTarget(
  ref: RefObject<HTMLElement | null>,
  key: string,
  onOverChange: (overId: string, over: boolean) => void,
  fecha = ""
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const overId = dropOverId(key, fecha);
    return dropTargetForElements({
      element: el,
      getData: (): EquipoDropData => ({ kind: "equipo-columna", key, fecha }),
      // Válida si cambia algo: otro técnico, u otro día en la misma fila.
      canDrop: ({ source }) =>
        isEquipoDragData(source.data) && (source.data.fromKey !== key || (!!fecha && source.data.fecha !== fecha)),
      onDragEnter: () => onOverChange(overId, true),
      onDragLeave: () => onOverChange(overId, false),
      onDrop: () => onOverChange(overId, false),
    });
  }, [ref, key, fecha, onOverChange]);
}
