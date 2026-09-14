import { useEffect } from "react";

function isInsideComboPopover(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('[data-slot="combo-box-popover"], .combo-box__popover'));
}

/**
 * React Aria cierra ComboBox no-modal al hacer scroll en cualquier ancestro
 * del trigger (`useCloseOnScroll`). En modales eso incluye el overlay.
 *
 * No mutar `overflow` del `.erp-modal-form-scroll`: ese cambio dispara un
 * evento `scroll` y RAC cierra el menú en el mismo instante en que abre
 * (técnico / quién instaló / quién entregó, más abajo del viewport del modal).
 * Bloqueamos rueda y touch fuera del popover; la lista sí puede hacer scroll.
 */
export function useComboBoxScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    const blockOutsidePopover = (event: Event) => {
      if (isInsideComboPopover(event.target)) return;
      event.preventDefault();
    };

    document.addEventListener("wheel", blockOutsidePopover, { capture: true, passive: false });
    document.addEventListener("touchmove", blockOutsidePopover, { capture: true, passive: false });

    return () => {
      document.removeEventListener("wheel", blockOutsidePopover, true);
      document.removeEventListener("touchmove", blockOutsidePopover, true);
    };
  }, [isOpen]);
}
