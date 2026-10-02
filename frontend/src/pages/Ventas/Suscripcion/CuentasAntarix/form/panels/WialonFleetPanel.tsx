/**
 * Pestaña «Flota» del modal de cuenta: lista maestra de unidades (búsqueda + filtros)
 * y detalle a la derecha.
 *
 * Rendimiento: solo se animan `transform` y `opacity` (ver motion.css), las filas usan
 * `content-visibility: auto` para no pintar las que están fuera de vista y la entrada
 * escalonada se limita a las primeras filas.
 */
import { memo, useMemo, useState, type ReactNode } from "react";
import { Radio, Search, Share2, Truck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { erpSearchInputClass } from "../../shared/cuentasAntarixStyles";
import type { WialonUnitRow } from "../../shared/wialonTypes";
import {
  WialonErrorAlert,
  WialonLoadingState,
  wialonUiCaption,
} from "../chrome/WialonModalChrome";

type FleetFilter = "todas" | "activas" | "inactivas" | "en_linea" | "compartidas";

const FILTERS: { key: FleetFilter; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "activas", label: "Activas" },
  { key: "inactivas", label: "Inactivas" },
  { key: "en_linea", label: "En línea" },
  { key: "compartidas", label: "Compartidas" },
];

const isInactive = (u: WialonUnitRow) => u.is_active === false || u.status === "Inactivo";

const FILTER_FN: Record<FleetFilter, (u: WialonUnitRow) => boolean> = {
  todas: () => true,
  activas: (u) => !isInactive(u),
  inactivas: isInactive,
  en_linea: (u) => u.is_online === true,
  compartidas: (u) => u.is_shared,
};

/** Cuántas filas entran con animación escalonada; el resto aparece sin retraso. */
const STAGGER_LIMIT = 8;

type RowProps = {
  unit: WialonUnitRow;
  index: number;
  selected: boolean;
  onSelect: (id: number) => void;
};

const FleetRow = memo(function FleetRow({ unit, index, selected, onSelect }: RowProps) {
  const inactive = isInactive(unit);
  const online = unit.is_online === true;
  const dot = inactive ? "bg-rose-400" : online ? "bg-emerald-500" : "bg-[#A1A1AA]";
  const stateLabel = inactive ? "Inactiva" : online ? "En línea" : "Sin conexión";

  return (
    <li
      className="cot-rise [contain-intrinsic-size:auto_72px] [content-visibility:auto]"
      style={{ ["--cot-i" as string]: Math.min(index, STAGGER_LIMIT) * 0.5 }}
    >
      <button
        type="button"
        role="option"
        aria-selected={selected}
        onClick={() => onSelect(unit.wialon_id)}
        className={cn(
          "group relative flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-[background-color,border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 motion-reduce:transition-none",
          selected
            ? "border-[#1B5CFF]/40 bg-white shadow-[0_1px_3px_rgba(27,92,255,0.12)] dark:border-[#4B7CFF]/45 dark:bg-[#111827]"
            : "border-transparent hover:border-[#E4E4E7] hover:bg-white/80 dark:hover:border-[#273244] dark:hover:bg-[#111827]/60",
        )}
      >
        {/* Indicador lateral: se escala (transform), no cambia de tamaño en layout. */}
        <span
          aria-hidden
          className={cn(
            "absolute bottom-2.5 left-0 top-2.5 w-[3px] origin-center rounded-full bg-[#1B5CFF] transition-transform duration-200 motion-reduce:transition-none dark:bg-[#4B7CFF]",
            selected ? "scale-y-100" : "scale-y-0",
          )}
        />

        <span
          aria-hidden
          className={cn(
            "relative inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold transition-colors duration-150",
            selected
              ? "bg-[#1B5CFF] text-white dark:bg-[#4B7CFF]"
              : inactive
                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                : "bg-[#EEF3FF] text-[#1244D1] dark:bg-[#1B2A63] dark:text-[#9BB6FF]",
          )}
        >
          {(unit.name || "?").slice(0, 1).toUpperCase()}
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-[#FAFAFA] dark:ring-[#0F172A]",
              dot,
            )}
          />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                "truncate text-[13.5px] leading-tight",
                selected
                  ? "font-semibold text-[#09090B] dark:text-[#F8FAFC]"
                  : "font-medium text-[#27272A] dark:text-[#E5E7EB]",
              )}
            >
              {unit.name || "Sin nombre"}
            </span>
            {unit.is_shared ? (
              <Share2
                className="size-3 shrink-0 text-[#1B5CFF] dark:text-[#7FA2FF]"
                aria-label="Compartida"
              />
            ) : null}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] leading-tight">
            <span className="truncate font-mono text-[#71717A] dark:text-[#8EA0B8]">
              {unit.uid && unit.uid !== "—" ? unit.uid : "Sin UID"}
            </span>
            <span aria-hidden className="text-[#D4D4D8] dark:text-[#3A4661]">
              ·
            </span>
            <span className="shrink-0 text-[#71717A] dark:text-[#8EA0B8]">{stateLabel}</span>
          </span>
        </span>
      </button>
    </li>
  );
});

type Props = {
  units: WialonUnitRow[];
  loading: boolean;
  error: string;
  search: string;
  onSearchChange: (value: string) => void;
  selectedUnitId: number | null;
  onSelect: (id: number) => void;
  /** Detalle de la unidad elegida (formulario). */
  children: ReactNode;
};

