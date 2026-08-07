import { useEffect, useId, useRef, useState } from "react";
import {
  consolaRailClass,
  consolaShellClass,
  modoToggleBtnClass,
  modoToggleWrapClass,
  scanInputClass,
} from "../shared/inventarioStyles";
import type { ScanModo } from "../shared/inventarioTypes";
import { BarcodeIcon, EntradaIcon, SalidaIcon } from "./inventarioIcons";

type InventarioScanBarProps = {
  modo: ScanModo;
  onModoChange: (modo: ScanModo) => void;
  onScan: (codigo: string) => void;
  disabled: boolean;
  scanning: boolean;
  statusMessage: string | null;
};

const MODOS: { value: ScanModo; label: string; hint: string }[] = [
  { value: "entrada", label: "Entrada", hint: "Cada escaneo suma 1 a la existencia." },
  { value: "salida", label: "Salida", hint: "Cada escaneo resta 1 a la existencia." },
];

function ModoIcon({ modo }: { modo: ScanModo }) {
  return modo === "entrada" ? (
    <EntradaIcon className="h-4 w-4" />
  ) : (
    <SalidaIcon className="h-4 w-4" />
  );
}

export default function InventarioScanBar({
  modo,
  onModoChange,
  onScan,
  disabled,
  scanning,
  statusMessage,
}: InventarioScanBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const modoGroupId = useId();
  const scanInputId = useId();
  const statusId = useId();
  const [focused, setFocused] = useState(false);

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

  const modoActual = MODOS.find((m) => m.value === modo) ?? MODOS[0];

  return (
    <section className={`${consolaShellClass} p-4 sm:p-6`} aria-label="Consola de escaneo">
      <div className={consolaRailClass(modo)} aria-hidden="true" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${
              modo === "entrada"
                ? "bg-[#d1fae5] text-[#047857] dark:bg-[#047857]/25 dark:text-[#6ee7b7]"
                : "bg-[#fef3c7] text-[#b45309] dark:bg-[#b45309]/25 dark:text-[#fcd34d]"
            }`}
            aria-hidden="true"
          >
            <ModoIcon modo={modo} />
          </span>
          <div className="min-w-0">
            <span
              id={modoGroupId}
              className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#78716c] dark:text-[#8ea0b8]"
            >
              Tipo de movimiento
            </span>
            <p className="mt-1 text-sm text-[#57534e] dark:text-[#b7c1d1]">{modoActual.hint}</p>
          </div>
        </div>

        <div role="radiogroup" aria-labelledby={modoGroupId} className={modoToggleWrapClass}>
          {MODOS.map(({ value, label }) => {
            const active = modo === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                className={modoToggleBtnClass(active, value)}
                onClick={() => onModoChange(value)}
              >
                <ModoIcon modo={value} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <form
        className="mt-5"
        onSubmit={(e) => {
          e.preventDefault();
          submitScan();
        }}
      >
        <label
          htmlFor={scanInputId}
          className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#78716c] dark:text-[#8ea0b8]"
        >
          Código de barras
        </label>
        <div className="relative">
          <span
            className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#a8a29e] dark:text-[#64748b]"
            aria-hidden="true"
          >
            <BarcodeIcon className="h-6 w-6" />
          </span>
          <input
            ref={inputRef}
            id={scanInputId}
            type="text"
            autoComplete="off"
            spellCheck={false}
            disabled={disabled}
            placeholder={disabled ? "Sin permiso para escanear" : "Escanea o escribe el código y presiona Enter"}
            className={scanInputClass}
            aria-describedby={statusId}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#78716c] dark:text-[#8ea0b8]">
          {disabled ? (
            <span>Necesitas permiso de creación en inventario para registrar entradas y salidas.</span>
          ) : (
            <>
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  focused
                    ? "bg-[#10b981] motion-safe:animate-pulse"
                    : "bg-[#d6d3d1] dark:bg-[#475569]"
                }`}
                aria-hidden="true"
              />
              <span>
                {focused
                  ? "Listo para escanear."
                  : "Haz clic en el campo para volver a capturar el escáner."}
              </span>
            </>
          )}
        </div>
      </form>

      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className="mt-4 min-h-[1.5rem] text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]"
      >
        {scanning ? "Procesando escaneo…" : statusMessage}
      </p>
    </section>
  );
}
