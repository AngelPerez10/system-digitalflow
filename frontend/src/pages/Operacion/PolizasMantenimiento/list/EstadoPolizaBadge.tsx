import type { PolizaEstado } from "./polizaListTypes";
import { estadoPolizaLabel } from "./polizaDemoData";

// Mismos íconos y colores que PolizasPageStats (Vigentes/Próxima visita/Vencidas):
// el badge de la tabla reutiliza el lenguaje visual que el sistema ya tiene un
// nivel arriba, en vez de quedarse en una pastilla de solo texto.
const CONFIG: Record<
  PolizaEstado,
  { badge: string; icon: JSX.Element }
> = {
  vigente: {
    badge:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/[0.12] dark:text-emerald-300",
    icon: (
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
        <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  proxima_visita: {
    badge:
      "bg-amber-100 text-amber-800 dark:bg-amber-500/[0.12] dark:text-amber-200",
    icon: (
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  vencida: {
    badge:
      "bg-rose-100 text-rose-800 dark:bg-rose-500/[0.14] dark:text-rose-300",
    icon: (
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
        <path
          d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
};

export function EstadoPolizaBadge({ estado }: { estado: PolizaEstado }) {
  const { badge, icon } = CONFIG[estado];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge}`}
    >
      {icon}
      {estadoPolizaLabel(estado)}
    </span>
  );
}
