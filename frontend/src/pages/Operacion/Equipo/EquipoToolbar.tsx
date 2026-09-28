/**
 * Buscador + menú «Filtros» del listado Equipo.
 *
 * - Buscador con atajo «/» (Esc limpia).
 * - Botón «Filtros» con contador de filtros activos; abre un menú con todas
 *   las opciones (tipo, estado, orden y técnicos sin carga). El menú va en un
 *   portal con posición fija (el panel recorta con `overflow-hidden`) y por
 *   encima del header de la app. Esc o clic afuera lo cierran y el foco
 *   vuelve al botón.
 * - Debajo, chips con lo que difiere de lo predeterminado (cada uno se quita
 *   con un clic).
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, ClipboardList, FolderKanban, Layers, Search, SlidersHorizontal, X } from "lucide-react";
import { focusRing } from "../Proyectos/shared/proyectoTokens";
import {
  EQUIPO_FILTROS_DEFAULT,
  type EquipoEstadoFiltro,
  type EquipoFiltros,
  type EquipoOrden,
  type EquipoTipoFiltro,
} from "./equipoFiltros";

type Counts = { ordenes: number; proyectos: number; abiertos: number; todos: number };

const MENU_W = 340;

/* --------------------------------------------------------------------------
   Piezas del menú
   -------------------------------------------------------------------------- */

function MenuSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="px-4 py-3.5">
      <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#71717A] dark:text-[#8EA0B8]">{title}</legend>
      {children}
    </fieldset>
  );
}

/** Opción tipo tarjeta (radio): ícono + texto + conteo, palomita al elegirla. */
function OptionCard({
  selected,
  onSelect,
  icon,
  label,
  count,
  name,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  label: string;
  count?: number;
  name: string;
}) {
  return (
    <label
      className={`cot-press relative flex cursor-pointer flex-col items-start gap-1.5 rounded-[12px] border px-3 py-2.5 transition-[border-color,background-color] duration-150 has-focus-visible:ring-4 has-focus-visible:ring-[rgba(27,92,255,0.18)] ${
        selected
          ? "border-[#1B5CFF] bg-[#F5F8FF] dark:border-[#4B7CFF] dark:bg-[#1B2A63]/40"
          : "border-[#E4E4E7] hover:border-[#D3D3D8] hover:bg-[#FAFAFA] dark:border-[#273244] dark:hover:border-[#3A4661] dark:hover:bg-white/[0.03]"
      }`}
    >
      <input type="radio" name={name} checked={selected} onChange={onSelect} className="sr-only" />
      <span className={`[&_svg]:size-4 ${selected ? "text-[#1B5CFF] dark:text-[#9BB6FF]" : "text-[#71717A] dark:text-[#8EA0B8]"}`} aria-hidden>
        {icon}
      </span>
      <span className={`text-[13px] font-semibold ${selected ? "text-[#1244D1] dark:text-[#C9D7FF]" : "text-[#3F3F46] dark:text-[#D6DEEA]"}`}>{label}</span>
      {count != null ? <span className="text-[11.5px] tabular-nums text-[#71717A] dark:text-[#8EA0B8]">{count}</span> : null}
      {selected ? (
        <span className="cot-pop absolute right-2 top-2 inline-flex size-4 items-center justify-center rounded-full bg-[#1B5CFF] text-white dark:bg-[#4B7CFF]" aria-hidden>
          <Check className="size-3" strokeWidth={3} />
        </span>
      ) : null}
    </label>
  );
}

