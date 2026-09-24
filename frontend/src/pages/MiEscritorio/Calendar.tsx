/**
 * Calendario de órdenes de servicio y proyectos (Mi escritorio).
 *
 * FullCalendar solo pinta la rejilla: la barra (navegación, vistas, filtros),
 * el panel de pendientes/agenda y el detalle son componentes propios. El tema
 * vive en `calendario/calendar.css`, acotado a `.dfcal`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DatesSetArg, EventClickArg, EventContentArg, EventInput } from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es";
import { ChevronLeft, ChevronRight, ClipboardList, FolderKanban, Loader2, RotateCw } from "lucide-react";
import PageMeta from "@/components/common/PageMeta";
import { fetchApi } from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import { listProyectos } from "@/pages/Operacion/Proyectos/shared/proyectoApi";
import "@/components/ui/modal-kit/motion.css";
import "./calendario/calendar.css";
import { CalendarEventDialog } from "./calendario/CalendarEventDialog";
import { CalendarSidebar } from "./calendario/CalendarSidebar";
import {
  addDaysKey,
  countByKind,
  countByStatus,
  groupAgenda,
  ITEM_STATUSES,
  KIND_META,
  ordenToItem,
  overlapsRange,
  pendientesBuckets,
  proyectoToItem,
  STATUS_META,
  statusLabel,
  toDateKey,
  type CalendarItem,
  type CalendarOrden,
  type ItemKind,
  type ItemStatus,
} from "./calendario/calendarModel";
import { focusRing, KIND_TONE, sansStyle, STATUS_TONE } from "./calendario/calendarUi";

type ViewType = "dayGridMonth" | "dayGridWeek" | "dayGridDay";

const VIEWS: { id: ViewType; label: string }[] = [
  { id: "dayGridMonth", label: "Mes" },
  { id: "dayGridWeek", label: "Semana" },
  { id: "dayGridDay", label: "Día" },
];

const KINDS: ItemKind[] = ["orden", "proyecto"];
const PLUGINS = [dayGridPlugin, interactionPlugin];

/** Evento: ícono de tipo + barra de estado + folio + cliente (estilos en calendar.css). */
function renderEventContent(arg: EventContentArg) {
  const item = arg.event.extendedProps.item as CalendarItem;
  const Icon = item.kind === "orden" ? ClipboardList : FolderKanban;
  return (
    <div
      className={`dfcal-ev dfcal-ev--${item.status} dfcal-ev--${item.kind}`}
      title={`${KIND_META[item.kind].label} ${item.folio} · ${item.cliente} · ${statusLabel(item)}`}
    >
      <span className="dfcal-ev__bar" aria-hidden />
      <Icon className="dfcal-ev__icon" aria-hidden />
      <span className="dfcal-ev__folio">{item.folio}</span>
      <span className="dfcal-ev__cliente">{item.cliente}</span>
    </div>
  );
}

function unwrapRows(data: unknown): CalendarOrden[] {
  if (Array.isArray(data)) return data as CalendarOrden[];
  const results = (data as { results?: CalendarOrden[] } | null)?.results;
  return Array.isArray(results) ? results : [];
}

type Range = { title: string; view: ViewType; start: string; end: string };

const navBtn = `cot-press inline-flex size-10 items-center justify-center rounded-[10px] border border-[#E4E4E7] bg-white text-[#3F3F46] hover:border-[#D3D3D8] hover:bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#151E32] dark:text-[#D6DEEA] dark:hover:bg-[#1B2539] ${focusRing}`;

const chipBase = `cot-press inline-flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 text-[12.5px] font-semibold ${focusRing}`;
const chipOff =
  "border-dashed border-[#D4D4D8] bg-transparent text-[#A1A1AA] line-through decoration-1 dark:border-[#3A4661] dark:text-[#64748B]";

