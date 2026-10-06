/**
 * Filtros del listado de Mantenimiento:
 * - Segmentado «Todo · Pólizas · Reportes» con conteos (radio con flechas).
 * - Popover «Filtros»: estado (pólizas), evidencia y técnico (reportes). Un
 *   filtro de un tipo deja fuera al otro tipo. Esc o clic afuera cierran.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import "@/components/ui/modal-kit/motion.css";
import { focusRing } from "../../Proyectos/shared/proyectoTokens";
import {
  filtrosSecundariosActivos,
  type EstadoPolizaFiltro,
  type EvidenciaFiltro,
  type MantenimientoFiltros,
  type MantenimientoTipoFiltro,
} from "../shared/mantenimientoItems";

const TIPOS: { id: MantenimientoTipoFiltro; label: string }[] = [
  { id: "todo", label: "Todo" },
  { id: "poliza", label: "Pólizas" },
  { id: "reporte", label: "Reportes" },
];

/** Segmentado de tipo. */
export function TipoSegment({
  value,
  onChange,
  counts,
}: {
  value: MantenimientoTipoFiltro;
  onChange: (v: MantenimientoTipoFiltro) => void;
  counts: Record<MantenimientoTipoFiltro, number>;
}) {
  return (
    <div role="radiogroup" aria-label="Tipo" className="inline-flex max-w-full rounded-[11px] bg-[#F4F4F5] p-1 dark:bg-white/5">
      {TIPOS.map((t) => {
        const active = value === t.id;
        return (
          <label key={t.id} className="relative">
            <input type="radio" name="mant-tipo" className="peer sr-only" checked={active} onChange={() => onChange(t.id)} />
            <span
              className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-semibold transition-colors duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-[#1B5CFF]/40 ${
                active
                  ? "bg-white text-[#09090B] shadow-[0_1px_2px_rgba(9,9,11,0.08)] dark:bg-[#1B2539] dark:text-[#F8FAFC]"
                  : "text-[#6E6E77] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:text-[#F8FAFC]"
              }`}
            >
              {t.label}
              <span className="text-[12px] font-medium tabular-nums text-[#A1A1AA] dark:text-[#64748B]">{counts[t.id]}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

function Opcion({ selected, onSelect, children }: { selected: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`cot-press flex h-9 w-full items-center gap-2 rounded-[9px] px-2.5 text-left text-[13px] font-medium ${
        selected
          ? "bg-[#EEF3FF] text-[#1244D1] dark:bg-[#1B2A63]/60 dark:text-[#C9D7FF]"
          : "text-[#3F3F46] hover:bg-[#F4F4F5] dark:text-[#D6DEEA] dark:hover:bg-white/[0.05]"
      } ${focusRing}`}
    >
      <span className="flex-1 truncate">{children}</span>
      <Check className={`size-4 ${selected ? "opacity-100" : "opacity-0"}`} aria-hidden />
    </button>
  );
}

function Seccion({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <div role="radiogroup" aria-labelledby={id} className="px-3 py-3">
      <p id={id} className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6E6E77] dark:text-[#8EA0B8]">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

const ESTADOS: { id: EstadoPolizaFiltro; label: string }[] = [
  { id: "", label: "Todos" },
  { id: "proxima_visita", label: "Próxima visita" },
  { id: "vencida", label: "Vencidas" },
  { id: "vigente", label: "Vigentes" },
];
const EVIDENCIAS: { id: EvidenciaFiltro; label: string }[] = [
  { id: "", label: "Todas" },
  { id: "con", label: "Con evidencia" },
  { id: "sin", label: "Sin evidencia" },
];

export function MantenimientoFiltrosPopover({
  filtros,
  onChange,
  tecnicos,
  mostrarPolizas,
  mostrarReportes,
}: {
  filtros: MantenimientoFiltros;
  onChange: (f: MantenimientoFiltros) => void;
  tecnicos: { nombre: string; total: number }[];
  mostrarPolizas: boolean;
  mostrarReportes: boolean;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();
  const activos = filtrosSecundariosActivos(filtros);

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

  // Elegir un filtro de un tipo limpia los del otro (no se pueden combinar).
  const setPoliza = (estadoPoliza: EstadoPolizaFiltro) => onChange({ ...filtros, estadoPoliza, ...(estadoPoliza ? { evidencia: "", tecnico: "" } : {}) });
  const setEvidencia = (evidencia: EvidenciaFiltro) => onChange({ ...filtros, evidencia, ...(evidencia ? { estadoPoliza: "" } : {}) });
  const setTecnico = (tecnico: string) => onChange({ ...filtros, tecnico, ...(tecnico ? { estadoPoliza: "" } : {}) });
  const limpiar = () => onChange({ ...filtros, estadoPoliza: "", evidencia: "", tecnico: "" });

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        aria-label={activos > 0 ? `Filtros, ${activos} activos` : "Filtros"}
        className={`cot-press inline-flex h-10 items-center gap-2 rounded-[10px] border px-3.5 text-[13px] font-semibold transition-colors duration-150 ${
          open || activos > 0
            ? "border-[#BFD3FF] bg-[#F3F6FF] text-[#1244D1] dark:border-[#2C3F7A] dark:bg-[#1B2A63]/50 dark:text-[#C9D7FF]"
            : "border-[#E4E4E7] bg-white text-[#3F3F46] hover:border-[#D3D3D8] dark:border-[#273244] dark:bg-[#111827] dark:text-[#D6DEEA]"
        } ${focusRing}`}
      >
        <SlidersHorizontal className="size-4" aria-hidden />
        Filtros
        {activos > 0 ? (
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#1B5CFF] text-[11px] font-bold text-white dark:bg-[#4B7CFF]" aria-hidden>
            {activos}
          </span>
        ) : null}
        <ChevronDown className={`size-3.5 opacity-60 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Filtros"
          className="cot-pop absolute right-0 top-[calc(100%+8px)] z-40 w-[min(19rem,calc(100vw-2rem))] origin-top-right overflow-hidden rounded-[16px] border border-[#E4E4E7] bg-white shadow-[0_24px_48px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:bg-[#111827]"
        >
          <div className="max-h-[min(28rem,70vh)] divide-y divide-[#F0F0F2] overflow-y-auto overscroll-contain dark:divide-[#1F2A3C]">
            {mostrarPolizas ? (
              <Seccion title="Estado de la póliza">
                {ESTADOS.map((e) => (
                  <Opcion key={e.id || "todos"} selected={filtros.estadoPoliza === e.id} onSelect={() => setPoliza(e.id)}>
                    {e.label}
                  </Opcion>
                ))}
              </Seccion>
            ) : null}
            {mostrarReportes ? (
              <Seccion title="Evidencia del reporte">
                {EVIDENCIAS.map((e) => (
                  <Opcion key={e.id || "todas"} selected={filtros.evidencia === e.id} onSelect={() => setEvidencia(e.id)}>
                    {e.label}
                  </Opcion>
                ))}
              </Seccion>
            ) : null}
            {mostrarReportes && tecnicos.length > 0 ? (
              <Seccion title="Técnico del reporte">
                <Opcion selected={filtros.tecnico === ""} onSelect={() => setTecnico("")}>
                  Todos
                </Opcion>
                {tecnicos.map((t) => (
                  <Opcion key={t.nombre} selected={filtros.tecnico === t.nombre} onSelect={() => setTecnico(t.nombre)}>
                    {t.nombre} <span className="text-[12px] font-normal tabular-nums text-[#A1A1AA]">· {t.total}</span>
                  </Opcion>
                ))}
              </Seccion>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-[#F0F0F2] bg-[#FAFAFB] px-3 py-2.5 dark:border-[#1F2A3C] dark:bg-[#0F172A]">
            <button
              type="button"
              onClick={limpiar}
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
  );
}
