/**
 * Barra de mando del tablero: una sola superficie con la búsqueda a la
 * izquierda y las acciones a la derecha (en celular, debajo).
 * - Búsqueda: folio, cliente o técnico; atajo «/». Al enfocarla se ilumina
 *   toda la barra (borde + halo, solo color y sombra).
 * - Acciones: «Filtros» (tipo, estado y técnicos sin trabajo), «Sin asignar»,
 *   «Reporte» e «Historial»; botones fantasma con micro-movimiento del ícono.
 * - Filtros activos: segunda línea con un chip por filtro y «Limpiar».
 *
 * Panel: se abre debajo del botón, alineado a la derecha; Esc o clic afuera
 * lo cierran y el foco vuelve al botón. Entrada con `cot-pop`.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, ClipboardList, FolderKanban, History, Layers, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { focusRing } from "../../Proyectos/shared/proyectoTokens";
import type { EquipoEstadoFiltro, EquipoFiltros, EquipoTipoFiltro } from "../shared/equipoFiltros";
import { TIPO_TONE, toolbarBadge, toolbarBtn, toolbarGroup } from "../shared/equipoTokens";

type Counts = { todo: number; ordenes: number; proyectos: number };

const TIPO_LABEL: Record<EquipoTipoFiltro, string> = { todo: "Todo", ordenes: "Órdenes", proyectos: "Proyectos" };

/* --------------------------------------------------------------------------
   Piezas del panel
   -------------------------------------------------------------------------- */

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  // `div` + título en lugar de `fieldset`/`legend`: la leyenda ignora el padding.
  return (
    <div role="group" aria-labelledby={id} className="px-4 py-3">
      <p id={id} className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6E6E77] dark:text-[#8EA0B8]">
        {title}
      </p>
      {children}
    </div>
  );
}

/** Opción tipo radio con ícono, etiqueta y conteo. */
function Option({
  selected,
  onSelect,
  icon,
  label,
  count,
}: {
  selected: boolean;
  onSelect: () => void;
  icon?: ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`cot-press flex h-10 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left text-[13px] font-medium ${
        selected
          ? "bg-[#EEF3FF] text-[#1244D1] dark:bg-[#1B2A63]/60 dark:text-[#C9D7FF]"
          : "text-[#3F3F46] hover:bg-[#F4F4F5] dark:text-[#D6DEEA] dark:hover:bg-white/[0.05]"
      } ${focusRing}`}
    >
      {icon ? (
        <span className={`[&_svg]:size-4 ${selected ? "" : "text-[#A1A1AA]"}`} aria-hidden>
          {icon}
        </span>
      ) : null}
      <span className="flex-1">{label}</span>
      {count != null ? <span className="text-[12px] tabular-nums text-[#A1A1AA] dark:text-[#64748B]">{count}</span> : null}
      <Check className={`size-4 ${selected ? "opacity-100" : "opacity-0"}`} aria-hidden />
    </button>
  );
}

