import { useEffect } from "react";

const LOCK_ATTR = "data-df-combo-scroll-lock";

function isInsideComboPopover(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('[data-slot="combo-box-popover"], .combo-box__popover'));
}

function lockOverflowY(el: HTMLElement) {
  if (el.hasAttribute(LOCK_ATTR)) return;
  el.setAttribute(LOCK_ATTR, el.style.overflowY);
  el.style.overflowY = "hidden";
}

function unlockOverflowY(el: HTMLElement) {
  if (!el.hasAttribute(LOCK_ATTR)) return;
  el.style.overflowY = el.getAttribute(LOCK_ATTR) ?? "";
  el.removeAttribute(LOCK_ATTR);
}

/**
 * React Aria cierra ComboBox no-modal al hacer scroll en cualquier ancestro
 * del trigger (`useCloseOnScroll`). En modales eso incluye el overlay y, a veces,
 * gestos de rueda fuera del panel. Mientras el menú está abierto bloqueamos
 * scroll fuera del popover (la lista sí puede hacer scroll).
 */
export function useComboBoxScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    const locked: HTMLElement[] = [];
    const lock = (el: HTMLElement | null) => {
      if (!el || locked.includes(el)) return;
      lockOverflowY(el);
      locked.push(el);
    };

    lock(document.documentElement);
    lock(document.body);
    document
      .querySelectorAll<HTMLElement>(".erp-modal-overlay, .erp-modal-form-scroll, [role='dialog']")
      .forEach((el) => lock(el));

    const blockOutsidePopover = (event: Event) => {
      if (isInsideComboPopover(event.target)) return;
      event.preventDefault();
    };

    document.addEventListener("wheel", blockOutsidePopover, { capture: true, passive: false });
    document.addEventListener("touchmove", blockOutsidePopover, { capture: true, passive: false });

    return () => {
      document.removeEventListener("wheel", blockOutsidePopover, true);
      document.removeEventListener("touchmove", blockOutsidePopover, true);
      locked.forEach(unlockOverflowY);
    };
  }, [isOpen]);
}
