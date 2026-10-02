import { useEffect, useRef } from "react";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Atajos de una sola tecla del listado: «/» enfoca la búsqueda y «N» crea.
 * No actúan mientras se escribe, con modificadores ni con un diálogo abierto
 * (WCAG 2.1.4: son de una tecla pero solo con el foco en la página).
 */
export function useListShortcuts(handlers: { onFocusSearch: () => void; onCreate?: () => void }, enabled = true) {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (e.key === "/") {
        e.preventDefault();
        ref.current.onFocusSearch();
      } else if ((e.key === "n" || e.key === "N") && ref.current.onCreate) {
        e.preventDefault();
        ref.current.onCreate();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
