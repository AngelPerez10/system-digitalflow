import type { CSSProperties } from "react";
import { ChevronRight, FileSearch, Loader2, Lock, Search } from "lucide-react";
import { displayCotizacionFolio } from "../../shared/proyectoFormUtils";
import { formatFechaCorta } from "../../shared/proyectoListUtils";
import { btn, focusRing, input } from "../../shared/proyectoTokens";
import type { CotizacionOrigen, CotizacionResumen } from "../../shared/proyectoTypes";
import { PickerTabs, ProyectoPickerShell } from "../fields/ProyectoPickerShell";
import type { CotizacionPickerRow, CotizacionPickerTarget } from "./useCotizacionPicker";

export type ProyectoCotizacionPickerModalProps = {
  open: boolean;
  onClose: () => void;
  pickerTarget: CotizacionPickerTarget;
  pickerTab: CotizacionOrigen;
  setPickerTab: (tab: CotizacionOrigen) => void;
  pickerSearch: string;
  setPickerSearch: (v: string) => void;
  setPickerResults: (results: CotizacionResumen[]) => void;
  setPickerError: (v: string) => void;
  pickerLoading: boolean;
  pickerError: string;
  cotizacionesFiltradas: CotizacionPickerRow[];
  pickerLoadingId: string | null;
  onSelect: (item: CotizacionPickerRow) => void | Promise<void>;
};

export function ProyectoCotizacionPickerModal({
  open,
  onClose,
  pickerTarget,
  pickerTab,
  setPickerTab,
  pickerSearch,
  setPickerSearch,
  setPickerResults,
  setPickerError,
  pickerLoading,
  pickerError,
  cotizacionesFiltradas,
  pickerLoadingId,
  onSelect,
}: ProyectoCotizacionPickerModalProps) {
  const adicional = pickerTarget === "adicional";

  return (
    <ProyectoPickerShell
      open={open}
      onClose={onClose}
      icon={<FileSearch />}
      eyebrow="Proyecto · Cotizaciones"
      title={adicional ? "Vincular cotización adicional" : "Vincular cotización"}
      description={
        adicional
          ? "Elige la cotización que cubre los requerimientos o el presupuesto adicional."
          : "El cliente se completa con la primera. Las que ya usa otro proyecto aparecen bloqueadas."
      }
      toolbar={
        <>
          <PickerTabs
            label="Origen de cotización"
            value={pickerTab}
            options={[
              { id: "digitalflow", label: "DigitalFlow" },
              { id: "sicar", label: "SICAR" },
            ]}
            onChange={(id) => {
              setPickerTab(id);
              setPickerSearch("");
              setPickerResults([]);
              setPickerError("");
            }}
          />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#A1A1AA]" aria-hidden />
            <label htmlFor="proyecto-cotizacion-buscar" className="sr-only">
              Buscar cotización
            </label>
            <input
              id="proyecto-cotizacion-buscar"
              type="search"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Folio o cliente…"
              className={`${input} pl-10`}
              autoComplete="off"
            />
          </div>
        </>
      }
      footer={
        <button type="button" className={btn.secondary} onClick={onClose}>
          Cancelar
        </button>
      }
    >
      <ul className="space-y-1" role="listbox" aria-label="Cotizaciones" aria-busy={pickerLoading || undefined}>
        {pickerLoading ? (
          Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="flex items-center gap-3 px-3 py-3" aria-hidden style={{ opacity: 1 - i * 0.18 }}>
              <span className="block h-4 w-24 rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
              <span className="block h-4 flex-1 rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
            </li>
          ))
        ) : pickerError && cotizacionesFiltradas.length === 0 ? (
          <li className="px-3 py-8 text-center text-[14px] text-[#B42323] dark:text-[#F87171]" role="alert">
            {pickerError}
          </li>
        ) : cotizacionesFiltradas.length === 0 ? (
          <li className="px-3 py-10 text-center text-[14px] text-[#71717A] dark:text-[#8EA0B8]" role="status">
            {pickerSearch.trim() ? "Sin resultados para la búsqueda." : "Escribe un folio o cliente para buscar."}
          </li>
        ) : (
          <>
            {pickerError ? (
              <li className="mb-1 rounded-[10px] bg-[#FEF2F2] px-3 py-2 text-[12.5px] text-[#9F1F1F] dark:bg-[#3F1518] dark:text-[#FCA5A5]" role="alert">
                {pickerError}
              </li>
            ) : null}
            {cotizacionesFiltradas.map((item, i) => {
              const busy = pickerLoadingId === item.id;
              const folio = displayCotizacionFolio(item.folio, item.origen);
              const ocupada = Boolean(item.ocupadaPorFolio);
              const yaVinculada = Boolean(item.yaVinculada);
              const bloqueada = ocupada || yaVinculada;
              const motivo = ocupada
                ? `En uso en ${item.ocupadaPorFolio}`
                : yaVinculada
                  ? "Ya vinculada como principal"
                  : null;
              return (
                <li key={item.id} className="cot-rise" style={{ "--cot-i": Math.min(i, 8) } as CSSProperties}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    disabled={bloqueada || Boolean(pickerLoadingId)}
                    aria-disabled={bloqueada || undefined}
                    aria-busy={busy || undefined}
                    aria-label={motivo ? `Cotización ${folio} no disponible: ${motivo}` : `Seleccionar cotización ${folio}`}
                    onClick={() => {
                      if (!bloqueada) void onSelect(item);
                    }}
                    className={`group flex w-full items-center gap-3 rounded-[12px] px-3 py-3 text-left transition-colors duration-150 ${focusRing} ${
                      bloqueada
                        ? "cursor-not-allowed opacity-60"
                        : "hover:bg-[#F5F8FF] disabled:cursor-wait dark:hover:bg-[#1B2A63]/30"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-mono text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{folio}</span>
                        <span className="truncate text-[14px] text-[#3F3F46] dark:text-[#D6DEEA]">{item.cliente}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-[12.5px] text-[#71717A] dark:text-[#8EA0B8]">
                        {formatFechaCorta(item.fecha)}
                        {item.contacto ? ` · ${item.contacto}` : ""}
                      </span>
                      {motivo ? (
                        <span className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-[#8A5D0F] dark:text-[#E6A23C]">
                          <Lock className="size-3" aria-hidden />
                          {motivo}
                        </span>
                      ) : null}
                    </span>
                    {busy ? (
                      <Loader2 className="size-4 shrink-0 animate-spin text-[#1B5CFF]" aria-hidden />
                    ) : !bloqueada ? (
                      <ChevronRight
                        className="size-4 shrink-0 text-[#A1A1AA] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#1B5CFF] motion-reduce:transition-none"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </>
        )}
      </ul>
    </ProyectoPickerShell>
  );
}
