import { PencilIcon, TrashBinIcon } from "../../icons";

/* --------------------------------------------------------------------------
   Antes usaba `erp-mobile-task-card` / `erp-mobile-task-card__head`: clases
   sin definición en ningún CSS, así que en móvil estas tarjetas se veían sin
   estilo alguno. Se reescriben en línea, en el mismo sistema marino + dorado
   + azul eléctrico de `MiEscritorio/Tareas`.
   -------------------------------------------------------------------------- */

interface Props {
  tarea: any; idx: number; startIndex: number; formatDate: (d: string) => string;
  onDescripcion: (t: any) => void; onFotos: (t: any) => void;
  onEdit?: (t: any) => void; onDelete?: (t: any) => void; canEdit?: boolean; canDelete?: boolean;
}

const iconSvgProps = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function MobileTareaCard({ tarea, idx: _i, startIndex: _si, formatDate, onDescripcion, onFotos, onEdit, onDelete, canEdit, canDelete }: Props) {
  const name = tarea.usuario_asignado_full_name || tarea.usuario_asignado_username || "—";
  const ini = name !== "—" ? String(name).slice(0, 1).toUpperCase() : "?";
  const fc = Array.isArray(tarea.fotos_urls) ? tarea.fotos_urls.length : 0;
  const id = tarea.id ?? _si + _i + 1;
  return (
    <article className="rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#1B2539]">
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-mono text-[11px] font-bold tabular-nums text-[#1B5CFF] dark:text-[#4B7CFF]">#{id}</span>
            <time className="text-[10px] font-medium uppercase tracking-wide text-[#A1A1AA] dark:text-[#8EA0B8]" dateTime={tarea.fecha_creacion}>
              {formatDate(tarea.fecha_creacion)}
            </time>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[rgba(230,162,60,0.16)] text-[12px] font-bold text-[#9A6B15] dark:text-[#E6A23C]"
              aria-hidden
            >
              {ini}
            </span>
            <span className="truncate text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{name}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 border-l border-[#E7E7EA] pl-1 dark:border-[#273244]">
          <button
            type="button"
            onClick={() => onDescripcion(tarea)}
            className="inline-flex size-10 items-center justify-center rounded-[10px] text-[#6E6E77] transition-colors hover:bg-white hover:text-[#1B5CFF] dark:text-[#8EA0B8] dark:hover:bg-[#111827] dark:hover:text-[#4B7CFF]"
            aria-label={`Descripción de tarea ${id}`}
          >
            <svg {...iconSvgProps} className="size-5">
              <path d="M4 19.5V4a2 2 0 0 1 2-2h10l4 4v13.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
              <path d="M14 2v4h4" />
              <path d="M8 10h8M8 14h8" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onFotos(tarea)}
            className="relative inline-flex size-10 items-center justify-center rounded-[10px] text-[#6E6E77] transition-colors hover:bg-white hover:text-[#1B5CFF] dark:text-[#8EA0B8] dark:hover:bg-[#111827] dark:hover:text-[#4B7CFF]"
            aria-label={`Evidencia de tarea ${id}${fc ? `, ${fc} fotos` : ""}`}
          >
            <svg {...iconSvgProps} className="size-5">
              <path d="M4 7a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
            {fc > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#1B5CFF] px-1 text-[10px] font-bold leading-none text-white dark:bg-[#4B7CFF]">
                {fc}
              </span>
            )}
          </button>
          {canEdit && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(tarea)}
              className="inline-flex size-10 items-center justify-center rounded-[10px] text-[#6E6E77] transition-colors hover:bg-white hover:text-[#1B5CFF] dark:text-[#8EA0B8] dark:hover:bg-[#111827] dark:hover:text-[#4B7CFF]"
              aria-label={`Editar tarea ${id}`}
            >
              <PencilIcon className="size-5" aria-hidden />
            </button>
          )}
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(tarea)}
              className="inline-flex size-10 items-center justify-center rounded-[10px] text-[#6E6E77] transition-colors hover:bg-[#FEF2F2] hover:text-[#C22B2B] dark:text-[#8EA0B8] dark:hover:bg-[#3F1518] dark:hover:text-[#F87171]"
              aria-label={`Eliminar tarea ${id}`}
            >
              <TrashBinIcon className="size-5" aria-hidden />
            </button>
          )}
        </div>
      </div>
      <div className="border-t border-[#E7E7EA] px-3 py-3 dark:border-[#273244]">
        <p className="line-clamp-3 text-[13px] leading-snug text-[#52525B] dark:text-[#B7C1D1]">
          {String(tarea.descripcion || "—")}
        </p>
      </div>
    </article>
  );
}

interface ListProps { tareas: any[]; startIndex: number; loading: boolean; formatDate: (d: string) => string; onDescripcion: (t: any) => void; onFotos: (t: any) => void; onEdit?: (t: any) => void; onDelete?: (t: any) => void; canEdit?: boolean; canDelete?: boolean; }

export function MobileTareaList({ tareas, startIndex, loading: _loading, formatDate, onDescripcion, onFotos, onEdit, onDelete, canEdit, canDelete }: ListProps) {
  return (
    <div className="space-y-2.5 md:hidden" aria-label="Listado de tareas">
      {tareas.map((tarea, idx) => (
        <MobileTareaCard
          key={tarea.id ?? idx}
          tarea={tarea}
          idx={idx}
          startIndex={startIndex}
          formatDate={formatDate}
          onDescripcion={onDescripcion}
          onFotos={onFotos}
          onEdit={onEdit}
          onDelete={onDelete}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      ))}
      {!_loading && tareas.length === 0 && (
        <p className="rounded-[16px] border border-dashed border-[#D3D3D8] bg-white py-10 text-center text-[14px] text-[#6E6E77] dark:border-[#3A4661] dark:bg-[#111827] dark:text-[#8EA0B8]">
          Sin registros en esta vista.
        </p>
      )}
    </div>
  );
}
