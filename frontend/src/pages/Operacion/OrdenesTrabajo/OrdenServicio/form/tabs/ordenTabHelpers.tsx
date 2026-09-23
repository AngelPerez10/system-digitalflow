import type { ReactNode } from "react";
import type { OrdenEditableField } from "../../shared/ordenEditScope";

export type OrdenFieldKey = OrdenEditableField;

/**
 * Tarjeta de bloque dentro de los pasos del modal de orden: encabezado con
 * ícono en mosaico + título + descripción, y cuerpo con los campos.
 * Las etiquetas de campo se normalizan a 13 px / 500 para todo el formulario.
 */
export function OrdenFormSection({
  title,
  description,
  children,
  icon,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-[0_1px_2px_rgba(9,9,11,0.04)] dark:border-[#273244] dark:bg-[#111827]">
      <header className="flex items-center gap-3 border-b border-[#F0F0F2] px-5 py-4 dark:border-[#1F2A3C]">
        {icon ? (
          <span
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63] dark:text-[#9BB6FF] [&_svg]:size-[18px]"
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-[13px] leading-snug text-[#71717A] dark:text-[#8EA0B8]">{description}</p>
          ) : null}
        </div>
      </header>
      <div className="space-y-5 px-5 py-5 [&_label.block]:mb-1.5! [&_label.block]:text-[13px]! [&_label.block]:font-medium! [&_label.block]:text-[#3F3F46]! dark:[&_label.block]:text-[#B7C1D1]!">
        {children}
      </div>
    </section>
  );
}

/** Asterisco rojo para campos obligatorios (mismo estilo que NuevaCotizacionPage). */
export function RequiredMark() {
  return (
    <span className="text-[#C22B2B] dark:text-[#F87171]" aria-hidden>
      {" "}
      *
    </span>
  );
}

export function ClearSelectionButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Limpiar selección"
      className="mt-[20px] inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden
      >
        <path d="M7 21l-4.3-4.3c-1-1-1-2.5 0-3.4l9.9-9.9c1-1 2.5-1 3.4 0l4.3 4.3c1 1 1 2.5 0 3.4L10.5 21H22" />
        <path d="M18 11l-4.3-4.3" />
      </svg>
    </button>
  );
}

export function openDireccionInMaps(direccion: string) {
  const trimmed = direccion.trim();
  if (trimmed.includes("google.com/maps") || trimmed.includes("maps.app.goo.gl")) {
    window.open(trimmed, "_blank");
    return;
  }
  const coordMatch = trimmed.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (coordMatch) {
    window.open(`https://www.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}`, "_blank");
    return;
  }
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`, "_blank");
}

export function tecnicoDisplayLabel(
  usuarios: { id: number; first_name: string; last_name: string; email: string }[],
  tecnicoId: number | null | undefined
): string {
  if (!tecnicoId) return "";
  const u = usuarios.find((row) => row.id === Number(tecnicoId));
  if (!u) return "";
  return u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email;
}
