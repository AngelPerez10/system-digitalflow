/**
 * Botón «Filtrado» + panel desplegable (mismo lugar que antes: cabecera de Resultados).
 *
 * Secciones: Fuente · Disponibilidad · Precio · Ordenar · Categoría · Marca.
 * Los cambios se aplican al momento; «Listo» solo cierra. Se cierra con Escape
 * o al hacer clic fuera. Entrada con `cot-pop` (transform/opacity).
 */
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Check, ListFilter, PackageCheck } from "lucide-react";
import { btn, fieldLabel, input, select } from "./productosStyles";

export type OpcionFuente<T extends string> = { value: T; label: string };

type Props<F extends string, O extends string> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activos: number;

  fuente: F;
  fuentes: OpcionFuente<F>[];
  onFuente: (v: F) => void;

  soloExistencia: boolean;
  onSoloExistencia: (v: boolean) => void;

  precioMin: string;
  precioMax: string;
  onPrecioMin: (v: string) => void;
  onPrecioMax: (v: string) => void;

  orden: O;
  ordenes: { value: O; label: string }[];
  onOrden: (v: O) => void;

  categoriaId: string;
  categorias: { id: string; nombre: string }[];
  onCategoria: (v: string) => void;

  marcaId: string;
  marcas: { id: string; nombre: string }[];
  onMarca: (v: string) => void;

  cargandoCatalogos: boolean;
  onLimpiar: () => void;
};

function Seccion({ titulo, children, extra }: { titulo: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]">{titulo}</p>
        {extra}
      </div>
      {children}
    </div>
  );
}

