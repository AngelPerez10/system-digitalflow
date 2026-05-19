import { PencilIcon, TrashBinIcon } from "../../icons";

interface Props {
  tarea: any; idx: number; startIndex: number; formatDate: (d: string) => string;
  onDescripcion: (t: any) => void; onFotos: (t: any) => void;
  onEdit?: (t: any) => void; onDelete?: (t: any) => void; canEdit?: boolean; canDelete?: boolean;
}

export function MobileTareaCard({ tarea, idx: _i, startIndex: _si, formatDate, onDescripcion, onFotos, onEdit, onDelete, canEdit, canDelete }: Props) {
  const name = tarea.usuario_asignado_full_name || tarea.usuario_asignado_username || "—";
  const ini = name !== "—" ? String(name).slice(0, 1).toUpperCase() : "?";
  const fc = Array.isArray(tarea.fotos_urls) ? tarea.fotos_urls.length : 0;
  const id = tarea.id ?? _si + _i + 1;
  return (
    <article className="erp-mobile-task-card">
      <div className="erp-mobile-task-card__head">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-mono text-xs font-bold tabular-nums text-brand-600 dark:text-brand-400">#{id}</span>
            <time className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500" dateTime={tarea.fecha_creacion}>{formatDate(tarea.fecha_creacion)}</time>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300" aria-hidden>{ini}</span>
            <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{name}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 border-l border-slate-200 pl-1 dark:border-slate-800">
          <button type="button" onClick={() => onDescripcion(tarea)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-brand-600 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-brand-400" aria-label={`Descripción de tarea ${id}`}><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5V4a2 2 0 0 1 2-2h10l4 4v13.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /><path d="M14 2v4h4" /><path d="M8 10h8" /><path d="M8 14h8" /></svg></button>
          <button type="button" onClick={() => onFotos(tarea)} className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-brand-600 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-brand-400" aria-label={`Evidencia de tarea ${id}${fc ? `, ${fc} fotos` : ""}`}><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" /><circle cx="12" cy="13" r="3" /></svg>{fc > 0 && <span className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold leading-none text-white dark:bg-brand-500">{fc}</span>}</button>
          {canEdit && onEdit && <button type="button" onClick={() => onEdit(tarea)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-brand-600 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-brand-400" aria-label={`Editar tarea ${id}`}><PencilIcon className="h-5 w-5" aria-hidden /></button>}
          {canDelete && onDelete && <button type="button" onClick={() => onDelete(tarea)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/50 dark:hover:text-red-400" aria-label={`Eliminar tarea ${id}`}><TrashBinIcon className="h-5 w-5" aria-hidden /></button>}
        </div>
      </div>
      <div className="px-3 py-3"><p className="line-clamp-3 text-[13px] leading-snug text-slate-600 dark:text-slate-300">{String(tarea.descripcion || "—")}</p></div>
    </article>
  );
}

interface ListProps { tareas: any[]; startIndex: number; loading: boolean; formatDate: (d: string) => string; onDescripcion: (t: any) => void; onFotos: (t: any) => void; onEdit?: (t: any) => void; onDelete?: (t: any) => void; canEdit?: boolean; canDelete?: boolean; }

export function MobileTareaList({ tareas, startIndex, loading: _loading, formatDate, onDescripcion, onFotos, onEdit, onDelete, canEdit, canDelete }: ListProps) {
  return (
    <div className="space-y-3 md:hidden" aria-label="Listado de tareas">
      {tareas.map((tarea, idx) => (<MobileTareaCard key={tarea.id ?? idx} tarea={tarea} idx={idx} startIndex={startIndex} formatDate={formatDate} onDescripcion={onDescripcion} onFotos={onFotos} onEdit={onEdit} onDelete={onDelete} canEdit={canEdit} canDelete={canDelete} />))}
      {!_loading && tareas.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">Sin registros en esta vista.</p>}
    </div>
  );
}
