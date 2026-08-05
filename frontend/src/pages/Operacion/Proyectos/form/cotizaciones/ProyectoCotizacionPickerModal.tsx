import { useId } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import {
  erpBodyClass,
  erpInputLikeClass,
  erpSectionLabelClass,
  erpSubheadingClass,
} from "@/layout/erpPageStyles";
import { displayCotizacionFolio } from "../../shared/proyectoFormUtils";
import type { CotizacionOrigen, CotizacionResumen } from "../../shared/proyectoTypes";
import {
  proyectoCotizacionOptionClass,
  proyectoEmptyPanelClass,
  proyectoPickerModalBodyClass,
  proyectoPickerModalClass,
  proyectoPickerModalHeaderClass,
} from "../../shared/proyectoPageStyles";
import type { CotizacionPickerTarget } from "./useCotizacionPicker";

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
  cotizacionesFiltradas: CotizacionResumen[];
  pickerLoadingId: string | null;
  onSelect: (item: CotizacionResumen) => void | Promise<void>;
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
  const titleId = useId();

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      closeOnEscape
      mobileBottomSheet
      ariaLabelledBy={titleId}
      className={proyectoPickerModalClass}
    >
      <header className={proyectoPickerModalHeaderClass}>
        <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#ff801f]" aria-hidden />
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff801f] text-black shadow-sm">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" aria-hidden>
              <path
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <p className={erpSectionLabelClass}>Proyectos · Cotización</p>
            <h3 id={titleId} className={`mt-1 ${erpSubheadingClass}`}>
              {pickerTarget === "adicional" ? "Vincular cotización adicional" : "Cargar cotización"}
            </h3>
            <p className={`${erpBodyClass} mt-1 text-sm`}>
              {pickerTarget === "adicional"
                ? "Selecciona la cotización que cubre el presupuesto o requerimientos adicionales."
                : "Puedes vincular varias cotizaciones DigitalFlow o SICAR — el cliente se completa con la primera."}
            </p>
          </div>
        </div>
      </header>

      <div className={proyectoPickerModalBodyClass}>
        <div
          className="flex rounded-xl border border-[#e7ded0] bg-[#fcfaf6] p-1 dark:border-[#334155] dark:bg-[#0f172a]"
          role="tablist"
          aria-label="Origen de cotización"
        >
          {(
            [
              { id: "digitalflow" as const, label: "DigitalFlow" },
              { id: "sicar" as const, label: "SICAR" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={pickerTab === tab.id}
              onClick={() => {
                setPickerTab(tab.id);
                setPickerSearch("");
                setPickerResults([]);
                setPickerError("");
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#ff801f]/25 ${
                pickerTab === tab.id
                  ? "bg-white text-[#1c1917] shadow-sm dark:bg-[#1e293b] dark:text-[#f8fafc]"
                  : "text-[#78716c] dark:text-[#8ea0b8]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <Label htmlFor="proyecto-cotizacion-buscar" className="sr-only">
            Buscar cotización
          </Label>
          <input
            id="proyecto-cotizacion-buscar"
            type="search"
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
            placeholder="Buscar por folio o cliente…"
            className={erpInputLikeClass}
          />
        </div>

        <ul className="mt-4 space-y-2" role="listbox" aria-label="Cotizaciones">
          {pickerLoading ? (
            <li className={`${proyectoEmptyPanelClass} py-6`} role="status">
              Buscando cotizaciones…
            </li>
          ) : pickerError ? (
            <li className={`${proyectoEmptyPanelClass} py-6 text-rose-700 dark:text-rose-300`} role="alert">
              {pickerError}
            </li>
          ) : cotizacionesFiltradas.length === 0 ? (
            <li className={`${proyectoEmptyPanelClass} py-6`} role="status">
              {pickerSearch.trim()
                ? "Sin resultados para la búsqueda."
                : "Escribe folio o cliente para buscar, o espera el listado reciente."}
            </li>
          ) : (
            cotizacionesFiltradas.map((item) => {
              const busy = pickerLoadingId === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    disabled={Boolean(pickerLoadingId)}
                    aria-busy={busy}
                    className={proyectoCotizacionOptionClass}
                    onClick={() => void onSelect(item)}
                  >
                    <span className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                      {displayCotizacionFolio(item.folio, item.origen)} — {item.cliente}
                      {busy ? " · Cargando…" : ""}
                    </span>
                    <span className="mt-0.5 block text-xs text-[#78716c] dark:text-[#8ea0b8]">
                      {item.fecha}
                      {item.contacto ? ` · ${item.contacto}` : ""}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </Modal>
  );
}
