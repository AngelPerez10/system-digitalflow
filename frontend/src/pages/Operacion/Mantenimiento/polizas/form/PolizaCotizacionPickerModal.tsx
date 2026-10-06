/**
 * «Vincular cotización» de la póliza: mismo diálogo que el selector de
 * Proyectos (`ProyectoPickerShell`). Lista las cotizaciones DigitalFlow del
 * cliente con búsqueda por folio, fecha o estatus; las que ya respaldan otra
 * póliza aparecen bloqueadas con «En uso en POL-…».
 */
import { useMemo, useState, type CSSProperties } from "react";
import { Check, ChevronRight, FileSearch, Lock, Search } from "lucide-react";
import { ProyectoPickerShell } from "../../../Proyectos/form/fields/ProyectoPickerShell";
import { formatFechaCorta } from "../../../Proyectos/shared/proyectoListUtils";
import { btn, focusRing, input } from "../../../Proyectos/shared/proyectoTokens";
import type { CotizacionOption } from "../list/polizaApi";

type Props = {
  open: boolean;
  onClose: () => void;
  clienteNombre: string;
  cotizaciones: CotizacionOption[];
  loading: boolean;
  /** Cotización ya elegida en esta póliza (se marca con palomita). */
  selectedId: string;
  onSelect: (cotizacion: CotizacionOption) => void;
};

export function PolizaCotizacionPickerModal({ open, onClose, clienteNombre, cotizaciones, loading, selectedId, onSelect }: Props) {
  const [q, setQ] = useState("");
  const visibles = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return cotizaciones;
    return cotizaciones.filter((c) => [c.folio, c.status, c.fecha, formatFechaCorta(c.fecha)].some((v) => v.toLowerCase().includes(term)));
  }, [cotizaciones, q]);
  const libres = cotizaciones.filter((c) => !c.ocupadaPor).length;

  return (
    <ProyectoPickerShell
      open={open}
      onClose={onClose}
      icon={<FileSearch />}
      eyebrow="Póliza · Cotización"
      title="Vincular cotización"
      description={
        <>
          Cotizaciones DigitalFlow de <span className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">{clienteNombre || "este cliente"}</span>. Cada cotización
          respalda una sola póliza: las que ya están en uso aparecen bloqueadas.
        </>
      }
      toolbar={
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#A1A1AA]" aria-hidden />
          <label htmlFor="poliza-cotizacion-buscar" className="sr-only">
            Buscar cotización
          </label>
          <input
            id="poliza-cotizacion-buscar"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Folio, fecha o estatus…"
            className={`${input} pl-10`}
            autoComplete="off"
          />
        </div>
      }
      footer={
        <>
          <p className="mr-auto self-center text-[12.5px] text-[#71717A] dark:text-[#8EA0B8]" aria-live="polite">
            {loading ? "Cargando…" : `${libres} de ${cotizaciones.length} disponibles`}
          </p>
          <button type="button" className={btn.secondary} onClick={onClose}>
            Cancelar
          </button>
        </>
      }
    >
      <ul className="space-y-1" role="listbox" aria-label="Cotizaciones del cliente" aria-busy={loading || undefined}>
        {loading ? (
          Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="flex items-center gap-3 px-3 py-3" aria-hidden style={{ opacity: 1 - i * 0.18 }}>
              <span className="block h-4 w-24 rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
              <span className="block h-4 flex-1 rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
            </li>
          ))
        ) : visibles.length === 0 ? (
          <li className="px-3 py-10 text-center text-[14px] text-[#71717A] dark:text-[#8EA0B8]" role="status">
            {q.trim() ? "Sin resultados para la búsqueda." : "Este cliente no tiene cotizaciones DigitalFlow. Créala en Ventas → Cotización."}
          </li>
        ) : (
          visibles.map((c, i) => {
            const bloqueada = Boolean(c.ocupadaPor);
            const elegida = c.value === selectedId;
            return (
              <li key={c.value} className="cot-rise" style={{ "--cot-i": Math.min(i, 8) } as CSSProperties}>
                <button
                  type="button"
                  role="option"
                  aria-selected={elegida}
                  disabled={bloqueada}
                  aria-disabled={bloqueada || undefined}
                  aria-label={bloqueada ? `Cotización ${c.folio} no disponible: en uso en ${c.ocupadaPor}` : `Seleccionar cotización ${c.folio}`}
                  onClick={() => {
                    if (!bloqueada) onSelect(c);
                  }}
                  className={`group flex w-full items-center gap-3 rounded-[12px] px-3 py-3 text-left transition-colors duration-150 ${focusRing} ${
                    bloqueada
                      ? "cursor-not-allowed opacity-60"
                      : elegida
                        ? "bg-[#EEF3FF] dark:bg-[#1B2A63]/50"
                        : "hover:bg-[#F5F8FF] dark:hover:bg-[#1B2A63]/30"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{c.folio}</span>
                      {c.status ? (
                        <span className="inline-flex h-5 items-center rounded-full bg-[#F4F4F5] px-2 text-[11px] font-semibold uppercase tracking-wide text-[#52525B] dark:bg-white/6 dark:text-[#B7C1D1]">
                          {c.status}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-[12.5px] text-[#71717A] dark:text-[#8EA0B8]">
                      {c.fecha ? formatFechaCorta(c.fecha) : "Sin fecha"}
                    </span>
                    {bloqueada ? (
                      <span className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-[#8A5D0F] dark:text-[#E6A23C]">
                        <Lock className="size-3" aria-hidden />
                        En uso en {c.ocupadaPor}
                      </span>
                    ) : null}
                  </span>
                  {elegida ? (
                    <Check className="size-4 shrink-0 text-[#1B5CFF] dark:text-[#7EA0FF]" aria-hidden />
                  ) : !bloqueada ? (
                    <ChevronRight
                      className="size-4 shrink-0 text-[#A1A1AA] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#1B5CFF] motion-reduce:transition-none"
                      aria-hidden
                    />
                  ) : null}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </ProyectoPickerShell>
  );
}
