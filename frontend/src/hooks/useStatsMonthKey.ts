import { useEffect, useState } from "react";
import { getCurrentMonthKey } from "@/utils/statsMonthKey";

function msUntilNextMonth(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 2, 0);
  return Math.max(1000, next.getTime() - now.getTime());
}

/** Mantiene el mes actual (YYYY-MM) y se actualiza al cambiar de mes real. */
export function useCurrentMonthKey(): string {
  const [monthKey, setMonthKey] = useState(() => getCurrentMonthKey());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const sync = () => {
      setMonthKey(getCurrentMonthKey());
      const delay = msUntilNextMonth(new Date());
      timer = setTimeout(sync, delay);
    };

    sync();

    const onFocus = () => setMonthKey(getCurrentMonthKey());
    const onVisibility = () => {
      if (!document.hidden) setMonthKey(getCurrentMonthKey());
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return monthKey;
}
