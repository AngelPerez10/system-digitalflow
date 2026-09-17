import { useEffect, useId, useRef, useState } from "react";
import {
  consolaRailClass,
  consolaShellClass,
  inventarioFieldLabelClass,
  invNotaSalidaTextareaClass,
  modoToggleBtnClass,
  modoToggleWrapClass,
  scanInputClass,
} from "../shared/inventarioStyles";
import type { ScanModo } from "../shared/inventarioTypes";
import { BarcodeIcon, EntradaIcon, SalidaIcon } from "./inventarioIcons";

type InventarioScanBarProps = {
  modo: ScanModo;
  onModoChange: (modo: ScanModo) => void;
  /** Segundo argumento: motivo opcional (solo se usa en salidas). */
  onScan: (codigo: string, notaSalida?: string) => void;
  disabled: boolean;
  scanning: boolean;
  statusMessage: string | null;
};

const MODOS: { value: ScanModo; label: string; hint: string }[] = [
  { value: "entrada", label: "Entrada", hint: "Cada escaneo suma 1 a la existencia." },
  { value: "salida", label: "Salida", hint: "Cada escaneo resta 1 a la existencia." },
];

const NOTA_MAX = 255;

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
  const notaInputId = useId();
  const statusId = useId();
  const [focused, setFocused] = useState(false);
  const [notaSalida, setNotaSalida] = useState("");

  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled, modo]);

  const submitScan = () => {
    const value = inputRef.current?.value.trim() ?? "";
    if (!value || disabled) return;
    onScan(value, modo === "salida" ? notaSalida.trim() : undefined);
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
                ? "bg-[#E9F8F0] text-[#04724D] dark:bg-[#0F2A1C] dark:text-[#4ADE80]"
                : "bg-[rgba(230,162,60,0.16)] text-[#9A6B15] dark:bg-[rgba(230,162,60,0.16)] dark:text-[#E6A23C]"
            }`}
            aria-hidden="true"
          >
            <ModoIcon modo={modo} />
          </span>
          <div className="min-w-0">
            <span
              id={modoGroupId}
              className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E77] dark:text-[#8EA0B8]"
            >
              Tipo de movimiento
            </span>
            <p className="mt-1 text-sm text-[#52525B] dark:text-[#B7C1D1]">{modoActual.hint}</p>
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
        className="mt-5 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          submitScan();
        }}
      >
        {modo === "salida" ? (
          <div>
            <div className="mb-1.5 flex flex-wrap items-end justify-between gap-2">
              <label htmlFor={notaInputId} className={inventarioFieldLabelClass}>
                Motivo de la salida{" "}
                <span className="font-normal normal-case tracking-normal text-[#6E6E77] dark:text-[#8EA0B8]">
                  (opcional)
                </span>
              </label>
              <span
                className="text-[11px] tabular-nums text-[#6E6E77] dark:text-[#8EA0B8]"
                aria-live="polite"
              >
                {notaSalida.length}/{NOTA_MAX}
              </span>
            </div>
            <textarea
              id={notaInputId}
              value={notaSalida}
              onChange={(e) => setNotaSalida(e.target.value.slice(0, NOTA_MAX))}
              maxLength={NOTA_MAX}
              rows={2}
              disabled={disabled}
              autoComplete="off"
              placeholder="Ej. Entrega a obra, préstamo, merma…"
              className={invNotaSalidaTextareaClass}
            />
            <p className="mt-1 text-[11px] text-[#6E6E77] dark:text-[#8EA0B8]">
              Se reutiliza en cada escaneo hasta que lo borres. El foco vuelve al código para el
              escáner.
            </p>
          </div>
        ) : null}

        <div>
          <label
            htmlFor={scanInputId}
            className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E77] dark:text-[#8EA0B8]"
          >
            Código de barras
          </label>
          <div className="relative">
            <span
              className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#A1A1AA] dark:text-[#64748b]"
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
              placeholder={
                disabled ? "Sin permiso para escanear" : "Escanea o escribe el código y presiona Enter"
              }
              className={scanInputClass}
              aria-describedby={statusId}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6E6E77] dark:text-[#8EA0B8]">
          {disabled ? (
            <span>Necesitas permiso de creación en inventario para registrar entradas y salidas.</span>
          ) : (
            <>
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  focused
                    ? "bg-[#04724D] motion-safe:animate-pulse"
                    : "bg-[#D3D3D8] dark:bg-[#3A4661]"
                }`}
                aria-hidden="true"
              />
              <span>
                {focused
                  ? "Listo para escanear."
                  : "Haz clic en el campo de código para volver a capturar el escáner."}
              </span>
            </>
          )}
        </div>
      </form>

      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className="mt-4 min-h-[1.5rem] text-sm font-medium text-[#09090B] dark:text-[#F8FAFC]"
      >
        {scanning ? "Procesando escaneo…" : statusMessage}
      </p>
    </section>
  );
}
