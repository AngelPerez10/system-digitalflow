/**
 * Hace arrastrable una fila del tablero Equipo (pragmatic-drag-and-drop, igual
 * que los conceptos de Cotización) con una vista previa compacta (folio +
 * cliente) en lugar de la captura de toda la fila.
 */
import { useEffect, type RefObject } from "react";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { pointerOutsideOfPreview } from "@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import type { EquipoDragData, EquipoItemKind } from "./equipoDnd";

export function useEquipoDraggable(
  ref: RefObject<HTMLElement | null>,
  opts: { enabled: boolean; kind: EquipoItemKind; id: string; fromKey: string; folio: string; cliente: string }
) {
  const { enabled, kind, id, fromKey, folio, cliente } = opts;
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    return draggable({
      element: el,
      getInitialData: (): EquipoDragData => ({ type: "equipo-item", kind, id, fromKey }),
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        setCustomNativeDragPreview({
          nativeSetDragImage,
          getOffset: pointerOutsideOfPreview({ x: "14px", y: "10px" }),
          render: ({ container }) => {
            const chip = document.createElement("div");
            chip.className =
              "flex max-w-[280px] items-center gap-2 rounded-xl border border-[#D7E3FF] bg-white px-3 py-2 text-[13px] font-semibold text-[#09090B] shadow-[0_14px_30px_-12px_rgba(9,9,11,0.4)]";
            const tag = document.createElement("span");
            tag.className = `rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              kind === "orden" ? "bg-[#EEF3FF] text-[#1244D1]" : "bg-[#FFF4E5] text-[#8A5D0F]"
            }`;
            tag.textContent = kind === "orden" ? "Orden" : "Proyecto";
            const f = document.createElement("span");
            f.className = "font-mono text-[12px] text-[#1244D1]";
            f.textContent = folio;
            const c = document.createElement("span");
            c.className = "truncate text-[#3F3F46]";
            c.textContent = cliente;
            chip.append(tag, f, c);
            container.append(chip);
          },
        });
      },
    });
  }, [ref, enabled, kind, id, fromKey, folio, cliente]);
}