export default function Calendar() {
  const { user, isAdmin, permissions } = useAuth();
  const canProyectos = isAdmin || permissions?.proyectos?.view === true;
  const calendarRef = useRef<FullCalendar>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [hiddenStatus, setHiddenStatus] = useState<Set<ItemStatus>>(() => new Set());
  const [hiddenKind, setHiddenKind] = useState<Set<ItemKind>>(() => new Set());
  const [range, setRange] = useState<Range | null>(null);
  const [selected, setSelected] = useState<CalendarItem | null>(null);

  const userId = user?.id ?? null;

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    (async () => {
      const [ordenesRes, proyectosRes] = await Promise.allSettled([
        (async () => {
          const res = await fetchApi("/api/ordenes/", { signal: ac.signal });
          const data = await res.json().catch(() => null);
          if (!res.ok) throw new Error((data as { detail?: string } | null)?.detail || "No se pudieron cargar las órdenes.");
          let rows = unwrapRows(data);
          // El técnico solo ve sus propias órdenes.
          if (!isAdmin && userId != null) rows = rows.filter((o) => Number(o.tecnico_asignado) === Number(userId));
          return rows.map(ordenToItem).filter((x): x is CalendarItem => x != null);
        })(),
        // El backend ya limita los proyectos del técnico a los suyos.
        canProyectos
          ? listProyectos().then((rows) => rows.map(proyectoToItem).filter((x): x is CalendarItem => x != null))
          : Promise.resolve([] as CalendarItem[]),
      ]);
      if (ac.signal.aborted) return;
      const next: CalendarItem[] = [];
      const errors: string[] = [];
      if (ordenesRes.status === "fulfilled") next.push(...ordenesRes.value);
      else errors.push("órdenes");
      if (proyectosRes.status === "fulfilled") next.push(...proyectosRes.value);
      else errors.push("proyectos");
      setItems(next);
      setError(errors.length ? `No se pudieron cargar ${errors.join(" ni ")}. Lo demás se muestra normal.` : null);
      setLoading(false);
    })();
    return () => ac.abort();
  }, [isAdmin, userId, canProyectos, reloadKey]);

  // FullCalendar solo escucha el resize de la ventana; el contenedor también cambia
  // (menú lateral, rejilla con el panel). Un ajuste por frame como máximo.
  useEffect(() => {
    const el = gridRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let frame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => calendarRef.current?.getApi().updateSize());
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, []);

  /* --- Derivados -------------------------------------------------------- */

  const byKind = useMemo(() => items.filter((it) => !hiddenKind.has(it.kind)), [items, hiddenKind]);
  const visible = useMemo(() => byKind.filter((it) => !hiddenStatus.has(it.status)), [byKind, hiddenStatus]);

  const inRangeAll = useMemo(
    () => (range ? items.filter((it) => overlapsRange(it, range.start, range.end)) : []),
    [items, range]
  );
  const kindCounts = useMemo(() => countByKind(inRangeAll), [inRangeAll]);
  const statusCounts = useMemo(
    () => countByStatus(inRangeAll.filter((it) => !hiddenKind.has(it.kind))),
    [inRangeAll, hiddenKind]
  );

  const events = useMemo<EventInput[]>(
    () =>
      visible.map((it) => ({
        id: it.id,
        start: it.start,
        end: addDaysKey(it.end, 1),
        allDay: true,
        extendedProps: { item: it },
      })),
    [visible]
  );

  const agenda = useMemo(() => (range ? groupAgenda(visible, range.start, range.end) : []), [visible, range]);
  // Pendientes: respetan el filtro de tipo, no el de estado (siempre son los abiertos).
  const pendientes = useMemo(() => pendientesBuckets(byKind), [byKind]);

  /* --- Navegación ------------------------------------------------------- */

  const api = () => calendarRef.current?.getApi();

  const onDatesSet = useCallback((arg: DatesSetArg) => {
    const title = arg.view.title.charAt(0).toUpperCase() + arg.view.title.slice(1);
    const start = toDateKey(arg.view.currentStart);
    const end = toDateKey(arg.view.currentEnd);
    setRange((prev) =>
      prev && prev.title === title && prev.view === arg.view.type && prev.start === start && prev.end === end
        ? prev
        : { title, view: arg.view.type as ViewType, start, end }
    );
  }, []);

  const onEventClick = useCallback((arg: EventClickArg) => {
    arg.jsEvent.preventDefault();
    setSelected(arg.event.extendedProps.item as CalendarItem);
  }, []);

  function toggle<T>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  const todayKey = toDateKey(new Date());
  const isTodayInRange = range ? todayKey >= range.start && todayKey < range.end : true;
  const kinds = canProyectos ? KINDS : (["orden"] as ItemKind[]);

  return (
    <div className="min-h-[calc(100dvh-5rem)] overflow-x-hidden" style={sansStyle}>
      <PageMeta title="Calendario | Sistema Grupo Intrax GPS" description="Calendario de órdenes de servicio y proyectos" />

      <div className="mx-auto w-full max-w-[min(100%,1920px)] space-y-4 px-3 pb-12 pt-5 sm:px-5 sm:pt-6 md:px-6 lg:px-8 xl:px-10">
        <div className="flex flex-wrap items-end justify-between gap-2 px-1">
          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.6px] text-[#09090B] dark:text-[#F8FAFC] sm:text-[24px]">
              {isAdmin ? "Calendario" : "Mi calendario"}
            </h1>
            <p className="text-[13.5px] text-[#6E6E77] dark:text-[#8EA0B8]">
              {canProyectos ? "Órdenes de servicio y proyectos" : "Órdenes de servicio"}
              {isAdmin ? " del equipo" : " asignados a ti"}, por fecha.
            </p>
          </div>
        </div>

        {error ? (
          <div
            className="cot-fade flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#F6CFCF] bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#9F1F1F] dark:border-[#7F1D1D] dark:bg-[#3F1518] dark:text-[#FCA5A5]"
            role="alert"
          >
            {error}
            <button type="button" onClick={() => setReloadKey((k) => k + 1)} className={`${navBtn} w-auto gap-2 px-3 text-[13px] font-semibold`}>
              <RotateCw className="size-4" aria-hidden />
              Reintentar
            </button>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_23rem]">
          {/* Calendario */}
          <section
            aria-label="Calendario"
            className="min-w-0 self-start overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white shadow-[0_6px_20px_-12px_rgba(9,9,11,0.16)] dark:border-[#273244] dark:bg-[#111827]"
          >
            <div className="flex flex-col gap-3 border-b border-[#F0F0F2] px-4 py-3.5 dark:border-[#1F2A3C] sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <button type="button" className={navBtn} onClick={() => api()?.prev()} aria-label="Periodo anterior">
                    <ChevronLeft className="size-4" aria-hidden />
                  </button>
                  <button type="button" className={navBtn} onClick={() => api()?.next()} aria-label="Periodo siguiente">
                    <ChevronRight className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => api()?.today()}
                    disabled={isTodayInRange}
                    className={`${navBtn} w-auto px-3.5 text-[14px] font-semibold disabled:cursor-default disabled:opacity-50`}
                  >
                    Hoy
                  </button>
                  <h2
                    key={range?.title}
                    className="cot-fade order-first basis-full truncate text-[19px] font-semibold tracking-[-0.4px] text-[#09090B] dark:text-[#F8FAFC] sm:order-none sm:ml-1 sm:basis-auto sm:text-[20px]"
                    aria-live="polite"
                  >
                    {range?.title ?? " "}
                  </h2>
                  {loading ? <Loader2 className="size-4 shrink-0 animate-spin text-[#1B5CFF]" aria-label="Cargando" /> : null}
                </div>

                <div role="radiogroup" aria-label="Vista" className="flex rounded-[10px] border border-[#E4E4E7] bg-[#F4F4F5]/70 p-0.5 dark:border-[#273244] dark:bg-[#0F172A]">
                  {VIEWS.map((v) => {
                    const on = range?.view === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => api()?.changeView(v.id)}
                        className={`cot-press inline-flex h-9 items-center rounded-[8px] px-3.5 text-[13px] font-semibold ${focusRing} ${
                          on
                            ? "bg-white text-[#09090B] shadow-[0_1px_2px_rgba(9,9,11,0.08)] dark:bg-[#1B2539] dark:text-white"
                            : "text-[#71717A] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:text-white"
                        }`}
                      >
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filtros: tipo y estado, con conteos del periodo visible. */}
              <div className="-mx-4 flex items-center gap-x-3 gap-y-2 overflow-x-auto px-4 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
                {kinds.length > 1 ? (
                  <div className="flex shrink-0 items-center gap-1.5 sm:flex-wrap" role="group" aria-label="Mostrar tipo">
                    {kinds.map((k) => {
                      const on = !hiddenKind.has(k);
                      const Icon = k === "orden" ? ClipboardList : FolderKanban;
                      return (
                        <button
                          key={k}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggle(setHiddenKind, k)}
                          className={`${chipBase} ${on ? KIND_TONE[k].chipOn : chipOff}`}
                        >
                          <Icon className="size-3.5" aria-hidden />
                          {KIND_META[k].plural}
                          <span key={kindCounts[k]} className="cot-flash tabular-nums opacity-70">
                            {loading ? "·" : kindCounts[k]}
                          </span>
                        </button>
                      );
                    })}
                    <span className="mx-1 hidden h-5 w-px bg-[#E4E4E7] dark:bg-[#273244] sm:block" aria-hidden />
                  </div>
                ) : null}
                <div className="flex shrink-0 items-center gap-1.5 sm:flex-wrap" role="group" aria-label="Mostrar estados">
                  {ITEM_STATUSES.map((s) => {
                    const on = !hiddenStatus.has(s);
                    const tone = STATUS_TONE[s];
                    return (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(setHiddenStatus, s)}
                        className={`${chipBase} ${on ? tone.chipOn : chipOff}`}
                      >
                        <span className={`size-2 rounded-full transition-opacity duration-200 ${tone.dot} ${on ? "" : "opacity-40"}`} aria-hidden />
                        {STATUS_META[s].plural}
                        <span key={statusCounts[s]} className="cot-flash tabular-nums opacity-70">
                          {loading ? "·" : statusCounts[s]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div ref={gridRef} className="dfcal px-1 pb-1 sm:px-2 sm:pb-2">
              <FullCalendar
                ref={calendarRef}
                plugins={PLUGINS}
                locale={esLocale}
                initialView="dayGridMonth"
                headerToolbar={false}
                height="auto"
                fixedWeekCount={false}
                dayMaxEvents={3}
                moreLinkText={(n) => `+${n} más`}
                navLinks
                navLinkDayClick="dayGridDay"
                eventDisplay="block"
                events={events}
                eventContent={renderEventContent}
                eventClick={onEventClick}
                datesSet={onDatesSet}
              />
            </div>

            {/* Leyenda: cómo leer los colores y formas. */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[#F0F0F2] px-4 py-3 text-[12px] text-[#71717A] dark:border-[#1F2A3C] dark:text-[#8EA0B8] sm:px-5">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 w-6 rounded-[4px] bg-[#EEF3FF] dark:bg-[#1B2A63]" aria-hidden />
                Orden (relleno)
              </span>
              {canProyectos ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-3 w-6 rounded-[4px] border border-[#8EA7F0] bg-white dark:border-[#4B7CFF] dark:bg-transparent" aria-hidden />
                  Proyecto (contorno)
                </span>
              ) : null}
              <span className="hidden sm:inline">·</span>
              <span>El color indica el estado. Toca un día para verlo completo.</span>
            </div>
          </section>

          {/* Pendientes / agenda */}
          <aside className="flex max-h-[min(82dvh,58rem)] min-h-[22rem] flex-col overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white shadow-[0_6px_20px_-12px_rgba(9,9,11,0.16)] dark:border-[#273244] dark:bg-[#111827] xl:sticky xl:top-24 xl:self-start">
            <CalendarSidebar
              pendientes={pendientes}
              agenda={agenda}
              loading={loading}
              periodLabel={range?.title ?? ""}
              onSelect={setSelected}
            />
          </aside>
        </div>
      </div>

      <CalendarEventDialog item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
