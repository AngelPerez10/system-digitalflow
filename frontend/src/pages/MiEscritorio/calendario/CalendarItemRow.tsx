import { memo, type CSSProperties, type ReactNode } from "react";
import { ClipboardList, Clock, FolderKanban, UserRound } from "lucide-react";
import { KIND_META, statusLabel, type CalendarItem } from "./calendarModel";
import { focusRing, KIND_TONE, STATUS_TONE } from "./calendarUi";

type Props = {
  item: CalendarItem;
  index: number;
  onSelect: (item: CalendarItem) => void;
  /** Dato destacado a la derecha de la meta («Vencido hace 2 días», «en 3 días»). */
  highlight?: ReactNode;
  highlightTone?: "danger" | "accent" | "muted";
};

const HIGHLIGHT = {
  danger: "text-[#B42323] dark:text-[#F87171]",
  accent: "text-[#1244D1] dark:text-[#9BB6FF]",
  muted: "text-[#71717A] dark:text-[#8EA0B8]",
} as const;

/** Fila de orden o proyecto: tipo + folio + estado, cliente y datos clave. */
export const CalendarItemRow = memo(function CalendarItemRow({ item, index, onSelect, highlight, highlightTone = "muted" }: Props) {
  const tone = STATUS_TONE[item.status];
  const kindTone = KIND_TONE[item.kind];
  const KindIcon = item.kind === "orden" ? ClipboardList : FolderKanban;

  return (
    <li className="cot-rise" style={{ "--cot-i": Math.min(index, 8) } as CSSProperties}>
      <button
        type="button"
        onClick={() => onSelect(item)}
        className={`group flex w-full gap-3 rounded-[12px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5F8FF] dark:hover:bg-[#1B2A63]/25 ${focusRing}`}
      >
        <span className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] ${kindTone.tile}`} aria-hidden>
          <KindIcon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className={`text-[11px] font-semibold uppercase tracking-[0.06em] ${kindTone.text}`}>{KIND_META[item.kind].label}</span>
              <span className="truncate font-mono text-[12px] font-semibold text-[#3F3F46] dark:text-[#D6DEEA]">{item.folio}</span>
            </span>
            <span className={`inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-semibold ring-1 ring-inset ${tone.pill}`}>
              <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden />
              {statusLabel(item)}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-[14px] font-medium text-[#09090B] group-hover:text-[#1244D1] dark:text-[#F8FAFC] dark:group-hover:text-[#C9D7FF]">
            {item.cliente}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
            {highlight ? <span className={`font-semibold ${HIGHLIGHT[highlightTone]}`}>{highlight}</span> : null}
            {item.horaInicio ? (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock className="size-3" aria-hidden />
                {item.horaInicio}
                {item.horaTermino ? ` – ${item.horaTermino}` : ""}
              </span>
            ) : null}
            {item.tecnico ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <UserRound className="size-3 shrink-0" aria-hidden />
                <span className="truncate">{item.tecnico}</span>
              </span>
            ) : null}
          </span>
          {item.avance != null ? (
            <span className="mt-1.5 flex items-center gap-2" aria-label={`Avance ${item.avance}%`}>
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-[#EDEDF0] dark:bg-[#1F2A3C]" aria-hidden>
                <span
                  className={`cot-bar block h-full w-full rounded-full ${tone.dot}`}
                  style={{ transform: `scaleX(${Math.min(100, Math.max(0, item.avance)) / 100})` }}
                />
              </span>
              <span className="text-[11px] font-semibold tabular-nums text-[#52525B] dark:text-[#B7C1D1]">{item.avance}%</span>
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
});