/** Opción de lista (radio) con palomita. */
function OptionRow({ selected, onSelect, label, hint, name }: { selected: boolean; onSelect: () => void; label: string; hint: string; name: string }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-[10px] px-2.5 py-2 transition-colors duration-150 has-focus-visible:ring-4 has-focus-visible:ring-[rgba(27,92,255,0.18)] ${
        selected ? "bg-[#F5F8FF] dark:bg-[#1B2A63]/40" : "hover:bg-[#FAFAFA] dark:hover:bg-white/[0.03]"
      }`}
    >
      <input type="radio" name={name} checked={selected} onChange={onSelect} className="sr-only" />
      <span
        className={`inline-flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
          selected ? "border-[#1B5CFF] bg-[#1B5CFF] dark:border-[#4B7CFF] dark:bg-[#4B7CFF]" : "border-[#D4D4D8] dark:border-[#3A4661]"
        }`}
        aria-hidden
      >
        {selected ? <span className="size-1.5 rounded-full bg-white" /> : null}
      </span>
      <span className="min-w-0">
        <span className={`block text-[13px] font-semibold ${selected ? "text-[#1244D1] dark:text-[#C9D7FF]" : "text-[#3F3F46] dark:text-[#D6DEEA]"}`}>{label}</span>
        <span className="block text-[11.5px] text-[#71717A] dark:text-[#8EA0B8]">{hint}</span>
      </span>
    </label>
  );
}

function SwitchRow({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[10px] px-2.5 py-2 hover:bg-[#FAFAFA] has-focus-visible:ring-4 has-focus-visible:ring-[rgba(27,92,255,0.18)] dark:hover:bg-white/[0.03]">
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-[#3F3F46] dark:text-[#D6DEEA]">{label}</span>
        <span className="block text-[11.5px] text-[#71717A] dark:text-[#8EA0B8]">{hint}</span>
      </span>
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-[#D4D4D8] transition-colors duration-200 peer-checked:bg-[#1B5CFF] dark:bg-[#3A4661] dark:peer-checked:bg-[#4B7CFF] peer-checked:[&>span]:translate-x-4"
        aria-hidden
      >
        <span className="ml-0.5 inline-block size-4 rounded-full bg-white shadow-[0_1px_3px_rgba(9,9,11,0.25)] transition-transform duration-200 motion-reduce:transition-none" />
      </span>
    </label>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="cot-pop inline-flex h-7 items-center gap-1 rounded-full border border-[#D7E3FF] bg-[#F5F8FF] pl-2.5 pr-1 text-[12px] font-medium text-[#1244D1] dark:border-[#2C3F7A] dark:bg-[#1B2A63]/50 dark:text-[#C9D7FF]">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar filtro: ${label}`}
        className={`inline-flex size-5 items-center justify-center rounded-full hover:bg-[#1B5CFF]/10 ${focusRing}`}
      >
        <X className="size-3" aria-hidden />
      </button>
    </span>
  );
}

/* --------------------------------------------------------------------------
   Toolbar
   -------------------------------------------------------------------------- */

