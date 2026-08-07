import { useId, useState } from "react";
import { erpInputLikeClass, erpPrimaryBtnClass } from "@/layout/erpPageStyles";
import type { FacturaProveedor, ImportarFacturaResponse } from "../shared/inventarioTypes";
import { inventarioFieldLabelClass } from "../shared/inventarioStyles";
import { CheckIcon, RefreshIcon } from "./inventarioIcons";

type InventarioImportFacturaBarProps = {
  disabled: boolean;
  onImport: (proveedor: FacturaProveedor, folio: string) => Promise<ImportarFacturaResponse>;
};

const PROVEEDORES: { value: FacturaProveedor; label: string; enabled: boolean }[] = [
  { value: "syscom", label: "SYSCOM", enabled: true },
  { value: "tvc", label: "TVC (próximamente)", enabled: false },
];

export default function InventarioImportFacturaBar({
  disabled,
  onImport,
}: InventarioImportFacturaBarProps) {
  const baseId = useId();
  const [proveedor, setProveedor] = useState<FacturaProveedor>("syscom");
  const [folio, setFolio] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const folioOk = folio.trim().length >= 3;
  const proveedorOk = PROVEEDORES.some((p) => p.value === proveedor && p.enabled);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folioOk || !proveedorOk || disabled || importing) return;
    setImporting(true);
    setError(null);
    setOkMsg(null);
    try {
      const res = await onImport(proveedor, folio.trim());
      setOkMsg(
        `Factura ${res.folio}: ${res.creados} nuevos, ${res.actualizados} actualizados (${res.movimientos} líneas).`,
      );
      setFolio("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo importar la factura");
    } finally {
      setImporting(false);
    }
  };

  return (
    <section
      className="rounded-2xl border border-[#e7ded0] bg-[#fffdfa] p-4 shadow-[0_12px_32px_-24px_rgba(28,25,23,0.2)] dark:border-[#273244] dark:bg-[#111827]/80 sm:p-5"
      aria-label="Importar factura de proveedor"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
            Importar factura
          </p>
          <p className="mt-0.5 text-xs text-[#78716c] dark:text-[#8ea0b8]">
            Pega el folio (ej. FA26/1405777) y se cargan todos los productos como entradas.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="sm:w-44">
            <label htmlFor={`${baseId}-prov`} className={inventarioFieldLabelClass}>
              Proveedor
            </label>
            <select
              id={`${baseId}-prov`}
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value as FacturaProveedor)}
              className={erpInputLikeClass}
              disabled={disabled || importing}
            >
              {PROVEEDORES.map((p) => (
                <option key={p.value} value={p.value} disabled={!p.enabled}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor={`${baseId}-folio`} className={inventarioFieldLabelClass}>
              Folio
            </label>
            <input
              id={`${baseId}-folio`}
              type="text"
              value={folio}
              onChange={(e) => setFolio(e.target.value)}
              placeholder="FA26/1405777"
              className={`${erpInputLikeClass} font-mono`}
              disabled={disabled || importing}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <button
            type="submit"
            className={erpPrimaryBtnClass}
            disabled={disabled || importing || !folioOk || !proveedorOk}
          >
            {importing ? (
              <>
                <RefreshIcon className="h-4 w-4" />
                Importando…
              </>
            ) : (
              <>
                <CheckIcon className="h-4 w-4" />
                Importar
              </>
            )}
          </button>
        </div>

        {error ? (
          <p className="text-xs text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        {okMsg ? (
          <p className="text-xs text-[#047857] dark:text-[#6ee7b7]" role="status" aria-live="polite">
            {okMsg}
          </p>
        ) : null}
        {!proveedorOk ? (
          <p className="text-xs text-[#78716c] dark:text-[#8ea0b8]">
            TVC aún no expone facturas en su API; el selector queda listo para cuando sí.
          </p>
        ) : null}
      </form>
    </section>
  );
}
