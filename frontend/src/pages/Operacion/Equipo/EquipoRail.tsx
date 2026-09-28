/**
 * Riel de técnicos del tablero Equipo (panel izquierdo, fijo al hacer scroll).
 *
 * - Clic: elige qué listado se ve a la derecha (todo el equipo, la bandeja
 *   «Sin asignar» o un técnico).
 * - Arrastre: cada técnico (y «Sin asignar») es zona de soltar. Mientras se
 *   arrastra, las zonas válidas muestran borde punteado y la que está bajo
 *   el puntero se resalta con «Soltar». Solo cambian colores, sombra y un
 *   `scale` mínimo (sin reflow).
 *
 * En celular el riel se vuelve una tira horizontal de técnicos (ahí no hay
 * arrastre nativo; se reasigna con «Mover a…»).
 */
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { ArrowDownToLine, ChevronRight, Layers, Search } from "lucide-react";
import { focusRing } from "../Proyectos/shared/proyectoTokens";
import { RAIL_TODOS, columnKey, isEquipoDragData } from "./equipoDnd";
import { ordenAbierta, proyectoActivo, type EquipoSeccion } from "./equipoGrouping";
import { EquipoAvatar } from "./EquipoUi";

type ItemProps = {
  railKey: string;
  titulo: string;
  sub: string;
  count: number;
  carga: number | null;
  selected: boolean;
  dropEnabled: boolean;
  accepts: boolean;
  isOver: boolean;
  avatar: React.ReactNode;
  tone?: "default" | "inbox";
  onSelect: (key: string) => void;
  onOverChange: (key: string, over: boolean) => void;
};