export default function ProductosFiltroPanel<F extends string, O extends string>(props: Props<F, O>) {
  const { open, onOpenChange, activos } = props;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelId = useId();
  const baseId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  const fuenteIdx = Math.max(0, props.fuentes.findIndex((f) => f.value === props.fuente));

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className={`${btn.secondary} h-10 px-4 text-[14px] ${open ? "border-[#1B5CFF]/50 bg-[#F7F9FF] dark:bg-[#1B2A63]/40" : ""}`}
      >
        <ListFilter aria-hidden />
        Filtrado
        {activos ? (
          <span key={activos} className="cot-tick inline-flex size-5 items-center justify-center rounded-full bg-[#1B5CFF] text-[11px] font-semibold tabular-nums text-white dark:bg-[#4B7CFF]">
            {activos}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Filtros de productos"
          className="cot-pop absolute right-0 z-[120] mt-2 flex max-h-[min(78vh,40rem)] w-[min(22rem,calc(100vw-2rem))] origin-top-right flex-col overflow-hidden rounded-[18px] border border-[#E7E7EA] bg-white shadow-[0_18px_44px_-16px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:bg-[#151E32]"
        >
          <div className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
            {/* Fuente */}
            <Seccion titulo="Fuente de datos">
              <div role="radiogroup" aria-label="Fuente de datos" className="relative grid rounded-[11px] border border-[#E7E7EA] bg-[#F4F4F5] p-1 dark:border-[#273244] dark:bg-[#0F172A]" style={{ gridTemplateColumns: `repeat(${props.fuentes.length}, minmax(0,1fr))` }}>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-1 left-1 rounded-[8px] bg-white shadow-[0_1px_3px_rgba(9,9,11,0.12)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none dark:bg-[#1B2539]"
                  style={{ width: `calc((100% - 0.5rem) / ${props.fuentes.length})`, transform: `translateX(${fuenteIdx * 100}%)` }}
                />
                {props.fuentes.map((f) => {
                  const on = f.value === props.fuente;
                  return (
                    <button
                      key={f.label}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => props.onFuente(f.value)}
                      className={`relative z-[1] h-9 rounded-[8px] text-[12.5px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 ${
                        on ? "text-[#1B5CFF] dark:text-[#7EA0FF]" : "text-[#6E6E77] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:text-[#F8FAFC]"
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </Seccion>

            {/* Disponibilidad */}
            <Seccion titulo="Disponibilidad">
              <button
                type="button"
                role="switch"
                aria-checked={props.soloExistencia}
                onClick={() => props.onSoloExistencia(!props.soloExistencia)}
                className={`flex w-full items-center gap-3 rounded-[12px] border px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 ${
                  props.soloExistencia
                    ? "border-[rgba(4,114,77,0.35)] bg-[rgba(4,114,77,0.06)] dark:border-[#1E5A42] dark:bg-[#0F2A1C]"
                    : "border-[#E7E7EA] hover:bg-[#FAFAFA] dark:border-[#273244] dark:hover:bg-[#1B2539]"
                }`}
              >
                <span className={`inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] ${props.soloExistencia ? "bg-[#04724D] text-white dark:bg-[#22A06B]" : "bg-[#F4F4F5] text-[#6E6E77] dark:bg-[#0F172A] dark:text-[#8EA0B8]"}`}>
                  <PackageCheck className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-medium text-[#09090B] dark:text-[#F8FAFC]">Solo con existencia</span>
                  <span className="block text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">Oculta los productos sin stock</span>
                </span>
                <span
                  className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ${props.soloExistencia ? "bg-[#04724D] dark:bg-[#22A06B]" : "bg-[#D4D4D8] dark:bg-[#3A4661]"}`}
                  aria-hidden
                >
                  <span className={`size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${props.soloExistencia ? "translate-x-4" : "translate-x-0"}`} />
                </span>
              </button>
            </Seccion>

            {/* Precio */}
            <Seccion
              titulo="Precio con IVA (MXN)"
              extra={
                props.precioMin || props.precioMax ? (
                  <button type="button" onClick={() => { props.onPrecioMin(""); props.onPrecioMax(""); }} className="text-[12px] font-medium text-[#1B5CFF] hover:underline dark:text-[#7EA0FF]">
                    Quitar
                  </button>
                ) : null
              }
            >
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["min", "Mínimo", props.precioMin, props.onPrecioMin],
                  ["max", "Máximo", props.precioMax, props.onPrecioMax],
                ] as const).map(([k, label, value, onChange]) => (
                  <label key={k} className="relative block">
                    <span className="sr-only">Precio {label.toLowerCase()}</span>
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[#A1A1AA]">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="1"
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      placeholder={label}
                      className={`${input} h-10 pl-6 text-[14px] tabular-nums`}
                    />
                  </label>
                ))}
              </div>
            </Seccion>

            {/* Orden */}
            <Seccion titulo="Ordenar por">
              <label htmlFor={`${baseId}-orden`} className="sr-only">Ordenar por</label>
              <select id={`${baseId}-orden`} value={props.orden} onChange={(e) => props.onOrden(e.target.value as O)} className={`${select} h-10 text-[14px]`}>
                {props.ordenes.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Seccion>

            {/* Categoría y marca */}
            <div className="grid gap-4">
              <div>
                <label htmlFor={`${baseId}-cat`} className={fieldLabel}>Categoría</label>
                <select id={`${baseId}-cat`} value={props.categoriaId} onChange={(e) => props.onCategoria(e.target.value)} className={`${select} h-10 text-[14px]`}>
                  <option value="">Todas las categorías</option>
                  {props.categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                  {props.cargandoCatalogos && !props.categorias.length ? <option disabled>Cargando categorías…</option> : null}
                </select>
              </div>
              <div>
                <label htmlFor={`${baseId}-marca`} className={fieldLabel}>Marca</label>
                <select id={`${baseId}-marca`} value={props.marcaId} onChange={(e) => props.onMarca(e.target.value)} className={`${select} h-10 text-[14px]`}>
                  <option value="">Todas las marcas</option>
                  {props.marcas.map((m) => (
                    <option key={m.id} value={m.id}>{m.nombre}</option>
                  ))}
                  {props.cargandoCatalogos && !props.marcas.length ? <option disabled>Cargando marcas…</option> : null}
                </select>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 gap-2 border-t border-[#E7E7EA] bg-[#FAFAFA] p-3 dark:border-[#273244] dark:bg-[#0F172A]/60">
            <button type="button" onClick={props.onLimpiar} disabled={!activos} className={`${btn.secondary} h-10 flex-1 px-3 text-[13px]`}>
              Limpiar filtros
            </button>
            <button type="button" onClick={() => onOpenChange(false)} className={`${btn.primary} h-10 flex-1 px-3 text-[13px]`}>
              <Check aria-hidden />
              Listo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
