import { useLayoutEffect, useRef } from "react";

type UseAutoGrowTextareaOptions = {
  /** Current controlled value — resize when it changes (typing, paste, load). */
  value: string;
  /** Soft cap so a huge note doesn't push the whole modal. Past this, the field scrolls. */
  maxHeightPx?: number;
};

/**
 * Keeps a textarea tall enough for its content (grows downward as you type).
 * Uses scrollHeight after resetting height so shrink works when deleting lines.
 */
export function useAutoGrowTextarea({
  value,
  maxHeightPx = 320,
}: UseAutoGrowTextareaOptions) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, maxHeightPx);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeightPx ? "auto" : "hidden";
  }, [value, maxHeightPx]);

  return ref;
}
