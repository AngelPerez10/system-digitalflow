import SearchableSelect from "@/components/form/SearchableSelect";
import type { CotizacionOrigen, FacturaConceptoForm } from "./facturaCfdiFormTypes";
import { sumConceptosSubtotal } from "./facturaCfdiFormTypes";
import {
  FacturaSectionIntro,
  FacturaTotalsBar,
  facturaHintClass,
  facturaSectionClass,
  facturaSectionLabelClass,
  facturaSubheadingClass,
} from "./facturaTabUi";

const money = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });

const tableWrapClass =
  "overflow-x-auto rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#1B2539]";

const tableHeaderClass =
  "sticky top-0 z-10 border-b border-[#E7E7EA] bg-white text-[10px] font-semibold uppercase tracking-wider text-[#6E6E77] dark:border-[#273244] dark:bg-[#111827] dark:text-[#8EA0B8] sm:text-[11px]";

type CotizacionOption = { value: string; label: string };

type Props = {
  origen: CotizacionOrigen;
  onOrigenChange: (origen: CotizacionOrigen) => void;
  selectedKey: string;
  options: CotizacionOption[];
  onSearchChange: (query: string) => void;
  onSelect: (value: string) => void;
  loading: boolean;
  loadingDetail: boolean;
  cotizacionLabel: string | null;
  conceptos: FacturaConceptoForm[];
  disabled?: boolean;
};

const ORIGEN_TABS: { id: CotizacionOrigen; label: string; hint: string }[] = [
  { id: "digitalflow", label: "DigitalFlow", hint: "Cotizaciones creadas en este sistema" },
  { id: "sicar", label: "SICAR", hint: "Cotizaciones en la base MySQL de SICAR" },
];

const ORIGEN_PANEL_ID = "cotizacion-origen-panel";

export default function CotizacionFacturaTab({
  origen,
  onOrigenChange,
  selectedKey,
  options,
  onSearchChange,
  onSelect,
  loading,
  loadingDetail,
  conceptos,
  disabled,
}: Props) {
  const subtotal = sumConceptosSubtotal(conceptos);
  const ivaPct = conceptos[0]?.tasa_iva != null ? conceptos[0].tasa_iva * 100 : 16;
  const iva = subtotal * (ivaPct / 100);
  const total = subtotal + iva;
  const activeOrigen = ORIGEN_TABS.find((t) => t.id === origen);
  const statusMessage = loading
    ? "Buscando cotizaciones…"
    : loadingDetail
      ? "Cargando conceptos…"
      : null;

  return (
    <div className="space-y-4">
      <section className={facturaSectionClass} aria-labelledby="cotizacion-import-heading">
        <FacturaSectionIntro
          id="cotizacion-import-heading"
          label="Cotización"
          title="Importar conceptos"
          description="Elige el origen, busca la cotización y carga las líneas al comprobante. En SICAR también se vincula el cliente."
        />

        <div
          className="inline-grid w-full max-w-md grid-cols-2 gap-1 rounded-[12px] border border-[#E7E7EA] bg-white p-1 dark:border-[#273244] dark:bg-[#111827]"
          role="tablist"
          aria-label="Origen de cotización"
        >
          {ORIGEN_TABS.map((tab) => {
            const selected = origen === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`cotizacion-origen-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={ORIGEN_PANEL_ID}
                disabled={disabled || loadingDetail}
                onClick={() => onOrigenChange(tab.id)}
                className={`min-h-[44px] rounded-[10px] px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] ${
                  selected
                    ? "bg-[#1B5CFF] text-white shadow-sm dark:bg-[#4B7CFF]"
                    : "text-[#52525B] hover:bg-[#FAFAFA] dark:text-[#cbd5e1] dark:hover:bg-white/[0.06]"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <p className={`mt-2 ${facturaHintClass}`}>{activeOrigen?.hint}</p>

        <div
          id={ORIGEN_PANEL_ID}
          role="tabpanel"
          aria-labelledby={`cotizacion-origen-tab-${origen}`}
          className="mt-5 border-t border-[#E7E7EA] pt-5 dark:border-[#273244]"
        >
          <SearchableSelect
            label="Cotización"
            value={selectedKey}
            onChange={onSelect}
            options={options}
            onSearchChange={onSearchChange}
            filterLocally={false}
            placeholder={
              origen === "sicar" ? "Buscar por folio, cliente o RFC…" : "Buscar por folio o cliente…"
            }
            disabled={disabled || loadingDetail}
          />

          <div aria-live="polite" aria-atomic="true" className="min-h-[1.25rem]">
            {statusMessage ? (
              <p className={`mt-2 ${facturaHintClass}`} role="status">
                {statusMessage}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {conceptos.length > 0 ? (
        <section className={`${facturaSectionClass} !p-0`} aria-labelledby="cotizacion-conceptos-heading">
          <div className="border-b border-[#E7E7EA] px-4 py-4 dark:border-[#273244] sm:px-5">
            <p className={facturaSectionLabelClass}>Conceptos importados</p>
            <h4 id="cotizacion-conceptos-heading" className={`mt-0.5 ${facturaSubheadingClass}`}>
              {conceptos.length} línea{conceptos.length === 1 ? "" : "s"}
            </h4>
          </div>

          <FacturaTotalsBar
            ariaLabel="Totales del comprobante"
            items={[
              { label: "Subtotal", value: money(subtotal) },
              { label: `IVA (${ivaPct.toFixed(0)}%)`, value: money(iva) },
              { label: "Total estimado", value: money(total), emphasis: true },
            ]}
          />

          <div className={`${tableWrapClass} !rounded-none !border-0`}>
            <table className="min-w-full text-left text-sm">
              <caption className="sr-only">Conceptos importados de la cotización seleccionada</caption>
              <thead className={tableHeaderClass}>
                <tr>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider">
                    Descripción
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold uppercase tracking-wider">
                    Cant.
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold uppercase tracking-wider">
                    P.U. s/IVA
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold uppercase tracking-wider">
                    Importe
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEDED] dark:divide-[#273244]">
                {conceptos.map((c, idx) => (
                  <tr key={`${c.clave || ""}-${idx}`} className="text-[#09090B] dark:text-[#e5e7eb]">
                    <td className="max-w-[16rem] overflow-hidden px-4 py-2.5">
                      <span className="block truncate" title={c.descripcion}>
                        {c.descripcion}
                      </span>
                      {c.clave ? (
                        <span className="mt-0.5 block font-mono text-[11px] text-[#6E6E77] dark:text-[#94a3b8]">
                          {c.clave}
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{c.cantidad}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{money(c.precio_sin)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">
                      {money(c.cantidad * c.precio_sin)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div
          className="flex flex-col items-center gap-3 rounded-[16px] border border-dashed border-[#E7E7EA] bg-[#FAFAFA] px-6 py-10 text-center dark:border-[#273244] dark:bg-[#1B2539]"
          role="status"
        >
          <span
            className="inline-flex size-12 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]"
            aria-hidden
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M12 3v12M8 11l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 21h16" strokeLinecap="round" />
            </svg>
          </span>
          <p className="text-sm font-semibold text-[#09090B] dark:text-[#F8FAFC]">Sin conceptos importados</p>
          <p className={`max-w-sm ${facturaHintClass}`}>
            Selecciona una cotización para importar sus conceptos al comprobante.
          </p>
        </div>
      )}
    </div>
  );
}
