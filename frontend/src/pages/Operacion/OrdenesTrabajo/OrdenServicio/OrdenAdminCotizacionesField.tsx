import { useEffect, useId, useState } from "react";
import Label from "@/components/form/Label";
import { Modal } from "@/components/ui/modal";
import { erpInputLikeClass, erpSecondaryBtnClass, erpSubheadingClass } from "@/layout/erpPageStyles";
import { searchProyectoCotizaciones } from "@/pages/Operacion/Proyectos/proyectoCotizacionSearch";
import { displayCotizacionFolio } from "@/pages/Operacion/Proyectos/proyectoFormUtils";
import {
  proyectoCotizacionOptionClass,
  proyectoEmptyPanelClass,
  proyectoOrigenBadgeClass,
  proyectoPickerModalBodyClass,
  proyectoPickerModalClass,
  proyectoPickerModalHeaderClass,
} from "@/pages/Operacion/Proyectos/proyectoPageStyles";
import type { CotizacionOrigen, CotizacionResumen } from "@/pages/Operacion/Proyectos/proyectoTypes";

type OrdenAdminCotizacionesFieldProps = {
  value: CotizacionResumen[];
  onChange: (next: CotizacionResumen[]) => void;
  disabled?: boolean;
};

/**
 * Adjuntar cotizaciones DigitalFlow / SICAR en el bloque admin de órdenes.
 * Por ahora solo UI (no persiste en la API de órdenes).
 */
export default function OrdenAdminCotizacionesField({
  value,
  onChange,
  disabled = false,
}: OrdenAdminCotizacionesFieldProps) {
  const pickerTitleId = useId().replace(/:/g, "");
  const searchId = useId().replace(/:/g, "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<CotizacionOrigen>("digitalflow");
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerResults, setPickerResults] = useState<CotizacionResumen[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState("");

  useEffect(() => {
    if (!pickerOpen) return;
    let cancelled = false;
    setPickerLoading(true);
    setPickerError("");
    const timer = window.setTimeout(() => {
      void (async () => {
        const { rows, error } = await searchProyectoCotizaciones(pickerTab, pickerSearch);
        if (cancelled) return;
        setPickerResults(rows);
        setPickerError(error?.message || "");
        setPickerLoading(false);
      })();
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pickerOpen, pickerTab, pickerSearch]);

  const attachedIds = new Set(value.map((c) => c.id));
  const available = pickerResults.filter((r) => !attachedIds.has(r.id));

  const attach = (item: CotizacionResumen) => {
    if (attachedIds.has(item.id)) return;
    onChange([...value, item]);
    setPickerOpen(false);
    setPickerSearch("");
  };

  const removeAt = (id: string) => {
    onChange(value.filter((c) => c.id !== id));
  };

  return (
    <div className="relative mt-4 border-t border-[#e7ded0]/80 pt-4 dark:border-[#334155]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Cotizaciones adjuntas</p>
          <p className="mt-0.5 text-[11px] text-[#78716c] dark:text-[#8ea0b8]">
            DigitalFlow o SICAR · {value.length}{" "}
            {value.length === 1 ? "vinculada" : "vinculadas"}
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setPickerOpen(true)}
          className={`${erpSecondaryBtnClass} !min-h-0 !px-3 !py-1.5 !text-xs`}
        >
          Adjuntar cotización
        </button>
      </div>

      {value.length === 0 ? (
        <div className={`${proyectoEmptyPanelClass} !py-5`} role="status">
          <p className="text-xs text-[#78716c] dark:text-[#8ea0b8]">
            Aún no hay cotizaciones. Adjunta una de DigitalFlow o SICAR.
          </p>
        </div>
      ) : (
        <ul className="space-y-2" aria-label="Cotizaciones adjuntas a la orden">
          {value.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-[#e7ded0] bg-white/80 px-3 py-2.5 dark:border-[#334155] dark:bg-[#0f172a]/60"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={proyectoOrigenBadgeClass(item.origen)}>
                    {item.origen === "digitalflow" ? "DigitalFlow" : "SICAR"}
                  </span>
                  <span className="truncate text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                    {displayCotizacionFolio(item.folio, item.origen)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-[#78716c] dark:text-[#8ea0b8]">
                  {item.cliente}
                  {item.fecha ? ` · ${item.fecha}` : ""}
                  {item.contacto ? ` · ${item.contacto}` : ""}
                </p>
              </div>
              {!disabled ? (
                <button
                  type="button"
                  onClick={() => removeAt(item.id)}
                  aria-label={`Quitar cotización ${displayCotizacionFolio(item.folio, item.origen)}`}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 dark:text-rose-400 dark:hover:bg-rose-500/10"
                >
                  Quitar
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        closeOnEscape
        ariaLabelledBy={pickerTitleId}
        className={`${proyectoPickerModalClass} z-[100001]`}
      >
        <header className={proyectoPickerModalHeaderClass}>
          <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#ff801f]" aria-hidden />
          <div className="min-w-0 pr-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ea580c] dark:text-[#fb923c]">
              Órdenes · Admin
            </p>
            <h3 id={pickerTitleId} className={`mt-1 ${erpSubheadingClass}`}>
              Adjuntar cotización
            </h3>
            <p className="mt-1 text-sm text-[#78716c] dark:text-[#8ea0b8]">
              Busca y vincula cotizaciones de DigitalFlow o SICAR a esta orden.
            </p>
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
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/25 ${
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
            <Label htmlFor={searchId} className="sr-only">
              Buscar cotización
            </Label>
            <input
              id={searchId}
              type="search"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Buscar por folio o cliente…"
              className={erpInputLikeClass}
              autoComplete="off"
            />
          </div>

          <ul className="mt-4 space-y-2" role="listbox" aria-label="Cotizaciones disponibles">
            {pickerLoading ? (
              <li className={`${proyectoEmptyPanelClass} py-6`} role="status">
                Buscando cotizaciones…
              </li>
            ) : pickerError ? (
              <li className={`${proyectoEmptyPanelClass} py-6 text-rose-700 dark:text-rose-300`} role="alert">
                {pickerError}
              </li>
            ) : available.length === 0 ? (
              <li className={`${proyectoEmptyPanelClass} py-6`} role="status">
                {pickerSearch.trim()
                  ? "Sin resultados (o ya están adjuntas)."
                  : "Escribe folio o cliente para buscar, o espera el listado reciente."}
              </li>
            ) : (
              available.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    className={proyectoCotizacionOptionClass}
                    onClick={() => attach(item)}
                  >
                    <span className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                      {displayCotizacionFolio(item.folio, item.origen)} — {item.cliente}
                    </span>
                    <span className="mt-0.5 block text-xs text-[#78716c] dark:text-[#8ea0b8]">
                      {item.fecha}
                      {item.contacto ? ` · ${item.contacto}` : ""}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </Modal>
    </div>
  );
}