export function EquipoToolbar({
  filtros,
  onChange,
  counts,
  ocultarSinCarga,
  onOcultarSinCarga,
}: {
  filtros: EquipoFiltros;
  onChange: (next: EquipoFiltros) => void;
  counts: Counts;
  ocultarSinCarga: boolean;
  onOcultarSinCarga: (v: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const radioName = useId();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const set = <K extends keyof EquipoFiltros>(k: K, v: EquipoFiltros[K]) => onChange({ ...filtros, [k]: v });

  // «/» enfoca el buscador (salvo que ya se esté escribiendo en otro campo).
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

  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(MENU_W, window.innerWidth - 24);
    const left = Math.min(Math.max(12, r.right - width), window.innerWidth - width - 12);
    setPos({ top: r.bottom + 8, left });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>("input")?.focus());
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  if (filtros.tipo !== "todo")
    chips.push({ key: "tipo", label: filtros.tipo === "ordenes" ? "Solo órdenes" : "Solo proyectos", onRemove: () => set("tipo", "todo") });
  if (filtros.estado !== EQUIPO_FILTROS_DEFAULT.estado)
    chips.push({ key: "estado", label: "Incluye cerrados", onRemove: () => set("estado", EQUIPO_FILTROS_DEFAULT.estado) });
  if (filtros.orden !== "recientes") chips.push({ key: "orden", label: "Cliente A–Z", onRemove: () => set("orden", "recientes") });
  if (ocultarSinCarga) chips.push({ key: "sincarga", label: "Sin técnicos vacíos", onRemove: () => onOcultarSinCarga(false) });
  const activos = chips.length;

  const restablecer = () => {
    onChange({ ...EQUIPO_FILTROS_DEFAULT, q: filtros.q });
    onOcultarSinCarga(false);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="group relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-[#A1A1AA] transition-colors group-focus-within:text-[#1B5CFF] dark:group-focus-within:text-[#7EA0FF]"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="search"
            value={filtros.q}
            onChange={(e) => set("q", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && filtros.q) {
                e.preventDefault();
                set("q", "");
              }
            }}
            placeholder="Buscar folio, cliente o técnico…"
            aria-label="Buscar por folio, cliente o técnico"
            aria-keyshortcuts="/"
            className="h-11 w-full rounded-[12px] border border-[#E4E4E7] bg-[#FAFAFA] pl-10 pr-12 text-[14px] text-[#09090B] outline-none transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:bg-white focus:shadow-[0_0_0_4px_rgba(27,92,255,0.14)] dark:border-[#273244] dark:bg-[#0F172A] dark:text-[#F8FAFC] dark:placeholder:text-[#64748B] dark:focus:border-[#4B7CFF] dark:focus:bg-[#111827] [&::-webkit-search-cancel-button]:hidden"
          />
          <div className="absolute inset-y-0 right-2 flex items-center">
            {filtros.q ? (
              <button
                type="button"
                onClick={() => {
                  set("q", "");
                  inputRef.current?.focus();
                }}
                aria-label="Limpiar búsqueda"
                className={`cot-pop inline-flex size-8 items-center justify-center rounded-[9px] text-[#A1A1AA] hover:bg-[#F4F4F5] hover:text-[#52525B] dark:hover:bg-white/6 ${focusRing}`}
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : (
              <kbd className="hidden h-6 items-center rounded-md border border-[#E4E4E7] bg-white px-1.5 font-mono text-[11px] font-medium text-[#71717A] shadow-[0_1px_0_#E4E4E7] dark:border-[#273244] dark:bg-[#111827] dark:text-[#8EA0B8] dark:shadow-none sm:inline-flex">
                /
              </kbd>
            )}
          </div>
        </div>

        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          className={`cot-press inline-flex h-11 shrink-0 items-center gap-2 rounded-[12px] border px-3.5 text-[13.5px] font-semibold transition-colors ${
            open || activos > 0
              ? "border-[#BFD3FF] bg-[#F5F8FF] text-[#1244D1] dark:border-[#2C3F7A] dark:bg-[#1B2A63]/40 dark:text-[#C9D7FF]"
              : "border-[#E4E4E7] bg-white text-[#3F3F46] hover:border-[#D3D3D8] hover:bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#0F172A] dark:text-[#D6DEEA] dark:hover:border-[#3A4661]"
          } ${focusRing}`}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          <span className="hidden sm:inline">Filtros</span>
          {activos > 0 ? (
            <span key={activos} className="cot-pop inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1B5CFF] px-1.5 text-[11px] tabular-nums text-white dark:bg-[#4B7CFF]">
              {activos}
              <span className="sr-only"> filtros activos</span>
            </span>
          ) : null}
          <ChevronDown className={`size-4 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
      </div>

      {activos > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Filtros activos">
          {chips.map((c) => (
            <Chip key={c.key} label={c.label} onRemove={c.onRemove} />
          ))}
          <button
            type="button"
            onClick={restablecer}
            className={`ml-1 rounded-md px-1.5 text-[12px] font-semibold text-[#71717A] underline-offset-2 hover:text-[#09090B] hover:underline dark:text-[#8EA0B8] dark:hover:text-white ${focusRing}`}
          >
            Restablecer
          </button>
        </div>
      ) : null}

      {createPortal(
        <AnimatePresence>
          {open && pos ? (
            <motion.div
              ref={menuRef}
              id={menuId}
              role="dialog"
              aria-label="Filtros del listado"
              className="fixed z-[100000] overflow-hidden rounded-[16px] border border-[#E7E7EA] bg-white shadow-[0_24px_48px_-20px_rgba(9,9,11,0.35),0_2px_8px_rgba(9,9,11,0.06)] dark:border-[#273244] dark:bg-[#111827]"
              style={{ top: pos.top, left: pos.left, width: Math.min(MENU_W, window.innerWidth - 24), transformOrigin: "top right" }}
              initial={{ opacity: 0, scale: 0.96, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.18, ease: [0.2, 0.9, 0.3, 1] } }}
              exit={{ opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.12 } }}
            >
              <div className="flex items-center justify-between border-b border-[#F0F0F2] px-4 py-3 dark:border-[#1F2A3C]">
                <p className="text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">Filtros</p>
                {activos > 0 ? (
                  <button type="button" onClick={restablecer} className={`rounded-md px-1.5 text-[12.5px] font-semibold text-[#1B5CFF] hover:underline dark:text-[#7EA0FF] ${focusRing}`}>
                    Restablecer
                  </button>
                ) : null}
              </div>

              <div className="custom-scrollbar max-h-[min(70vh,34rem)] divide-y divide-[#F0F0F2] overflow-y-auto dark:divide-[#1F2A3C]">
                <MenuSection title="Mostrar">
                  <div className="grid grid-cols-3 gap-2">
                    <OptionCard name={`${radioName}-tipo`} selected={filtros.tipo === "todo"} onSelect={() => set("tipo", "todo" as EquipoTipoFiltro)} icon={<Layers />} label="Todo" count={counts.ordenes + counts.proyectos} />
                    <OptionCard name={`${radioName}-tipo`} selected={filtros.tipo === "ordenes"} onSelect={() => set("tipo", "ordenes")} icon={<ClipboardList />} label="Órdenes" count={counts.ordenes} />
                    <OptionCard name={`${radioName}-tipo`} selected={filtros.tipo === "proyectos"} onSelect={() => set("tipo", "proyectos")} icon={<FolderKanban />} label="Proyectos" count={counts.proyectos} />
                  </div>
                </MenuSection>

                <MenuSection title="Estado">
                  <div className="space-y-0.5">
                    <OptionRow name={`${radioName}-estado`} selected={filtros.estado === "abiertos"} onSelect={() => set("estado", "abiertos" as EquipoEstadoFiltro)} label={`Solo abiertos · ${counts.abiertos}`} hint="Pendientes, pausados, saldo pendiente y en proceso" />
                    <OptionRow name={`${radioName}-estado`} selected={filtros.estado === "todos"} onSelect={() => set("estado", "todos")} label={`Todos · ${counts.todos}`} hint="Incluye resueltos, cerrados y cancelados" />
                  </div>
                </MenuSection>

                <MenuSection title="Ordenar por">
                  <div className="space-y-0.5">
                    <OptionRow name={`${radioName}-orden`} selected={filtros.orden === "recientes"} onSelect={() => set("orden", "recientes" as EquipoOrden)} label="Más recientes" hint="Abiertos primero, luego por fecha" />
                    <OptionRow name={`${radioName}-orden`} selected={filtros.orden === "cliente"} onSelect={() => set("orden", "cliente")} label="Cliente A–Z" hint="Alfabético por cliente" />
                  </div>
                </MenuSection>

                <MenuSection title="Técnicos">
                  <SwitchRow checked={ocultarSinCarga} onChange={onOcultarSinCarga} label="Ocultar técnicos sin carga" hint="Solo en el panel de técnicos; se muestran al arrastrar" />
                </MenuSection>
              </div>

              <div className="flex justify-end border-t border-[#F0F0F2] px-4 py-3 dark:border-[#1F2A3C]">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    btnRef.current?.focus();
                  }}
                  className={`cot-press inline-flex h-9 items-center rounded-[10px] bg-[#1B5CFF] px-4 text-[13px] font-semibold text-white hover:bg-[#1244D1] dark:bg-[#4B7CFF] dark:hover:bg-[#3B6AF0] ${focusRing}`}
                >
                  Listo
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
