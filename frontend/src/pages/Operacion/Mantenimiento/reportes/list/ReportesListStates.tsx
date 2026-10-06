import { AlertTriangle, FilePlus2, RotateCw, SearchX } from "lucide-react";
import { btn } from "../../../Proyectos/shared/proyectoTokens";

const bone = "block rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]";

export function ReportesTableSkeleton() {
  return (
    <div className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]" role="status" aria-label="Cargando reportes">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-6 px-5 py-4" style={{ opacity: 1 - i * 0.13 }} aria-hidden>
          <div className="w-[28%] space-y-2">
            <span className={`${bone} h-3 w-16`} />
            <span className={`${bone} h-3.5 w-4/5`} />
          </div>
          <span className={`${bone} size-6`} />
          <span className={`${bone} h-3.5 w-20`} />
          <span className={`${bone} h-6 w-36`} />
          <span className={`${bone} ml-auto h-8 w-24`} />
        </div>
      ))}
    </div>
  );
}

export function ReportesCardsSkeleton() {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Cargando reportes">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="space-y-4 overflow-hidden rounded-[18px] border border-[#F0F0F2] p-4 dark:border-[#1F2A3C]" style={{ opacity: 1 - i * 0.12 }} aria-hidden>
          <span className="-mx-4 -mt-4 block aspect-[32/10] bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
          <div className="flex justify-between">
            <span className={`${bone} h-3 w-16`} />
            <span className={`${bone} h-3 w-20`} />
          </div>
          <span className={`${bone} h-4 w-3/4`} />
          <span className={`${bone} h-3 w-1/2`} />
          <div className="flex justify-between pt-2">
            <span className={`${bone} size-6`} />
            <span className={`${bone} h-8 w-24`} />
          </div>
        </li>
      ))}
    </ul>
  );
}

type EmptyProps = {
  /** Hay búsqueda o filtros activos. */
  filtered: boolean;
  /** No existe ningún reporte en ningún mes. */
  sinReportes: boolean;
  canCreate: boolean;
  onClear: () => void;
  onNew: () => void;
};

export function ReportesEmptyState({ filtered, sinReportes, canCreate, onClear, onNew }: EmptyProps) {
  const Icon = filtered ? SearchX : FilePlus2;
  return (
    <div className="cot-fade flex flex-col items-center px-6 py-16 text-center" role="status">
      <span className="cot-tick mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63]/70 dark:text-[#9BB6FF]">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="text-[16px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">
        {filtered ? "Ningún reporte coincide" : sinReportes ? "Aún no hay reportes" : "Aún no hay reportes este mes"}
      </p>
      <p className="mt-1.5 max-w-sm text-[14px] leading-relaxed text-[#6E6E77] dark:text-[#8EA0B8]">
        {filtered
          ? "Prueba con otro término o quita algunos filtros."
          : canCreate
            ? "Vincula un proyecto, captura las fotos de Antes y Después y genera el PDF. También puedes cambiar de mes con las flechas de arriba."
            : "Cuando se registre un reporte aparecerá aquí. Revisa otros meses con las flechas de arriba."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {filtered ? (
          <button type="button" className={btn.secondary} onClick={onClear}>
            Limpiar búsqueda y filtros
          </button>
        ) : canCreate ? (
          <button type="button" className={btn.primary} onClick={onNew}>
            <FilePlus2 aria-hidden />
            Nuevo reporte
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ReportesErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="cot-fade flex flex-col items-center px-6 py-16 text-center" role="alert">
      <span className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-[#FEF2F2] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]">
        <AlertTriangle className="size-6" aria-hidden />
      </span>
      <p className="text-[16px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">No se pudo cargar el listado</p>
      <p className="mt-1.5 max-w-sm text-[14px] leading-relaxed text-[#6E6E77] dark:text-[#8EA0B8]">{message}</p>
      <button type="button" className={`${btn.primary} mt-5`} onClick={onRetry}>
        <RotateCw aria-hidden />
        Reintentar
      </button>
    </div>
  );
}
