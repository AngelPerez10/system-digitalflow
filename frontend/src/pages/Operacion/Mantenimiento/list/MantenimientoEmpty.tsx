import { Plus, SearchX, Wrench } from "lucide-react";
import { btn } from "../../Proyectos/shared/proyectoTokens";

/** Vacío del listado: «sin coincidencias» con filtros, o «aún no hay registros». */
export function MantenimientoEmpty({
  filtered,
  canCreate,
  onClear,
  onNew,
}: {
  filtered: boolean;
  canCreate: boolean;
  onClear: () => void;
  onNew: () => void;
}) {
  const Icon = filtered ? SearchX : Wrench;
  return (
    <div className="cot-fade flex flex-col items-center px-6 py-16 text-center" role="status">
      <span className="cot-tick mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63]/70 dark:text-[#9BB6FF]">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="text-[16px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">
        {filtered ? "Nada coincide" : "Aún no hay pólizas ni reportes"}
      </p>
      <p className="mt-1.5 max-w-sm text-[14px] leading-relaxed text-[#6E6E77] dark:text-[#8EA0B8]">
        {filtered
          ? "Prueba con otro término o quita algunos filtros."
          : canCreate
            ? "Crea una póliza de mantenimiento o un reporte de servicio con el botón «Nuevo»."
            : "Cuando se registre una póliza o un reporte aparecerá aquí."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {filtered ? (
          <button type="button" className={btn.secondary} onClick={onClear}>
            Limpiar búsqueda y filtros
          </button>
        ) : canCreate ? (
          <button type="button" className={btn.primary} onClick={onNew}>
            <Plus aria-hidden />
            Nuevo
          </button>
        ) : null}
      </div>
    </div>
  );
}
