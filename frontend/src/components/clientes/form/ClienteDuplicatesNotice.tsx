import { TriangleAlert } from "lucide-react";
import type { Cliente } from "@/types/cliente";

type Props = {
  matches: Cliente[];
  onEditExisting: (cliente: Cliente) => void;
};

export function ClienteDuplicatesNotice({ matches, onEditExisting }: Props) {
  if (matches.length === 0) return null;
  return (
    <div
      role="alert"
      className="cot-pop overflow-hidden rounded-[16px] border border-[#E7E7EA] bg-white shadow-[0_1px_3px_rgba(9,9,11,0.05)] dark:border-[#273244] dark:bg-[#161f33]"
    >
      <div className="flex items-start gap-3 border-l-2 border-l-[#E6A23C] px-4 py-3.5 sm:px-5">
        <TriangleAlert className="mt-px size-5 shrink-0 text-[#B4801F] dark:text-[#E6A23C]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold leading-[1.35] text-[#09090B] dark:text-[#F8FAFC]">
            Posible contacto duplicado
          </p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-[#6E6E77] dark:text-[#8EA0B8]">
            {matches.length === 1
              ? "Encontramos un registro con datos parecidos."
              : `Encontramos ${matches.length} registros con datos parecidos.`}{" "}
            Revísalos antes de guardar para no duplicar al cliente.
          </p>
        </div>
      </div>
      <ul className="divide-y divide-[#EFEFF1] dark:divide-[#232e45]">
        {matches.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-[#09090B] dark:text-[#F8FAFC]">{m.nombre}</p>
              <p className="truncate text-[11.5px] text-[#6E6E77] dark:text-[#8EA0B8]">
                {[m.telefono, m.ciudad].filter(Boolean).join(" · ") || "Sin más datos capturados"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onEditExisting(m)}
              className="shrink-0 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-[#1244D1] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/35 dark:text-[#7FA2FF]"
            >
              Editar este
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
