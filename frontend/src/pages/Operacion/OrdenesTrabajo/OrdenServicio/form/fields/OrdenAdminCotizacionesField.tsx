import { useEffect, useId, useState } from "react";
import Label from "@/components/form/Label";
import { Link2, Loader2, Plus, Search } from "lucide-react";
import { AppModal, AppModalHeader } from "@/components/ui/modal-kit/ModalKit";
import { erpSecondaryBtnClass } from "@/layout/erpPageStyles";
import { erpInputLikeClass } from "../../ordenServicioStyles";
import { searchProyectoCotizaciones } from "@/pages/Operacion/Proyectos/form/cotizaciones/proyectoCotizacionSearch";
import { displayCotizacionFolio } from "@/pages/Operacion/Proyectos/shared/proyectoFormUtils";
import {
  proyectoEmptyPanelClass,
  proyectoOrigenBadgeClass,
} from "@/pages/Operacion/Proyectos/shared/proyectoPageStyles";
import type { CotizacionOrigen, CotizacionResumen } from "@/pages/Operacion/Proyectos/shared/proyectoTypes";

type OrdenAdminCotizacionesFieldProps = {
  value: CotizacionResumen[];
  onChange: (next: CotizacionResumen[]) => void;
  disabled?: boolean;
};

/**
 * Adjuntar cotizaciones DigitalFlow / SICAR en el bloque admin de órdenes.
 * Se persisten en `cotizaciones_adjuntas` al guardar la orden.
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
    <div className="relative mt-4 border-t border-[#E7E7EA]/80 pt-4 dark:border-[#273244]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Cotizaciones adjuntas</p>
          <p className="mt-0.5 text-[11px] text-[#6E6E77] dark:text-[#8ea0b8]">
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
          <p className="text-xs text-[#6E6E77] dark:text-[#8ea0b8]">
            Aún no hay cotizaciones. Adjunta una de DigitalFlow o SICAR.
          </p>
        </div>
      ) : (
        <ul className="space-y-2" aria-label="Cotizaciones adjuntas a la orden">
          {value.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-[#E7E7EA] bg-white/80 px-3 py-2.5 dark:border-[#273244] dark:bg-[#0f172a]/60"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={proyectoOrigenBadgeClass(item.origen)}>
                    {item.origen === "digitalflow" ? "DigitalFlow" : "SICAR"}
                  </span>
                  <span className="truncate text-sm font-semibold text-[#09090B] dark:text-[#f8fafc]">
                    {displayCotizacionFolio(item.folio, item.origen)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-[#6E6E77] dark:text-[#8ea0b8]">
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

      <AppModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        size="md"
        labelledBy={pickerTitleId}
        className="max-h-[90dvh]"
      >
        <AppModalHeader
          icon={<Link2 className="size-5" strokeWidth={1.9} />}
          tone="info"
          eyebrow="Orden de servicio"
          title="Vincular cotización"
          titleId={pickerTitleId}
          description="Busca una cotización de DigitalFlow o SICAR y adjúntala a esta orden."
          onClose={() => setPickerOpen(false)}
          divided
        />

        <div className="shrink-0 space-y-3 px-6 pt-5">
          <div
            className="grid grid-cols-2 gap-1 rounded-[10px] border border-[#E4E4E7] bg-[#F4F4F5] p-1 dark:border-[#273244] dark:bg-[#0F172A]"
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
                className={`min-h-10 rounded-[7px] text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 ${
                  pickerTab === tab.id
                    ? "bg-white text-[#09090B] shadow-[0_1px_3px_rgba(9,9,11,0.12)] dark:bg-[#1B2539] dark:text-[#F8FAFC]"
                    : "text-[#71717A] hover:text-[#3F3F46] dark:text-[#8EA0B8] dark:hover:text-[#D6DEEA]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Label htmlFor={searchId} className="sr-only">
              Buscar cotización
            </Label>
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#A1A1AA]"
              aria-hidden
            />
            <input
              id={searchId}
              type="search"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Folio o nombre del cliente"
              className={`${erpInputLikeClass} pl-10`}
              autoComplete="off"
            />
          </div>
        </div>

        <ul
          className="custom-scrollbar mt-3 min-h-40 flex-1 space-y-1 overflow-y-auto border-t border-[#F0F0F2] px-4 py-3 dark:border-[#1F2A3C] sm:px-5"
          role="listbox"
          aria-label="Cotizaciones disponibles"
        >
          {pickerLoading ? (
            <li className="flex items-center justify-center gap-2 py-10 text-[13px] text-[#71717A] dark:text-[#8EA0B8]" role="status">
              <Loader2 className="size-4 animate-spin text-[#1B5CFF]" aria-hidden />
              Buscando cotizaciones…
            </li>
          ) : pickerError ? (
            <li
              className="rounded-lg bg-[#FEF2F2] px-3 py-3 text-[13px] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]"
              role="alert"
            >
              {pickerError}
            </li>
          ) : available.length === 0 ? (
            <li className="py-10 text-center text-[13px] text-[#71717A] dark:text-[#8EA0B8]" role="status">
              {pickerSearch.trim() ? "Sin resultados, o ya están vinculadas." : "Escribe un folio o cliente para buscar."}
            </li>
          ) : (
            available.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => attach(item)}
                  className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-[#F4F7FF] focus-visible:bg-[#F4F7FF] focus-visible:outline-none dark:hover:bg-[#1B2539] dark:focus-visible:bg-[#1B2539]"
                >
                  <span className="inline-flex h-9 min-w-20 shrink-0 items-center justify-center rounded-lg bg-[#EEF3FF] px-2 font-mono text-[12px] font-semibold text-[#1244D1] dark:bg-[#1B2A63] dark:text-[#9BB6FF]">
                    {displayCotizacionFolio(item.folio, item.origen)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC]">
                      {item.cliente}
                    </span>
                    <span className="block truncate text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
                      {item.fecha}
                      {item.contacto ? ` · ${item.contacto}` : ""}
                    </span>
                  </span>
                  <Plus
                    className="size-4 shrink-0 text-[#A1A1AA] transition-colors group-hover:text-[#1B5CFF]"
                    aria-hidden
                  />
                </button>
              </li>
            ))
          )}
        </ul>
      </AppModal>
    </div>
  );
}
