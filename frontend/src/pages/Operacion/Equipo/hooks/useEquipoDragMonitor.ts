/**
 * Monitor de arrastre del tablero Equipo. Expone qué se arrastra y qué zona
 * está bajo el puntero; al soltar convierte la zona (técnico, y día si es
 * una celda) en una solicitud de movimiento.
 *
 * Mientras se arrastra, acercar el puntero a un borde desplaza la ventana (y
 * los días del tablero) sola: ver `equipoAutoScroll.ts`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { columnKey, isEquipoDragData, isEquipoDropData, itemKey, type EquipoItemKind, type EquipoMoveRequest } from "../shared/equipoDnd";
import type { EquipoSeccion, EquipoTecnicoId } from "../shared/equipoGrouping";
import { createDragAutoScroll } from "./equipoAutoScroll";

type DragState = { kind: EquipoItemKind; id: string; fromKey: string; fecha: string } | null;

export function useEquipoDragMonitor(secciones: EquipoSeccion[], onMove: (req: EquipoMoveRequest) => void) {
  const [drag, setDrag] = useState<DragState>(null);
  const [overKey, setOverKey] = useState<string | null>(null);

  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const keyToIdRef = useRef(new Map<string, EquipoTecnicoId>());
  keyToIdRef.current = new Map(secciones.map((s) => [columnKey(s.tecnico.id), s.tecnico.id]));

  useEffect(() => {
    const autoScroll = createDragAutoScroll();
    const stop = monitorForElements({
      canMonitor: ({ source }) => isEquipoDragData(source.data),
      onDragStart: ({ source, location: loc }) => {
        if (!isEquipoDragData(source.data)) return;
        setDrag({ kind: source.data.kind, id: source.data.id, fromKey: source.data.fromKey, fecha: source.data.fecha });
        autoScroll.update(loc.current.input.clientX, loc.current.input.clientY);
        autoScroll.start();
      },
      onDrag: ({ location: loc }) => autoScroll.update(loc.current.input.clientX, loc.current.input.clientY),
      onDrop: ({ source, location: loc }) => {
        autoScroll.stop();
        setDrag(null);
        setOverKey(null);
        if (!isEquipoDragData(source.data)) return;
        // La zona más interna primero (celda antes que fila).
        const target = loc.current.dropTargets.find((t) => isEquipoDropData(t.data));
        if (!target || !isEquipoDropData(target.data)) return;
        const { key: toKey, fecha: toFecha } = target.data;
        const ids = keyToIdRef.current;
        if (!ids.has(toKey) || !ids.has(source.data.fromKey)) return;
        const cambiaDia = !!toFecha && toFecha !== source.data.fecha;
        if (toKey === source.data.fromKey && !cambiaDia) return;
        onMoveRef.current({
          kind: source.data.kind,
          id: source.data.id,
          fromId: ids.get(source.data.fromKey) ?? null,
          toId: ids.get(toKey) ?? null,
          ...(cambiaDia ? { fromFecha: source.data.fecha, toFecha } : {}),
        });
      },
    });
    return () => {
      autoScroll.stop();
      stop();
    };
  }, []);

  const onOverChange = useCallback((key: string, over: boolean) => {
    setOverKey((prev) => (over ? key : prev === key ? null : prev));
  }, []);

  return {
    dragging: drag != null,
    dragFromKey: drag?.fromKey ?? null,
    draggingItemKey: drag ? itemKey(drag.kind, drag.id, drag.fromKey) : null,
    overKey,
    onOverChange,
  };
}
