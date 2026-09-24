import { Minus, Plus } from "lucide-react";

type InventarioQtyStepperProps = {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  disabled?: boolean;
};

const stepBtnClass =
  "inline-flex h-full w-10 shrink-0 items-center justify-center text-[#52525B] transition-colors hover:bg-[#F4F4F5] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1B5CFF]/40 disabled:cursor-not-allowed disabled:opacity-35 dark:text-[#B7C1D1] dark:hover:bg-[#1B2539] dark:hover:text-[#F8FAFC]";

/** Cantidad con botones − / + (44 px de alto) y campo editable. */
export default function InventarioQtyStepper({
  value,
  min = 0,
  max,
  onChange,
  label,
  disabled,
}: InventarioQtyStepperProps) {
  const set = (n: number) => onChange(Math.max(min, Math.min(max, Number.isFinite(n) ? Math.trunc(n) : min)));
  return (
    <div
      className="inline-flex h-11 items-stretch overflow-hidden rounded-[10px] border border-[#E7E7EA] bg-white dark:border-[#273244] dark:bg-[#111827]"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className={stepBtnClass}
        onClick={() => set(value - 1)}
        disabled={disabled || value <= min}
        aria-label="Una menos"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => set(Number(e.target.value))}
        onFocus={(e) => e.target.select()}
        aria-label={label}
        className="w-12 border-x border-[#E7E7EA] bg-transparent text-center text-[15px] font-semibold tabular-nums text-[#09090B] outline-none [appearance:textfield] focus:bg-[#F7F9FF] disabled:opacity-60 dark:border-[#273244] dark:text-[#F8FAFC] dark:focus:bg-[#151E32] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        className={stepBtnClass}
        onClick={() => set(value + 1)}
        disabled={disabled || value >= max}
        aria-label="Una más"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
