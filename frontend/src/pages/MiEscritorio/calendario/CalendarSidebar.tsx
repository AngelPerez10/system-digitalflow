/**
 * Panel lateral del calendario.
 *
 * - Pendientes (por defecto): lo que falta atender, sin importar el mes que se
 *   vea: atrasados → hoy → próximos 7 días. Es la respuesta a «¿qué tengo que hacer?».
 * - Agenda: todo lo del periodo visible, agrupado por día.
 */
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { AlertTriangle, CalendarCheck2, CalendarClock, PartyPopper, Sun } from "lucide-react";
import { CalendarItemRow } from "./CalendarItemRow";
import {
  dayLabel,
  diasAtraso,
  rangeLabel,
  toDateKey,
  type AgendaDay,
  type CalendarItem,
  type PendientesBuckets,
} from "./calendarModel";
import { focusRing } from "./calendarUi";

type Tab = "pendientes" | "agenda";

type Props = {
  pendientes: PendientesBuckets;
  agenda: AgendaDay[];
  loading: boolean;
  periodLabel: string;
  onSelect: (item: CalendarItem) => void;
};

function Skeleton() {
  return (
    <div className="space-y-3 p-2" role="status" aria-label="Cargando">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="space-y-2" style={{ opacity: 1 - i * 0.16 }} aria-hidden>
          <span className="block h-3 w-24 rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
          <span className="block h-14 rounded-[12px] bg-[#F4F4F5] motion-safe:animate-pulse dark:bg-[#151E32]" />
        </div>
      ))}
    </div>
  );
}

function Empty({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="cot-fade flex flex-col items-center px-4 py-12 text-center">
      <span className="cot-tick mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-[#E9F8F0] text-[#04724D] dark:bg-[#0F2A1C] dark:text-[#86EFAC] [&_svg]:size-5">
        {icon}
      </span>
      <p className="text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{title}</p>
      <p className="mt-1 max-w-[16rem] text-[13px] text-[#71717A] dark:text-[#8EA0B8]">{text}</p>
    </div>
  );
}

const GROUP_TONE = {
  danger: "text-[#B42323] dark:text-[#F87171]",
  accent: "text-[#1244D1] dark:text-[#9BB6FF]",
  muted: "text-[#52525B] dark:text-[#B7C1D1]",
} as const;

function Group({
  title,
  hint,
  icon,
  tone,
  count,
  children,
}: {
  title: string;
  hint: string;
  icon: ReactNode;
  tone: keyof typeof GROUP_TONE;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="mb-3">
      <header className="sticky top-0 z-[1] flex items-center justify-between gap-2 bg-white/95 px-2.5 py-2 backdrop-blur-sm dark:bg-[#111827]/95">
        <span className={`flex items-center gap-2 text-[13px] font-semibold ${GROUP_TONE[tone]} [&_svg]:size-4`}>
          {icon}
          {title}
          <span className="rounded-full bg-current/10 px-1.5 text-[11px] tabular-nums">{count}</span>
        </span>
        <span className="truncate text-[11.5px] text-[#A1A1AA] dark:text-[#64748B]">{hint}</span>
      </header>
      <ul className="space-y-0.5">{children}</ul>
    </section>
  );
}

const ATRASADOS_VISIBLES = 4;

function PendientesPanel({ pendientes, onSelect }: { pendientes: PendientesBuckets; onSelect: (item: CalendarItem) => void }) {
  const { atrasados, hoy, proximos } = pendientes;
  const today = toDateKey(new Date());
  const [verTodos, setVerTodos] = useState(false);
  const atrasadosVisibles = verTodos ? atrasados : atrasados.slice(0, ATRASADOS_VISIBLES);
  const ocultos = atrasados.length - atrasadosVisibles.length;
  if (!atrasados.length && !hoy.length && !proximos.length) {
    return <Empty icon={<PartyPopper />} title="Estás al día" text="No hay pendientes atrasados, para hoy ni para los próximos 7 días." />;
  }
  let index = 0;
  return (
    <>
      {atrasados.length ? (
        <Group title="Atrasados" hint="Ya pasó su fecha de término" icon={<AlertTriangle />} tone="danger" count={atrasados.length}>
          {atrasadosVisibles.map((it) => {
            const d = diasAtraso(it);
            return (
              <CalendarItemRow
                key={it.id}
                item={it}
                index={index++}
                onSelect={onSelect}
                highlightTone="danger"
                highlight={`Vencido hace ${d} ${d === 1 ? "día" : "días"}`}
              />
            );
          })}
          {ocultos > 0 || verTodos ? (
            <li>
              <button
                type="button"
                onClick={() => setVerTodos((v) => !v)}
                className={`cot-press mx-2.5 mt-1 inline-flex h-9 items-center rounded-[9px] px-3 text-[13px] font-semibold text-[#B42323] hover:bg-[#FEF2F2] dark:text-[#F87171] dark:hover:bg-[#3F1518] ${focusRing}`}
              >
                {verTodos ? "Mostrar menos" : `Ver los ${atrasados.length} atrasados`}
              </button>
            </li>
          ) : null}
        </Group>
      ) : null}
      {hoy.length ? (
        <Group title="Hoy" hint="En curso o programado hoy" icon={<Sun />} tone="accent" count={hoy.length}>
          {hoy.map((it) => (
            <CalendarItemRow
              key={it.id}
              item={it}
              index={index++}
              onSelect={onSelect}
              highlightTone="accent"
              highlight={it.start < today ? `En curso · termina ${dayLabel(it.end).toLowerCase()}` : it.end > today ? rangeLabel(it) : "Hoy"}
            />
          ))}
        </Group>
      ) : null}
      {proximos.length ? (
        <Group title="Próximos 7 días" hint="Para prepararte" icon={<CalendarClock />} tone="muted" count={proximos.length}>
          {proximos.map((it) => (
            <CalendarItemRow key={it.id} item={it} index={index++} onSelect={onSelect} highlight={dayLabel(it.start)} />
          ))}
        </Group>
      ) : null}
    </>
  );
}

