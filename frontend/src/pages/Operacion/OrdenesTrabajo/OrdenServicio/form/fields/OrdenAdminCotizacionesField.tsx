import { useEffect, useId, useState, type CSSProperties } from "react";
import Label from "@/components/form/Label";
import { FilePlus2, FileText, Link2, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { AppConfirmDialog, AppModal, AppModalHeader } from "@/components/ui/modal-kit/ModalKit";
import "@/components/ui/modal-kit/motion.css";
import { erpInputLikeClass } from "../../ordenServicioStyles";
import { searchProyectoCotizaciones } from "@/pages/Operacion/Proyectos/form/cotizaciones/proyectoCotizacionSearch";
import { displayCotizacionFolio } from "@/pages/Operacion/Proyectos/shared/proyectoFormUtils";
import { formatFechaCorta } from "@/pages/Operacion/Proyectos/shared/proyectoListUtils";
import { SectionCard } from "@/pages/Operacion/Proyectos/shared/ProyectoUi";
import {
  btn,
  btnSm,
  emptyPanel,
  focusRing,
  iconBtnDanger,
  metaChip,
  origenChip,
} from "@/pages/Operacion/Proyectos/shared/proyectoTokens";
import type { CotizacionOrigen, CotizacionResumen } from "@/pages/Operacion/Proyectos/shared/proyectoTypes";

type OrdenAdminCotizacionesFieldProps = {
  value: CotizacionResumen[];
  onChange: (next: CotizacionResumen[]) => void;
  disabled?: boolean;
  /** Posición en la entrada escalonada de tarjetas. */
  index?: number;
};

/**
 * Tarjeta «Cotizaciones» del bloque admin de órdenes (mismo diseño que en
 * Proyectos): lista numerada, estado vacío y selector DigitalFlow / SICAR.
 * Se persisten en `cotizaciones_adjuntas` al guardar la orden.
 */
export default function OrdenAdminCotizacionesField({
  value,
  onChange,
  disabled = false,
  index = 0,
}: OrdenAdminCotizacionesFieldProps) {
  const sectionId = `orden-sec-cotizaciones-${useId().replace(/:/g, "")}`;
  const pickerTitleId = useId().replace(/:/g, "");
  const searchId = useId().replace(/:/g, "");
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
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

  const hasCotizaciones = value.length > 0;

  return (
    <SectionCard
      id={sectionId}
      index={index}
      title="Cotizaciones"
      icon={<FileText />}
      hint="Cotizaciones de DigitalFlow o SICAR vinculadas a esta orden. Puedes vincular varias."
      locked={disabled && hasCotizaciones}
      flush
      actions={
        hasCotizaciones && !disabled ? (
          <button
            type="button"
            className={`${btn.ghost} ${btnSm} text-[#B42323]! hover:bg-[#FEF2F2]! dark:text-[#F87171]! dark:hover:bg-[#3F1518]!`}
            onClick={() => setConfirmClearOpen(true)}
            aria-haspopup="dialog"
          >
            <Trash2 aria-hidden />
            Quitar todas
          </button>
        ) : null
      }
    >
      {hasCotizaciones ? (
        <>
          <ul className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]" aria-label="Cotizaciones vinculadas a la orden">
            {value.map((item, i) => {
              const folio = displayCotizacionFolio(item.folio, item.origen);
              return (
                <li
                  key={item.id}
                  className="cot-rise flex items-start gap-3 px-4 py-3.5 sm:items-center sm:px-5"
                  style={{ "--cot-i": i } as CSSProperties}
                >
                  <span
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F4F4F5] text-[13px] font-semibold tabular-nums text-[#3F3F46] dark:bg-[#1B2539] dark:text-[#D6DEEA]"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{folio}</p>
                      <span className={origenChip[item.origen]}>
                        {item.origen === "digitalflow" ? "DigitalFlow" : "SICAR"}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {item.fecha ? <span className={metaChip}>{formatFechaCorta(item.fecha)}</span> : null}
                      {item.cliente && item.cliente !== "—" ? (
                        <span className={`${metaChip} max-w-[16rem] truncate`} title={item.cliente}>
                          {item.cliente}
                        </span>
                      ) : null}
                      {item.contacto ? (
                        <span className={`${metaChip} max-w-[14rem] truncate`} title={item.contacto}>
                          {item.contacto}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {!disabled ? (
                    <button
                      type="button"
                      className={iconBtnDanger}
                      onClick={() => removeAt(item.id)}
                      aria-label={`Quitar cotización ${i + 1}, folio ${folio}`}
                      title="Quitar"
                    >
                      <X aria-hidden />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {!disabled ? (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className={`cot-press group flex min-h-12 w-full items-center justify-center gap-2 border-t border-dashed border-[#E4E4E7] bg-[#FAFAFA] text-[14px] font-semibold text-[#1B5CFF] hover:bg-[#F5F8FF] dark:border-[#273244] dark:bg-[#0F172A]/40 dark:text-[#7EA0FF] dark:hover:bg-[#1B2A63]/30 ${focusRing}`}
            >
              <FilePlus2 className="size-4 transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none" aria-hidden />
              Vincular otra cotización
            </button>
          ) : null}
        </>
      ) : (
        <div className="p-4 sm:p-5">
          <div className={emptyPanel} role="status">
            <span className="cot-tick mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63]/70 dark:text-[#9BB6FF]">
              <FileText className="size-5" aria-hidden />
            </span>
            <p className="text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
              {disabled ? "Sin cotizaciones vinculadas" : "Aún no hay cotizaciones"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">
              {disabled
                ? "Esta orden no tiene cotizaciones adjuntas."
                : "Vincula una o más cotizaciones de DigitalFlow o SICAR para dar seguimiento desde oficina."}
            </p>
            {!disabled ? (
              <button type="button" className={`${btn.primary} mt-4`} onClick={() => setPickerOpen(true)}>
                <FilePlus2 aria-hidden />
                Vincular cotización
              </button>
            ) : null}
          </div>
        </div>
      )}

      <AppConfirmDialog
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        onConfirm={() => {
          onChange([]);
          setConfirmClearOpen(false);
        }}
        tone="danger"
        icon={<Trash2 className="size-5" />}
        title="Quitar todas las cotizaciones"
        description="Se desvincularán todas las cotizaciones de esta orden. El cambio se aplica al guardar la orden."
        confirmLabel="Quitar todas"
      />

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
    </SectionCard>
  );
}