const RailItem = memo(function RailItem({
  railKey,
  titulo,
  sub,
  count,
  carga,
  selected,
  dropEnabled,
  accepts,
  isOver,
  avatar,
  tone = "default",
  onSelect,
  onOverChange,
}: ItemProps) {
  const ref = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !dropEnabled) return;
    return dropTargetForElements({
      element: el,
      getData: () => ({ kind: "equipo-columna", key: railKey }),
      canDrop: ({ source }) => isEquipoDragData(source.data) && source.data.fromKey !== railKey,
      onDragEnter: () => onOverChange(railKey, true),
      onDragLeave: () => onOverChange(railKey, false),
      onDrop: () => onOverChange(railKey, false),
    });
  }, [dropEnabled, railKey, onOverChange]);

  const state = isOver
    ? "scale-[1.015] border-[#1B5CFF] bg-[#EEF3FF] shadow-[0_0_0_4px_rgba(27,92,255,0.14)] dark:border-[#4B7CFF] dark:bg-[#1B2A63]/50"
    : accepts
      ? "border-dashed border-[#BFD3FF] bg-white dark:border-[#2C3F7A] dark:bg-[#111827]"
      : selected
        ? "border-[#1B5CFF]/45 bg-[#EEF3FF] shadow-[0_6px_16px_-10px_rgba(27,92,255,0.55)] dark:border-[#4B7CFF]/50 dark:bg-[#1B2A63]/55"
        : "border-transparent hover:border-[#E7E7EA] hover:bg-[#FAFAFA] dark:hover:border-[#273244] dark:hover:bg-white/[0.03]";

  return (
    <li className="shrink-0 lg:shrink">
      <button
        ref={ref}
        type="button"
        onClick={() => onSelect(railKey)}
        aria-current={selected ? "true" : undefined}
        className={`relative flex w-56 items-center gap-3 rounded-[14px] border px-3 py-2.5 text-left transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out motion-reduce:transition-none lg:w-full ${state} ${focusRing}`}
      >
        {selected && !isOver ? (
          <span className="cot-pop absolute -left-px top-2 bottom-2 w-1 rounded-r-full bg-[#1B5CFF] dark:bg-[#7EA0FF]" aria-hidden />
        ) : null}
        {avatar}
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[13.5px] font-semibold ${selected ? "text-[#1244D1] dark:text-[#C9D7FF]" : "text-[#09090B] dark:text-[#F8FAFC]"}`}>
            {titulo}
          </span>
          <span className="block truncate text-[12px] text-[#71717A] dark:text-[#8EA0B8]">{sub}</span>
          {carga != null ? (
            <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-[#EDEDF0] dark:bg-[#1F2A3C]" aria-hidden>
              <span
                className={`cot-bar block h-full w-full rounded-full ${carga >= 0.85 ? "bg-[#D08A1E] dark:bg-[#E6A23C]" : "bg-[#1B5CFF] dark:bg-[#4B7CFF]"}`}
                style={{ transform: `scaleX(${carga})` }}
              />
            </span>
          ) : null}
        </span>
        {isOver ? (
          <span className="cot-pop inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-[#1B5CFF] px-2 text-[11.5px] font-semibold text-white dark:bg-[#4B7CFF]">
            <ArrowDownToLine className="size-3.5" aria-hidden />
            Soltar
          </span>
        ) : (
          <span
            key={count}
            className={`cot-flash inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-[12px] font-semibold tabular-nums ${
              tone === "inbox" && count > 0
                ? "bg-[#FFF1D6] text-[#8A5D0F] dark:bg-[rgba(230,162,60,0.16)] dark:text-[#F2C27A]"
                : count === 0
                  ? "bg-[#E9F8F0] text-[#04724D] dark:bg-[#0F2A1C] dark:text-[#86EFAC]"
                  : "bg-[#F4F4F5] text-[#3F3F46] dark:bg-white/6 dark:text-[#D6DEEA]"
            }`}
            title={`${count} ${count === 1 ? "abierto" : "abiertos"}`}
          >
            {count}
            <span className="sr-only">{count === 1 ? " abierto" : " abiertos"}</span>
          </span>
        )}
        {selected && !isOver ? (
          <ChevronRight className="cot-pop -mr-1 hidden size-4 shrink-0 text-[#1B5CFF] dark:text-[#9BB6FF] lg:block" aria-hidden />
        ) : null}
      </button>
    </li>
  );
});

function subDe(s: EquipoSeccion): string {
  const o = s.ordenes.length;
  const p = s.proyectos.length;
  if (o + p === 0) return s.tecnico.id == null ? "Todo está asignado" : "Sin carga";
  return `${o} ${o === 1 ? "orden" : "órdenes"} · ${p} ${p === 1 ? "proyecto" : "proyectos"}`;
}

export function EquipoRail({
  secciones,
  selectedKey,
  onSelect,
  dragging,
  dragFromKey,
  overKey,
  onOverChange,
  ocultarSinCarga,
}: {
  secciones: EquipoSeccion[];
  selectedKey: string;
  onSelect: (key: string) => void;
  dragging: boolean;
  dragFromKey: string | null;
  overKey: string | null;
  onOverChange: (key: string, over: boolean) => void;
  ocultarSinCarga: boolean;
}) {
  const [filtro, setFiltro] = useState("");
  const tecnicos = secciones.filter((s) => s.tecnico.id != null);
  const sinAsignar = secciones.find((s) => s.tecnico.id == null);
  const maxCarga = Math.max(1, ...tecnicos.map((s) => s.pendientes));
  // Un proyecto con varios técnicos cuenta una vez.
  const { total, abiertos } = useMemo(() => {
    const todos = new Set<string>();
    const open = new Set<string>();
    for (const s of secciones) {
      for (const o of s.ordenes) {
        todos.add(`o${o.id}`);
        if (ordenAbierta(o)) open.add(`o${o.id}`);
      }
      for (const r of s.proyectos) {
        todos.add(`p${r.id}`);
        if (proyectoActivo(r)) open.add(`p${r.id}`);
      }
    }
    return { total: todos.size, abiertos: open.size };
  }, [secciones]);

  const q = filtro.trim().toLowerCase();
  const visibles = tecnicos.filter((s) => {
    if (q && !s.tecnico.nombre.toLowerCase().includes(q)) return false;
    // Nunca ocultar al técnico elegido ni mientras se arrastra (es zona de soltar).
    if (ocultarSinCarga && !dragging && s.pendientes === 0 && columnKey(s.tecnico.id) !== selectedKey) return false;
    return true;
  });

  const item = (s: EquipoSeccion) => {
    const key = columnKey(s.tecnico.id);
    return (
      <RailItem
        key={key}
        railKey={key}
        titulo={s.tecnico.nombre}
        sub={subDe(s)}
        count={s.pendientes}
        carga={s.tecnico.id == null ? null : s.pendientes / maxCarga}
        selected={selectedKey === key}
        dropEnabled
        accepts={dragging && dragFromKey !== key}
        isOver={overKey === key}
        avatar={<EquipoAvatar id={s.tecnico.id} nombre={s.tecnico.nombre} avatarUrl={s.tecnico.avatarUrl} />}
        tone={s.tecnico.id == null ? "inbox" : "default"}
        onSelect={onSelect}
        onOverChange={onOverChange}
      />
    );
  };

  return (
    <aside
      aria-label="Técnicos"
      className="min-w-0 rounded-[20px] border border-[#E7E7EA] bg-white p-2.5 dark:border-[#273244] dark:bg-[#111827] lg:sticky lg:top-[5.75rem] lg:flex lg:max-h-[calc(100dvh-7rem)] lg:flex-col"
    >
      <div className="flex items-center justify-between gap-2 px-1.5 pb-2 pt-1">
        <div className="min-w-0">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]">Técnicos</h2>
          <p key={dragging ? "d" : "n"} className="cot-fade truncate text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
            {dragging ? "Suelta sobre un técnico para asignar" : `${tecnicos.length} en el equipo`}
          </p>
        </div>
      </div>

      {tecnicos.length > 8 ? (
        <div className="relative mb-2 hidden px-0.5 lg:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#A1A1AA]" aria-hidden />
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar técnicos…"
            aria-label="Filtrar técnicos"
            className="h-9 w-full rounded-[10px] border border-[#E4E4E7] bg-[#FAFAFA] pl-8 pr-3 text-[13px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] focus:border-[#1B5CFF] focus:bg-white focus:ring-4 focus:ring-[rgba(27,92,255,0.14)] dark:border-[#273244] dark:bg-[#0F172A] dark:text-[#F8FAFC] dark:focus:border-[#4B7CFF]"
          />
        </div>
      ) : null}

      <ul className="custom-scrollbar -mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-1 lg:flex-1 lg:flex-col lg:gap-1 lg:overflow-y-auto lg:overflow-x-visible lg:pb-0">
        <RailItem
          railKey={RAIL_TODOS}
          titulo="Todo el equipo"
          sub={`${total} ${total === 1 ? "elemento" : "elementos"} en el mes`}
          count={abiertos}
          carga={null}
          selected={selectedKey === RAIL_TODOS}
          dropEnabled={false}
          accepts={false}
          isOver={false}
          avatar={
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[#17235B] text-white dark:bg-[#1B2A63]" aria-hidden>
              <Layers className="size-4" />
            </span>
          }
          onSelect={onSelect}
          onOverChange={onOverChange}
        />
        {sinAsignar ? item(sinAsignar) : null}
        <li className="hidden px-2 pb-1 pt-2 lg:block" aria-hidden>
          <span className="block h-px bg-[#F0F0F2] dark:bg-[#1F2A3C]" />
        </li>
        {visibles.map(item)}
        {visibles.length === 0 ? (
          <li className="px-3 py-4 text-center text-[12.5px] text-[#A1A1AA] dark:text-[#64748B]">Ningún técnico coincide.</li>
        ) : null}
      </ul>
    </aside>
  );
}