function AgendaPanel({ agenda, onSelect }: { agenda: AgendaDay[]; onSelect: (item: CalendarItem) => void }) {
  const todayKey = toDateKey(new Date());
  if (!agenda.length) {
    return <Empty icon={<CalendarCheck2 />} title="Nada en este periodo" text="Cambia de mes o ajusta los filtros." />;
  }
  let index = 0;
  return (
    <ol className="space-y-3">
      {agenda.map((day) => {
        const isToday = day.key === todayKey;
        return (
          <li key={day.key}>
            <p
              className={`sticky top-0 z-[1] flex items-center gap-2 bg-white/95 px-2.5 py-1.5 text-[12.5px] font-semibold backdrop-blur-sm dark:bg-[#111827]/95 ${
                isToday ? "text-[#1B5CFF] dark:text-[#7EA0FF]" : "text-[#52525B] dark:text-[#B7C1D1]"
              }`}
            >
              {isToday ? <span className="size-1.5 rounded-full bg-current motion-safe:animate-pulse" aria-hidden /> : null}
              {dayLabel(day.key)}
              <span className="font-normal text-[#A1A1AA] dark:text-[#64748B]">· {day.items.length}</span>
            </p>
            <ul className="space-y-0.5">
              {day.items.map((it) => (
                <CalendarItemRow
                  key={it.id}
                  item={it}
                  index={index++}
                  onSelect={onSelect}
                  highlight={it.start !== it.end ? rangeLabel(it) : undefined}
                />
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

export function CalendarSidebar({ pendientes, agenda, loading, periodLabel, onSelect }: Props) {
  const [tab, setTab] = useState<Tab>("pendientes");
  const baseId = useId();
  const pendCount = pendientes.atrasados.length + pendientes.hoy.length + pendientes.proximos.length;
  const agendaCount = agenda.reduce((n, d) => n + d.items.length, 0);

  const tabs: { id: Tab; label: string; count: number; alert?: boolean }[] = [
    { id: "pendientes", label: "Pendientes", count: pendCount, alert: pendientes.atrasados.length > 0 },
    { id: "agenda", label: "Agenda", count: agendaCount },
  ];

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = tab === "pendientes" ? "agenda" : "pendientes";
    setTab(next);
    document.getElementById(`${baseId}-${next}`)?.focus();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-[#F0F0F2] px-3 pt-3 dark:border-[#1F2A3C]">
        <div role="tablist" aria-label="Panel lateral" onKeyDown={onKey} className="grid grid-cols-2 gap-1 rounded-[12px] bg-[#F4F4F5] p-1 dark:bg-[#0F172A]">
          {tabs.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                id={`${baseId}-${t.id}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`${baseId}-${t.id}-panel`}
                tabIndex={on ? 0 : -1}
                onClick={() => setTab(t.id)}
                className={`cot-press inline-flex h-9 items-center justify-center gap-2 rounded-[9px] text-[13px] font-semibold ${focusRing} ${
                  on
                    ? "bg-white text-[#09090B] shadow-[0_1px_2px_rgba(9,9,11,0.08)] dark:bg-[#1B2539] dark:text-white"
                    : "text-[#71717A] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:text-white"
                }`}
              >
                {t.label}
                {!loading ? (
                  <span
                    key={t.count}
                    className={`cot-flash inline-flex min-w-5 justify-center rounded-full px-1.5 text-[11px] tabular-nums ${
                      t.alert ? "bg-[#C22B2B] text-white dark:bg-[#DC3E3E]" : "bg-black/[0.06] dark:bg-white/10"
                    }`}
                  >
                    {t.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <p key={tab + periodLabel} className="cot-fade px-1 pb-2.5 pt-2 text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
          {tab === "pendientes" ? (
            "Lo que falta atender, sin importar el mes que estés viendo."
          ) : (
            <>
              Todo lo de <span className="font-medium capitalize text-[#3F3F46] dark:text-[#D6DEEA]">{periodLabel}</span>.
            </>
          )}
        </p>
      </div>

      <div
        id={`${baseId}-${tab}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-${tab}`}
        key={tab}
        className="cot-fade custom-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-2"
      >
        {loading ? (
          <Skeleton />
        ) : tab === "pendientes" ? (
          <PendientesPanel pendientes={pendientes} onSelect={onSelect} />
        ) : (
          <AgendaPanel agenda={agenda} onSelect={onSelect} />
        )}
      </div>
    </div>
  );
}
