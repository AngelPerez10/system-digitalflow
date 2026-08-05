import { useEffect, useId, useRef } from "react";
import { erpFilterStatusChipClass } from "../../Operacion/OrdenesTrabajo/ordenTrabajoStyles";
import { erpInputLikeClass } from "@/layout/erpPageStyles";
import type { ScanModo } from "../shared/inventarioTypes";

type InventarioScanBarProps = {
  modo: ScanModo;
  onModoChange: (modo: ScanModo) => void;
  onScan: (codigo: string) => void;
  disabled: boolean;
  statusMessage: string | null;
};

export default function InventarioScanBar({
  modo,
  onModoChange,
  onScan,
  disabled,
  statusMessage,
}: InventarioScanBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const modoGroupId = useId();
  const scanLabelId = useId();
  const statusId = useId();

  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled, modo]);

  const submitScan = () => {
    const value = inputRef.current?.value.trim() ?? "";
    if (!value || disabled) return;
    onScan(value);
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-4">
      <div>
        <span id={modoGroupId} className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#78716c] dark:text-[#8ea0b8]">
          Tipo de movimiento
        </span>
        <div
          role="radiogroup"
          aria-labelledby={modoGroupId}
          className="flex flex-wrap gap-2"
        >
          {(["entrada", "salida"] as const).map((value) => {
            const active = modo === value;
            const label = value === "entrada" ? "Entrada" : "Salida";
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                aria-pressed={active}
                disabled={disabled}
                className={erpFilterStatusChipClass(active)}
                onClick={() => onModoChange(value)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitScan();
        }}
      >
        <label htmlFor={scanLabelId} className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#78716c] dark:text-[#8ea0b8]">
          Código de barras
        </label>
        <input
          ref={inputRef}
          id={scanLabelId}
          type="text"
          autoComplete="off"
          inputMode="numeric"
          disabled={disabled}
          placeholder={disabled ? "Sin permiso para escanear" : "Escanea o escribe el código y presiona Enter"}
          className={erpInputLikeClass}
          aria-describedby={statusMessage ? statusId : undefined}
        />
        {disabled ? (
          <p className="mt-2 text-xs text-[#78716c] dark:text-[#8ea0b8]">
            Necesitas permiso de creación en inventario para registrar entradas y salidas.
          </p>
        ) : null}
      </form>

      <div
        id={statusId}
        role="status"
        aria-live="polite"
        className="min-h-[1.25rem] text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]"
      >
        {statusMessage}
      </div>
    </div>
  );
}
