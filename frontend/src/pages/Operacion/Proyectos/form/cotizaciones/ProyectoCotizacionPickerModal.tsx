import { useId } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import {
  claudeBodyClass as erpBodyClass,
  erpInputLikeClass,
  sectionLabelOrangeClass as erpSectionLabelClass,
  erpSubheadingClass,
} from "../../../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import { erpModalSansStyle } from "../../../OrdenesTrabajo/ordenTrabajoStyles";
import { displayCotizacionFolio } from "../../shared/proyectoFormUtils";
import type { CotizacionOrigen } from "../../shared/proyectoTypes";
import {
  proyectoCotizacionOptionClass,
  proyectoCotizacionOptionDisabledClass,
  proyectoEmptyPanelClass,
  proyectoPickerModalBodyClass,
  proyectoPickerModalClass,
  proyectoPickerModalHeaderClass,
} from "../../shared/proyectoPageStyles";
import type { CotizacionPickerRow, CotizacionPickerTarget } from "./useCotizacionPicker";

export type ProyectoCotizacionPickerModalProps = {
  open: boolean;
  onClose: () => void;
  pickerTarget: CotizacionPickerTarget;
  pickerTab: CotizacionOrigen;
  setPickerTab: (tab: CotizacionOrigen) => void;
  pickerSearch: string;
  setPickerSearch: (v: string) => void;
  setPickerResults: (results: import("../../shared/proyectoTypes").CotizacionResumen[]) => void;
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
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden" style={erpModalSansStyle}>
      <header className={proyectoPickerModalHeaderClass}>
        <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#1B5CFF]" aria-hidden />
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1B5CFF] text-white shadow-sm">
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
                : "Puedes vincular varias cotizaciones DigitalFlow o SICAR — el cliente se completa con la primera. Las ya usadas en otro proyecto aparecen bloqueadas."}
            </p>
          </div>
        </div>
      </header>

      <div className={proyectoPickerModalBodyClass}>
        <div
          role="tablist"
          aria-label="Origen de cotización"
          className="flex gap-1 rounded-xl bg-[#F4F4F5] p-1 dark:bg-[#0f172a]"
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
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B5CFF]/25 ${
                pickerTab === tab.id
                  ? "bg-white text-[#09090B] shadow-sm dark:bg-[#1e293b] dark:text-[#f8fafc]"
                  : "text-[#6E6E77] dark:text-[#8ea0b8]"
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
          ) : pickerError && cotizacionesFiltradas.length === 0 ? (
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
            <>
              {pickerError ? (
                <li className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200" role="alert">
                  {pickerError}
                </li>
              ) : null}
              {cotizacionesFiltradas.map((item) => {
                const busy = pickerLoadingId === item.id;
                const folioLabel = displayCotizacionFolio(item.folio, item.origen);
                const ocupada = Boolean(item.ocupadaPorFolio);
                const bloqueadaPorPrincipal = Boolean(item.yaVinculada);
                const disabled = ocupada || bloqueadaPorPrincipal || Boolean(pickerLoadingId);
                const motivo = ocupada
                  ? `En uso en ${item.ocupadaPorFolio}`
                  : bloqueadaPorPrincipal
                    ? "Ya vinculada como principal en este proyecto"
                    : null;
                const ariaLabel = motivo
                  ? `Cotización ${folioLabel} no disponible: ${motivo}`
                  : `Seleccionar cotización ${folioLabel}`;

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="option"
                      disabled={disabled}
                      aria-disabled={disabled || undefined}
                      aria-busy={busy || undefined}
                      aria-label={ariaLabel}
                      className={
                        ocupada || bloqueadaPorPrincipal
                          ? proyectoCotizacionOptionDisabledClass
                          : proyectoCotizacionOptionClass
                      }
                      onClick={() => {
                        if (ocupada || bloqueadaPorPrincipal) return;
                        void onSelect(item);
                      }}
                    >
                      <span
                        className={`text-sm font-semibold ${
                          ocupada || bloqueadaPorPrincipal
                            ? "text-[#6E6E77] dark:text-[#8ea0b8]"
                            : "text-[#09090B] dark:text-[#f8fafc]"
                        }`}
                      >
                        {folioLabel} — {item.cliente}
                        {busy ? " · Cargando…" : ""}
                      </span>
                      <span className="mt-0.5 block text-xs text-[#6E6E77] dark:text-[#8ea0b8]">
                        {item.fecha}
                        {item.contacto ? ` · ${item.contacto}` : ""}
                      </span>
                      {motivo ? (
                        <span className="mt-1.5 block text-[11px] font-semibold text-[#9A6B15] dark:text-[#E6A23C]">
                          {motivo}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </>
          )}
        </ul>
      </div>
      </div>
    </Modal>
  );
}
