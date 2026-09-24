/**
 * Ubicación física del producto: Exhibición o Almacén.
 * `UbicacionPicker` es un grupo de radio con dos opciones grandes (táctil);
 * `UbicacionBadge` la muestra en tablas y listas.
 */
import { Store, Warehouse } from "lucide-react";
import type { InventarioUbicacion } from "../shared/inventarioTypes";
import { UBICACIONES, UBICACION_LABEL } from "../shared/precioMercado";

const ICON = { exhibicion: Store, almacen: Warehouse } as const;

type PickerProps = {
  value: InventarioUbicacion | "";
  onChange: (v: InventarioUbicacion) => void;
  /** Nombre accesible del grupo. */
  label: string;
  disabled?: boolean;
  /** Borde rojo cuando falta elegir y ya se intentó continuar. */
  invalid?: boolean;
  size?: "md" | "sm";
};

export function UbicacionPicker({ value, onChange, label, disabled, invalid, size = "md" }: PickerProps) {
  const sm = size === "sm";
  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-invalid={invalid || undefined}
      className={`grid grid-cols-2 gap-1 rounded-[12px] border p-1 transition-colors duration-150 ${
        invalid
          ? "border-[#E8A5A5] bg-[#FEF2F2] dark:border-[#7F1D1D] dark:bg-[#3F1518]"
          : "border-[#E7E7EA] bg-[#F4F4F5] dark:border-[#273244] dark:bg-[#0F172A]"
      }`}
    >
      {UBICACIONES.map((u) => {
        const on = value === u;
        const Icon = ICON[u];
        return (
          <button
            key={u}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(u)}
            className={`inline-flex items-center justify-center gap-1.5 rounded-[9px] font-semibold transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 disabled:cursor-not-allowed disabled:opacity-60 ${
              sm ? "h-9 px-2.5 text-[12.5px]" : "h-11 px-3 text-[14px]"
            } ${
              on
                ? u === "exhibicion"
                  ? "bg-white text-[#1244D1] shadow-[0_1px_3px_rgba(9,9,11,0.12)] dark:bg-[#1B2A63] dark:text-[#C7D5FF]"
                  : "bg-white text-[#8A5D0F] shadow-[0_1px_3px_rgba(9,9,11,0.12)] dark:bg-[rgba(230,162,60,0.18)] dark:text-[#E6A23C]"
                : "text-[#6E6E77] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:text-[#F8FAFC]"
            }`}
          >
            <Icon className={sm ? "size-3.5" : "size-4"} aria-hidden />
            {UBICACION_LABEL[u]}
          </button>
        );
      })}
    </div>
  );
}

export function UbicacionBadge({ value }: { value: InventarioUbicacion | "" | null | undefined }) {
  if (!value) {
    return (
      <span className="inline-flex h-5 items-center rounded-full border border-dashed border-[#D4D4D8] px-2 text-[10.5px] font-medium text-[#A1A1AA] dark:border-[#3A4661] dark:text-[#64748B]">
        Sin ubicación
      </span>
    );
  }
  const Icon = ICON[value];
  return (
    <span
      className={`inline-flex h-5 items-center gap-1 rounded-full px-2 text-[10.5px] font-semibold ${
        value === "exhibicion"
          ? "bg-[rgba(27,92,255,0.08)] text-[#1244D1] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#9BB6FF]"
          : "bg-[rgba(230,162,60,0.16)] text-[#8A5D0F] dark:text-[#E6A23C]"
      }`}
    >
      <Icon className="size-3" aria-hidden />
      {UBICACION_LABEL[value]}
    </span>
  );
}
