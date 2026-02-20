import { PencilIcon, TrashBinIcon } from "../../../../icons";

const isGoogleMapsUrl = (value: string | null | undefined): boolean => {
  if (!value) return false;
  const s = String(value).trim();
  if (!s) return false;
  if (!(s.startsWith('http://') || s.startsWith('https://'))) return false;
  try {
    const u = new URL(s);
    const host = (u.hostname || '').toLowerCase();
    const href = u.href.toLowerCase();
    if (host === 'maps.app.goo.gl') return true;
    if (host.endsWith('google.com') && href.includes('/maps')) return true;
    return false;
  } catch {
    return false;
  }
};

interface MobileOrderCardProps {
  orden: any;
  idx: number;
  startIndex: number;
  formatDate: (date: string) => string;
  onPdf: (id: number) => void;
  onEdit?: (orden: any) => void;
  onDelete?: (orden: any) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  tecnicoNombre?: string;
}

export function MobileOrderCard({
  orden,
  idx,
  startIndex,
  formatDate,
  onPdf,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  tecnicoNombre,
}: MobileOrderCardProps) {
  const fechaInicio = orden.fecha_inicio || orden.fecha_creacion || '';
  const fechaInicioFmt = fechaInicio ? formatDate(fechaInicio) : '-';
  const fechaFinFmt = orden.fecha_finalizacion ? formatDate(orden.fecha_finalizacion) : '-';

  const folioDisplay = (orden?.folio ?? '').toString().trim() || (orden?.idx ?? (startIndex + idx + 1));

  return (
    <div className="bg-white dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-white/10 p-3 space-y-2">
      {/* Header: ID, Status, Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
            {folioDisplay}
          </span>
          -
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${orden.status === 'resuelto' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
            {orden.status === 'resuelto' ? 'Resuelto' : 'Pendiente'}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onPdf(orden.id)} className="p-1.5 text-gray-500 hover:text-red-600" title="PDF">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
          </button>
          {canEdit && onEdit && (
            <button onClick={() => onEdit(orden)} className="p-1.5 text-gray-500 hover:text-brand-600" title="Editar">
              <PencilIcon className="w-4 h-4" />
            </button>
          )}
          {canDelete && onDelete && (
            <button onClick={() => onDelete(orden)} className="p-1.5 text-gray-500 hover:text-red-600" title="Eliminar">
              <TrashBinIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Cliente */}
      <div className="flex items-center gap-2 text-sm">
        <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        <span className="font-medium text-gray-900 dark:text-white truncate">{orden.cliente || 'Sin cliente'}</span>
      </div>

      {/* Dirección */}
      {orden.direccion && (
        <div className="flex items-start gap-2 text-[11px] text-gray-600 dark:text-gray-400">
          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
          {isGoogleMapsUrl(orden.direccion) ? (
            <a href={orden.direccion} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline truncate">{orden.direccion}</a>
          ) : (
            <span className="truncate">{orden.direccion}</span>
          )}
        </div>
      )}

      {/* Teléfono */}
      {orden.telefono_cliente && (
        <div className="flex items-center gap-2 text-[11px]">
          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
          <a href={`tel:${orden.telefono_cliente}`} className="text-blue-600 dark:text-blue-400">{orden.telefono_cliente}</a>
        </div>
      )}

      {/* Fechas y Técnico */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          <span>Inicio: {fechaInicioFmt}</span>
        </div>
        <div className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          <span>Fin: {fechaFinFmt}</span>
        </div>
        {tecnicoNombre && (
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
            <span className="truncate">{tecnicoNombre}</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface MobileOrderListProps {
  ordenes: any[];
  startIndex: number;
  loading: boolean;
  formatDate: (date: string) => string;
  onPdf: (id: number) => void;
  onEdit?: (orden: any) => void;
  onDelete?: (orden: any) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  usuarios?: any[];
}

export function MobileOrderList({
  ordenes,
  startIndex,
  loading,
  formatDate,
  onPdf,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  usuarios = [],
}: MobileOrderListProps) {
  const getTecnicoNombre = (orden: any): string => {
    const tecnico = usuarios.find((u: any) => u.id === orden.tecnico_asignado);
    if (tecnico) {
      return tecnico.first_name && tecnico.last_name 
        ? `${tecnico.first_name} ${tecnico.last_name}` 
        : (tecnico.username || tecnico.email);
    }
    if (orden.tecnico_asignado_full_name) return orden.tecnico_asignado_full_name;
    if (orden.tecnico_asignado_username) return orden.tecnico_asignado_username;
    if (orden.nombre_encargado) return orden.nombre_encargado;
    return '';
  };

  return (
    <div className="md:hidden space-y-2">
      {ordenes.map((orden, idx) => (
        <MobileOrderCard
          key={orden.id ?? idx}
          orden={orden}
          idx={idx}
          startIndex={startIndex}
          formatDate={formatDate}
          onPdf={onPdf}
          onEdit={onEdit}
          onDelete={onDelete}
          canEdit={canEdit}
          canDelete={canDelete}
          tecnicoNombre={getTecnicoNombre(orden)}
        />
      ))}
      {!loading && ordenes.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          Sin ordenes
        </div>
      )}
    </div>
  );
}
