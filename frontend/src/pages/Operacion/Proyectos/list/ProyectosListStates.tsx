import { FolderPlus, SearchX } from "lucide-react";
import { btn } from "../shared/proyectoTokens";

const bone = "block rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]";

export function ProyectosTableSkeleton() {
  return (
    <div className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]" role="status" aria-label="Cargando proyectos">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-6 px-5 py-4" style={{ opacity: 1 - i * 0.13 }} aria-hidden>
          <div className="w-[24%] space-y-2">
            <span className={`${bone} h-3 w-16`} />
            <span className={`${bone} h-3.5 w-4/5`} />
          </div>
          <span className={`${bone} h-6 w-24`} />
          <span className={`${bone} h-3.5 w-20`} />
          <span className={`${bone} h-1.5 w-24`} />
          <span className={`${bone} ml-auto h-6 w-20`} />
        </div>
      ))}
    </div>
  );
}

export function ProyectosCardsSkeleton() {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Cargando proyectos">
      {Array.from({ length: 6 }, (_, i) => (
        <li
          key={i}
          className="space-y-4 rounded-[18px] border border-[#F0F0F2] p-4 dark:border-[#1F2A3C]"
          style={{ opacity: 1 - i * 0.12 }}
          aria-hidden
        >
          <div className="flex justify-between">
            <span className={`${bone} h-3 w-16`} />
            <span className={`${bone} h-5 w-20`} />
          </div>
          <span className={`${bone} h-4 w-3/4`} />
          <span className={`${bone} h-3 w-1/2`} />
          <span className={`${bone} h-1.5 w-full`} />
          <div className="flex justify-between pt-2">
            <span className={`${bone} h-6 w-16`} />
            <span className={`${bone} h-8 w-24`} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ProyectosEmptyState({
  filtered,
  tecnicoView,
  canCreate,
  onClear,
  onNew,
}: {
  /** Hay búsqueda o filtros activos. */
  filtered: boolean;
  tecnicoView: boolean;
  canCreate: boolean;
  onClear: () => void;
  onNew: () => void;
}) {
  const Icon = filtered ? SearchX : FolderPlus;
  return (
    <div className="cot-fade flex flex-col items-center px-6 py-16 text-center" role="status">
      <span className="cot-tick mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63]/70 dark:text-[#9BB6FF]">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="text-[16px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">
        {filtered
          ? "Ningún proyecto coincide"
          : tecnicoView
            ? "No tienes proyectos este mes"
            : "Aún no hay proyectos este mes"}
      </p>
      <p className="mt-1.5 max-w-sm text-[14px] leading-relaxed text-[#6E6E77] dark:text-[#8EA0B8]">
        {filtered
          ? "Prueba con otro término o quita algunos filtros."
          : tecnicoView
            ? "Cuando la oficina te asigne un proyecto aparecerá aquí. Revisa otros meses con las flechas de arriba."
            : "Crea un proyecto a partir de una cotización o cambia de mes con las flechas de arriba."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {filtered ? (
          <button type="button" className={btn.secondary} onClick={onClear}>
            Limpiar búsqueda y filtros
          </button>
        ) : canCreate ? (
          <button type="button" className={btn.primary} onClick={onNew}>
            <FolderPlus aria-hidden />
            Nuevo proyecto
          </button>
        ) : null}
      </div>
    </div>
  );
}