function Chip({ children, onRemove, label }: { children: ReactNode; onRemove: () => void; label: string }) {
  return (
    <span className="cot-pop inline-flex h-7 items-center gap-0.5 rounded-full border border-[#D6E2FF] bg-[#F3F6FF] pl-2.5 pr-0.5 text-[12px] font-semibold text-[#1244D1] dark:border-[#2C3F7A] dark:bg-[#1B2A63]/50 dark:text-[#C9D7FF]">
      {children}
      <button
        type="button"
        onClick={onRemove}
        className={`inline-flex size-6 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#1B5CFF]/12 ${focusRing}`}
        aria-label={`Quitar filtro ${label}`}
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}

/* --------------------------------------------------------------------------
   Barra
   -------------------------------------------------------------------------- */

export function EquipoFilterBar({
  filtros,
  onChange,
  counts,
  ocultarSinTrabajo,
  onOcultarSinTrabajo,
  defaults,
  historialHoy,
  onOpenHistorial,
  reporte,
}: {
  filtros: EquipoFiltros;
  onChange: (f: EquipoFiltros) => void;
  counts: Counts;
  ocultarSinTrabajo: boolean;
  onOcultarSinTrabajo: (v: boolean) => void;
  /** Valores de «Restablecer». */
  defaults: EquipoFiltros;
  historialHoy: number;
  onOpenHistorial: () => void;
  /** Botón «Reporte» (va entre Filtros e Historial). */
  reporte?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const activos = Number(filtros.tipo !== defaults.tipo) + Number(filtros.estado !== defaults.estado) + Number(ocultarSinTrabajo);

  // «/» enfoca la búsqueda (salvo si ya se escribe en otro campo).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Panel abierto: Esc o clic afuera lo cierran (el foco vuelve al botón con Esc).
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const restablecer = () => {
    onChange({ ...filtros, tipo: defaults.tipo, estado: defaults.estado });
    onOcultarSinTrabajo(false);
  };

  const hayChips = activos > 0;

  return (
    <div
      className="eq-cmdbar eq-row-in rounded-[16px] border border-[#E7E7EA] bg-white p-1.5 shadow-[0_1px_2px_rgba(9,9,11,0.04),0_8px_24px_-18px_rgba(23,35,91,0.35)] has-[input:focus]:border-[#BFD3FF] has-[input:focus]:shadow-[0_0_0_4px_rgba(27,92,255,0.08),0_8px_24px_-18px_rgba(23,35,91,0.35)] dark:border-[#243044] dark:bg-[#111827] dark:shadow-[0_8px_24px_-16px_rgba(0,0,0,0.6)] dark:has-[input:focus]:border-[#2C3F7A] dark:has-[input:focus]:shadow-[0_0_0_4px_rgba(75,124,255,0.14)]"
    >
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
        <label className="eq-search group/search relative min-w-0 flex-1">
          <span className="sr-only">Buscar por folio, cliente o técnico</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#A1A1AA] transition-colors duration-150 group-focus-within/search:text-[#1B5CFF] dark:group-focus-within/search:text-[#6B93FF]"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="search"
            value={filtros.q}
            onChange={(e) => onChange({ ...filtros, q: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Escape" && filtros.q) {
                e.preventDefault();
                onChange({ ...filtros, q: "" });
              }
            }}
            placeholder="Buscar folio, cliente o técnico…"
            className="h-10 w-full rounded-[10px] bg-transparent pl-9.5 pr-14 text-[13.5px] text-[#09090B] outline-none transition-colors duration-150 placeholder:text-[#A1A1AA] hover:bg-[#FAFAFB] focus:bg-transparent dark:text-[#F8FAFC] dark:placeholder:text-[#64748B] dark:hover:bg-white/[0.03] [&::-webkit-search-cancel-button]:hidden"
          />
          {filtros.q ? (
            <button
              type="button"
              onClick={() => {
                onChange({ ...filtros, q: "" });
                inputRef.current?.focus();
              }}
              className={`cot-pop absolute right-1.5 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-[8px] text-[#71717A] transition-colors duration-150 hover:bg-[#F4F4F5] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:bg-white/[0.06] dark:hover:text-white ${focusRing}`}
              aria-label="Limpiar búsqueda"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : (
            <kbd className="eq-kbd pointer-events-none absolute right-2.5 top-1/2 inline-flex h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded-[6px] border border-b-2 border-[#E4E4E7] bg-[#FAFAFB] px-1 font-mono text-[11px] text-[#71717A] dark:border-[#273244] dark:bg-[#0F172A] dark:text-[#8EA0B8]">
              /
            </kbd>
          )}
        </label>

        <span className="hidden h-6 w-px shrink-0 bg-[#E7E7EA] sm:block dark:bg-[#243044]" aria-hidden />

        <div className={toolbarGroup} role="toolbar" aria-label="Herramientas del tablero">
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <button
              ref={btnRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={panelId}
              aria-haspopup="dialog"
              aria-label={activos > 0 ? `Filtros, ${activos} activos` : "Filtros"}
              className={toolbarBtn(open || activos > 0)}
            >
              <SlidersHorizontal data-eq-icon="filtros" aria-hidden />
              <span className="hidden sm:inline">Filtros</span>
              {activos > 0 ? (
                <span key={activos} className={toolbarBadge.blue} aria-hidden>
                  {activos}
                </span>
              ) : null}
              <ChevronDown className={`hidden size-3.5! opacity-60 transition-transform duration-200 motion-reduce:transition-none sm:block ${open ? "rotate-180" : ""}`} aria-hidden />
            </button>

            {open ? (
              <div
                ref={panelRef}
                id={panelId}
                role="dialog"
                aria-label="Filtros"
                className="cot-pop absolute left-0 top-[calc(100%+8px)] z-40 origin-top-left sm:left-auto sm:right-0 sm:origin-top-right w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-[16px] border border-[#E4E4E7] bg-white shadow-[0_24px_48px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:bg-[#111827]"
              >
                <div className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]">
                  <Section title="Tipo de trabajo">
                    <div role="radiogroup" aria-label="Tipo de trabajo" className="space-y-0.5">
                      <Option selected={filtros.tipo === "todo"} onSelect={() => onChange({ ...filtros, tipo: "todo" })} icon={<Layers />} label="Todo" count={counts.todo} />
                      <Option selected={filtros.tipo === "ordenes"} onSelect={() => onChange({ ...filtros, tipo: "ordenes" })} icon={<ClipboardList className={TIPO_TONE.orden.icon} />} label="Órdenes de trabajo" count={counts.ordenes} />
                      <Option selected={filtros.tipo === "proyectos"} onSelect={() => onChange({ ...filtros, tipo: "proyectos" })} icon={<FolderKanban className={TIPO_TONE.proyecto.icon} />} label="Proyectos" count={counts.proyectos} />
                    </div>
                  </Section>
                  <Section title="Estado">
                    <div role="radiogroup" aria-label="Estado" className="space-y-0.5">
                      {(["todos", "abiertos"] as EquipoEstadoFiltro[]).map((v) => (
                        <Option key={v} selected={filtros.estado === v} onSelect={() => onChange({ ...filtros, estado: v })} label={v === "todos" ? "Todos (incluye cerrados)" : "Solo abiertos"} />
                      ))}
                    </div>
                  </Section>
                  <Section title="Técnicos">
                    <label className="flex h-10 cursor-pointer select-none items-center justify-between gap-3 rounded-[10px] px-2.5 text-[13px] font-medium text-[#3F3F46] hover:bg-[#F4F4F5] dark:text-[#D6DEEA] dark:hover:bg-white/[0.05]">
                      Ocultar técnicos sin trabajo
                      <input type="checkbox" className="peer sr-only" checked={ocultarSinTrabajo} onChange={(e) => onOcultarSinTrabajo(e.target.checked)} />
                      <span
                        className="relative inline-flex h-5 w-9 shrink-0 rounded-full bg-[#D4D4D8] transition-colors duration-150 peer-checked:bg-[#1B5CFF] peer-focus-visible:ring-4 peer-focus-visible:ring-[rgba(27,92,255,0.25)] dark:bg-[#3A4661] dark:peer-checked:bg-[#4B7CFF] after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-150 peer-checked:after:translate-x-4"
                        aria-hidden
                      />
                    </label>
                  </Section>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-[#F0F0F2] bg-[#FAFAFB] px-4 py-2.5 dark:border-[#1F2A3C] dark:bg-[#0F172A]">
                  <button
                    type="button"
                    onClick={restablecer}
                    disabled={activos === 0}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-[9px] px-2 text-[12.5px] font-semibold text-[#52525B] hover:bg-[#F4F4F5] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent dark:text-[#B7C1D1] dark:hover:bg-white/[0.05] ${focusRing}`}
                  >
                    <RotateCcw className="size-3.5" aria-hidden />
                    Restablecer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      btnRef.current?.focus();
                    }}
                    className={`cot-press inline-flex h-8 items-center rounded-[9px] bg-[#17235B] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#1F2D73] dark:bg-[#2A3D8F] ${focusRing}`}
                  >
                    Listo
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {reporte}

          <button type="button" onClick={onOpenHistorial} aria-haspopup="dialog" aria-label={historialHoy > 0 ? `Historial, ${historialHoy} movimientos hoy` : "Historial"} className={`${toolbarBtn(false)} min-w-0 flex-1 sm:flex-none`}>
            <History data-eq-icon="historial" aria-hidden />
            <span className="hidden sm:inline">Historial</span>
            {historialHoy > 0 ? (
              <span key={historialHoy} className={toolbarBadge.muted} title={`${historialHoy} movimientos hoy`} aria-hidden>
                {historialHoy}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {/* Filtros activos: segunda línea dentro de la barra (cada chip se quita con un clic). */}
      {hayChips ? (
        <div className="cot-fade mt-1.5 flex flex-wrap items-center gap-1.5 border-t border-[#F0F0F2] px-1.5 pb-0.5 pt-2 dark:border-[#1F2A3C]">
          <span className="mr-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8A8A93] dark:text-[#64748B]">Filtros</span>
          {filtros.tipo !== defaults.tipo ? (
            <Chip label={TIPO_LABEL[filtros.tipo]} onRemove={() => onChange({ ...filtros, tipo: defaults.tipo })}>
              {TIPO_LABEL[filtros.tipo]}
            </Chip>
          ) : null}
          {filtros.estado !== defaults.estado ? (
            <Chip label="Solo abiertos" onRemove={() => onChange({ ...filtros, estado: defaults.estado })}>
              {filtros.estado === "abiertos" ? "Solo abiertos" : "Todos"}
            </Chip>
          ) : null}
          {ocultarSinTrabajo ? (
            <Chip label="Sin trabajo ocultos" onRemove={() => onOcultarSinTrabajo(false)}>
              Sin trabajo ocultos
            </Chip>
          ) : null}
          <button
            type="button"
            onClick={restablecer}
            className={`ml-auto inline-flex h-7 items-center gap-1 rounded-[8px] px-2 text-[12px] font-semibold text-[#71717A] transition-colors duration-150 hover:bg-[#F4F4F5] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:bg-white/[0.06] dark:hover:text-white ${focusRing}`}
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Limpiar
          </button>
        </div>
      ) : null}
    </div>
  );
}
