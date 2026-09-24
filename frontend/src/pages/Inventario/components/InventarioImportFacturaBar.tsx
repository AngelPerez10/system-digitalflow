/**
 * Importar factura en tres pasos: folio → revisar lo que llegó → confirmar.
 *
 * «Revisar factura» solo consulta al proveedor (no toca el inventario) y abre
 * el diálogo de recepción. Al confirmar, lo marcado entra al inventario y el
 * resto queda en espera.
 */
import { useId, useState } from "react";
import { Check, FileSearch, Loader2, ReceiptText } from "lucide-react";
import type {
  FacturaPreview,
  FacturaProveedor,
  ImportarFacturaResponse,
  RecepcionLinea,
} from "../shared/inventarioTypes";
import { previsualizarFactura } from "../shared/inventarioApi";
import { invCardShellClass, invInputLikeClass, invPrimaryBtnClass, inventarioFieldLabelClass } from "../shared/inventarioStyles";
import InventarioFacturaRecepcionModal from "./InventarioFacturaRecepcionModal";

type Props = {
  disabled: boolean;
  /** Confirma la recepción; la página muestra la alerta global de resultado. */
  onImport: (
    proveedor: FacturaProveedor,
    folio: string,
    recepcion: RecepcionLinea[],
  ) => Promise<ImportarFacturaResponse>;
};

const PROVEEDORES: { value: FacturaProveedor; label: string; enabled: boolean }[] = [
  { value: "syscom", label: "SYSCOM", enabled: true },
  { value: "tvc", label: "TVC", enabled: false },
];

const PASOS = ["Folio", "Revisar llegada", "Confirmar"] as const;

export default function InventarioImportFacturaBar({ disabled, onImport }: Props) {
  const baseId = useId();
  const [proveedor, setProveedor] = useState<FacturaProveedor>("syscom");
  const [folio, setFolio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<FacturaPreview | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const folioOk = folio.trim().length >= 3;
  const proveedorOk = PROVEEDORES.some((p) => p.value === proveedor && p.enabled);
  const paso = modalOpen ? 1 : 0;

  const revisar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folioOk || !proveedorOk || disabled || loading) return;
    setLoading(true);
    setError(null);
    try {
      setPreview(await previsualizarFactura(proveedor, folio.trim()));
      setModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo consultar la factura");
    } finally {
      setLoading(false);
    }
  };

  const confirmar = async (recepcion: RecepcionLinea[]) => {
    if (!preview) return;
    await onImport(preview.proveedor, preview.folio, recepcion);
    setModalOpen(false);
    setFolio("");
  };

  return (
    <section className={`${invCardShellClass} overflow-visible`} aria-labelledby={`${baseId}-title`}>
      <div className="flex flex-col gap-4 px-4 pb-4 pt-5 sm:px-6 sm:pt-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(27,92,255,0.08)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#9BB6FF]">
            <ReceiptText className="size-5" strokeWidth={1.7} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id={`${baseId}-title`} className="text-[16px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">
              Importar factura
            </h2>
            <p className="mt-0.5 max-w-[62ch] text-[13px] leading-[19px] text-[#6E6E77] dark:text-[#8EA0B8]">
              Consulta la factura, marca lo que ya llegó y confirma. Lo que falte queda en espera sin afectar existencias.
            </p>
          </div>
        </div>

        {/* Pasos del flujo (informativo) */}
        <ol className="hidden shrink-0 items-center gap-2 text-[12px] font-medium md:flex" aria-label="Pasos para importar">
          {PASOS.map((label, i) => {
            const done = i < paso;
            const active = i === paso;
            return (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={`inline-flex size-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors duration-300 ${
                    done
                      ? "bg-[#04724D] text-white dark:bg-[#22A06B]"
                      : active
                        ? "bg-[#1B5CFF] text-white dark:bg-[#4B7CFF]"
                        : "bg-[#F4F4F5] text-[#A1A1AA] dark:bg-[#1B2539] dark:text-[#64748B]"
                  }`}
                  aria-hidden
                >
                  {done ? <Check className="cot-tick size-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className={active ? "text-[#09090B] dark:text-[#F8FAFC]" : "text-[#6E6E77] dark:text-[#8EA0B8]"}>
                  {label}
                  {active ? <span className="sr-only"> (paso actual)</span> : null}
                </span>
                {i < PASOS.length - 1 ? <span className="h-px w-6 bg-[#E7E7EA] dark:bg-[#273244]" aria-hidden /> : null}
              </li>
            );
          })}
        </ol>
      </div>

      <form onSubmit={(e) => void revisar(e)} className="border-t border-[#F0F0F2] px-4 py-4 dark:border-[#1F2A3C] sm:px-6 sm:py-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-end sm:gap-4">
          <div>
            <span id={`${baseId}-prov`} className={inventarioFieldLabelClass}>
              Proveedor
            </span>
            <div
              role="radiogroup"
              aria-labelledby={`${baseId}-prov`}
              className="grid h-11 grid-cols-2 rounded-[10px] border border-[#E7E7EA] bg-[#F4F4F5] p-1 dark:border-[#273244] dark:bg-[#0F172A] sm:w-52"
            >
              {PROVEEDORES.map((p) => {
                const on = proveedor === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={!p.enabled || disabled || loading}
                    title={p.enabled ? undefined : "TVC aún no expone facturas en su API"}
                    onClick={() => setProveedor(p.value)}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-[7px] text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 disabled:cursor-not-allowed ${
                      on
                        ? "bg-white text-[#09090B] shadow-[0_1px_3px_rgba(9,9,11,0.10)] dark:bg-[#1B2539] dark:text-[#F8FAFC]"
                        : "text-[#6E6E77] dark:text-[#8EA0B8]"
                    } ${!p.enabled ? "opacity-60" : ""}`}
                  >
                    {p.label}
                    {!p.enabled ? <span className="text-[10px] font-medium uppercase tracking-wide">Pronto</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-w-0">
            <label htmlFor={`${baseId}-folio`} className={inventarioFieldLabelClass}>
              Folio de la factura
            </label>
            <input
              id={`${baseId}-folio`}
              type="text"
              value={folio}
              onChange={(e) => {
                setFolio(e.target.value);
                if (error) setError(null);
              }}
              placeholder="FA26/1405777"
              aria-describedby={error ? `${baseId}-error` : undefined}
              aria-invalid={error ? true : undefined}
              className={`${invInputLikeClass} font-mono uppercase placeholder:normal-case ${
                error ? "border-[#C22B2B] focus:border-[#C22B2B] focus:ring-[rgba(194,43,43,0.18)] dark:border-[#F87171]" : ""
              }`}
              disabled={disabled || loading}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <button type="submit" className={invPrimaryBtnClass} disabled={disabled || loading || !folioOk || !proveedorOk}>
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FileSearch className="size-4" aria-hidden />}
            {loading ? "Consultando…" : "Revisar factura"}
          </button>
        </div>

        {error ? (
          <p id={`${baseId}-error`} role="alert" className="cot-fade mt-2.5 text-[13px] text-[#C22B2B] dark:text-[#F87171]">
            {error}
          </p>
        ) : null}

      </form>

      <InventarioFacturaRecepcionModal
        open={modalOpen}
        preview={preview}
        onClose={() => setModalOpen(false)}
        onConfirm={confirmar}
      />
    </section>
  );
}
