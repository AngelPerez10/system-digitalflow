import type { OrdenEditableField } from "../../shared/ordenEditScope";

export type OrdenFieldKey = OrdenEditableField;

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
