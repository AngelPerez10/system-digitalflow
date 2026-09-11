import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
} from "react";

type FilterStatus = "" | "PENDIENTE" | "AUTORIZADA" | "CANCELADA";
type StatusCountKey = "PENDIENTE" | "AUTORIZADA" | "CANCELADA";

const STATUS_SEGMENTS: {
  value: FilterStatus;
  label: string;
  countKey: StatusCountKey | null;
  activeClass: string;
  dotClass: string;
}[] = [
  {
    value: "",
    label: "Todas",
    countKey: null,
    activeClass:
      "bg-white text-[#09090B] shadow-[0_1px_2px_rgba(9,9,11,0.08)] dark:bg-[#243048] dark:text-white",
    dotClass: "bg-[#A1A1AA] dark:bg-[#64748b]",
  },
  {
    value: "PENDIENTE",
    label: "Pendientes",
    countKey: "PENDIENTE",
    activeClass:
      "bg-[rgba(230,162,60,0.16)] text-[#9A6B15] dark:bg-[rgba(230,162,60,0.2)] dark:text-[#E6A23C]",
    dotClass: "bg-amber-500 dark:bg-amber-400",
  },
  {
    value: "AUTORIZADA",
    label: "Autorizadas",
    countKey: "AUTORIZADA",
    activeClass: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100",
    dotClass: "bg-emerald-500 dark:bg-emerald-400",
  },
  {
    value: "CANCELADA",
    label: "Canceladas",
    countKey: "CANCELADA",
    activeClass: "bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-100",
    dotClass: "bg-rose-500 dark:bg-rose-400",
  },
];

type Props = {
  filterStatus: FilterStatus;
  setFilterStatus: Dispatch<SetStateAction<FilterStatus>>;
  statusCounts: Record<StatusCountKey, number>;
  totalBeforeStatus: number;
};

function scrollChipIntoRail(
  rail: HTMLElement,
  chip: HTMLElement,
  behavior: ScrollBehavior,
) {
  const railRect = rail.getBoundingClientRect();
  const chipRect = chip.getBoundingClientRect();
  const delta =
    chipRect.left - railRect.left - (rail.clientWidth - chip.clientWidth) / 2;
  const nextLeft = Math.max(0, rail.scrollLeft + delta);
  rail.scrollTo({ left: nextLeft, behavior });
}

/**
 * Barra segmentada de estado — mismo diseño; rail horizontal responsivo como Inventario.
 */
export default function CotizacionesStatusSegmentFilter({
  filterStatus,
  setFilterStatus,
  statusCounts,
  totalBeforeStatus,
}: Props) {
  const railRef = useRef<HTMLDivElement>(null);

  const focusTabAt = useCallback((index: number) => {
    const root = railRef.current;
    if (!root) return;
    const tabs = root.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    const target = tabs[index];
    if (!target) return;
    target.focus({ preventScroll: true });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scrollChipIntoRail(root, target, reduceMotion ? "auto" : "smooth");
  }, []);

  useEffect(() => {
    const root = railRef.current;
    if (!root) return;
    const selected = root.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (!selected) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scrollChipIntoRail(root, selected, reduceMotion ? "auto" : "smooth");
  }, [filterStatus]);

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = STATUS_SEGMENTS.length - 1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusTabAt(index === last ? 0 : index + 1);
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusTabAt(index === 0 ? last : index - 1);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      focusTabAt(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      focusTabAt(last);
    }
  };

  return (
    <div className="relative w-full min-w-0 max-w-full overflow-hidden">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-gradient-to-r from-[#FAFAFA] to-transparent dark:from-[#0f172a] sm:w-6"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-[#FAFAFA] to-transparent dark:from-[#0f172a] sm:w-8"
        aria-hidden="true"
      />

      <div
        ref={railRef}
        role="tablist"
        aria-label="Filtrar por estado"
        aria-orientation="horizontal"
        className="flex w-full min-w-0 max-w-full gap-1 overflow-x-auto overscroll-x-contain scroll-smooth rounded-[12px] border border-[#E7E7EA] bg-[#FAFAFA] p-1 [-ms-overflow-style:none] [scrollbar-width:none] dark:border-[#273244] dark:bg-[#0f172a] [&::-webkit-scrollbar]:hidden"
      >
        {STATUS_SEGMENTS.map((seg, index) => {
          const active = filterStatus === seg.value;
          const count = seg.countKey ? statusCounts[seg.countKey] : totalBeforeStatus;
          return (
            <button
              key={seg.value || "all"}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => setFilterStatus(seg.value)}
              onKeyDown={(e) => onTabKeyDown(e, index)}
              className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[9px] px-2.5 py-1.5 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.4)] sm:min-h-0 ${
                active
                  ? seg.activeClass
                  : "text-[#52525B] hover:bg-white hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:bg-white/5 dark:hover:text-white"
              }`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${seg.dotClass}`} aria-hidden />
              {seg.label}
              <span
                className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] tabular-nums ${
                  active
                    ? "bg-black/10 dark:bg-white/15"
                    : "bg-black/[0.05] text-[#6E6E77] dark:bg-white/10 dark:text-[#8EA0B8]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