export default function WialonFleetPanel({
  units,
  loading,
  error,
  search,
  onSearchChange,
  selectedUnitId,
  onSelect,
  children,
}: Props) {
  const [filter, setFilter] = useState<FleetFilter>("todas");

  const counts = useMemo(() => {
    const c = {} as Record<FleetFilter, number>;
    for (const f of FILTERS) c[f.key] = units.filter(FILTER_FN[f.key]).length;
    return c;
  }, [units]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byFilter = FILTER_FN[filter];
    return units.filter((u) => {
      if (!byFilter(u)) return false;
      if (!q) return true;
      return [u.name, u.device_type, u.uid, u.phone, u.custom_fields, u.status, u.shared_with]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [units, filter, search]);

  const hasSelection = selectedUnitId != null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden xl:flex-row">
      {/* ------------------------------ Lista maestra ------------------------------ */}
      <section
        aria-label="Unidades de la flota"
        className={cn(
          "min-h-0 flex-col border-[#F0F0F2] bg-[#FAFAFA] dark:border-[#1F2A3C] dark:bg-[#0B1220]",
          "xl:flex xl:w-[21rem] xl:shrink-0 xl:border-r",
          hasSelection ? "hidden" : "flex flex-1",
        )}
      >
        <div className="shrink-0 space-y-3 px-3 pb-2 pt-3 sm:px-4 sm:pt-4">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-[13px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
              Unidades
            </h4>
            <span className={cn(wialonUiCaption, "tabular-nums")} aria-live="polite">
              {visible.length === units.length
                ? `${units.length} en total`
                : `${visible.length} de ${units.length}`}
            </span>
          </div>

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8EA0B8]"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Nombre, UID, teléfono…"
              aria-label="Buscar unidad en la flota"
              className={cn(erpSearchInputClass, "w-full pr-10")}
            />
            {search ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="Limpiar búsqueda"
                className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex min-w-9 items-center justify-center rounded-md text-[#8EA0B8] transition-colors hover:bg-[#F4F4F5] hover:text-[#52525B] dark:hover:bg-white/6"
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>

          {/* Filtros: scroll horizontal sin barra, objetivos táctiles ≥ 36px. */}
          <div
            role="group"
            aria-label="Filtrar unidades"
            className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {FILTERS.map(({ key, label }) => {
              const active = filter === key;
              const n = counts[key];
              if (key !== "todas" && n === 0 && !active) return null;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(key)}
                  className={cn(
                    "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 motion-reduce:transition-none",
                    active
                      ? "border-[#1B5CFF] bg-[#1B5CFF] text-white dark:border-[#4B7CFF] dark:bg-[#4B7CFF]"
                      : "border-[#E4E4E7] bg-white text-[#52525B] hover:border-[#D4D4D8] hover:text-[#09090B] dark:border-[#273244] dark:bg-[#111827] dark:text-[#B7C1D1] dark:hover:text-[#F8FAFC]",
                  )}
                >
                  {label}
                  <span
                    className={cn(
                      "tabular-nums text-[11px]",
                      active ? "text-white/80" : "text-[#8EA0B8]",
                    )}
                  >
                    {n}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <ul
          role="listbox"
          aria-label="Unidades de la flota"
          className="custom-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 pb-3 sm:px-3"
        >
          {loading && units.length === 0 ? (
            <li>
              <WialonLoadingState label="Cargando unidades…" compact />
            </li>
          ) : error && units.length === 0 ? (
            <li>
              <WialonErrorAlert message={error} />
            </li>
          ) : visible.length === 0 ? (
            <li className="cot-fade flex flex-col items-center gap-2 px-4 py-12 text-center">
              <span
                className="inline-flex size-10 items-center justify-center rounded-xl bg-white text-[#A1A1AA] ring-1 ring-[#E4E4E7] dark:bg-[#111827] dark:text-[#64748B] dark:ring-[#273244]"
                aria-hidden
              >
                <Truck className="size-5" />
              </span>
              <p className="text-[13.5px] font-medium text-[#27272A] dark:text-[#E5E7EB]">
                {units.length === 0 ? "Sin unidades asignadas" : "Sin coincidencias"}
              </p>
              {units.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange("");
                    setFilter("todas");
                  }}
                  className="rounded-md px-2 py-1 text-[12.5px] font-medium text-[#1B5CFF] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:text-[#7FA2FF]"
                >
                  Quitar búsqueda y filtros
                </button>
              ) : null}
            </li>
          ) : (
            visible.map((unit, i) => (
              <FleetRow
                key={unit.wialon_id}
                unit={unit}
                index={i}
                selected={selectedUnitId === unit.wialon_id}
                onSelect={onSelect}
              />
            ))
          )}
        </ul>
      </section>

      {/* -------------------------------- Detalle -------------------------------- */}
      <div
        className={cn(
          "erp-modal-form-scroll custom-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-[#F7F7F8] dark:bg-[#0F172A]/60",
          hasSelection ? "block" : "hidden xl:block",
        )}
      >
        {hasSelection ? (
          <div
            key={selectedUnitId}
            className="cot-fade mx-auto w-full max-w-3xl px-4 py-5 sm:px-8 sm:py-7"
          >
            {children}
          </div>
        ) : (
          <div className="cot-fade flex h-full min-h-[18rem] flex-col items-center justify-center gap-3 px-6 text-center">
            <span
              className="inline-flex size-14 items-center justify-center rounded-2xl bg-white text-[#1B5CFF] ring-1 ring-[#E4E4E7] dark:bg-[#111827] dark:text-[#7FA2FF] dark:ring-[#273244]"
              aria-hidden
            >
              <Radio className="size-6" strokeWidth={1.7} />
            </span>
            <div>
              <p className="text-[16px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">
                Selecciona una unidad
              </p>
              <p className="mx-auto mt-1 max-w-xs text-[13px] leading-relaxed text-[#71717A] dark:text-[#8EA0B8]">
                Elige una unidad de la lista para editar su ficha, la SIM, los campos y quién tiene acceso.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
