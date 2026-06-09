import type { Orden } from './ordenesPageTypes';

export const LIMITED_ORDEN_EDIT_FIELDS = [
  'problematica',
  'status',
  'fecha_inicio',
  'hora_inicio',
  'fecha_finalizacion',
  'hora_termino',
  'fotos_urls',
  'fotos_extra_max',
] as const;

export type OrdenEditableField =
  | (typeof LIMITED_ORDEN_EDIT_FIELDS)[number]
  | 'folio'
  | 'cliente'
  | 'cliente_id'
  | 'nombre_cliente'
  | 'tecnico_asignado'
  | 'quien_instalo'
  | 'quien_entrego'
  | 'telefono_cliente'
  | 'direccion'
  | 'servicios_realizados'
  | 'comentario_tecnico'
  | 'firma_cliente_url'
  | 'prioridad'
  | 'nombre_encargado';

export function getOrdenOwnerUserId(orden: Orden | null | undefined): number | null {
  if (!orden) return null;
  const raw = (orden as { creado_por?: number | null }).creado_por;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  return null;
}

export function isOrdenOwnedByUser(
  orden: Orden | null | undefined,
  userId: number | null | undefined,
): boolean {
  if (!orden || userId == null) return false;
  const tecnicoId = orden.tecnico_asignado != null ? Number(orden.tecnico_asignado) : null;
  const creadoId = getOrdenOwnerUserId(orden);
  return tecnicoId === userId || creadoId === userId;
}

export function isOrdenLimitedEdit({
  orden,
  userId,
  isAdmin,
  canEdit,
}: {
  orden: Orden | null | undefined;
  userId: number | null | undefined;
  isAdmin: boolean;
  canEdit: boolean;
}): boolean {
  if (!canEdit || !orden || isAdmin) return false;
  return !isOrdenOwnedByUser(orden, userId);
}

export function isOrdenFieldEditable(
  field: OrdenEditableField,
  {
    isReadOnly,
    isLimitedEdit,
  }: {
    isReadOnly: boolean;
    isLimitedEdit: boolean;
  },
): boolean {
  if (isReadOnly) return false;
  if (!isLimitedEdit) return true;
  return (LIMITED_ORDEN_EDIT_FIELDS as readonly string[]).includes(field);
}

export function isOrdenFieldReadOnly(
  field: OrdenEditableField,
  scope: { isReadOnly: boolean; isLimitedEdit: boolean },
): boolean {
  return !isOrdenFieldEditable(field, scope);
}

export function ordenInputLockedClass(
  field: OrdenEditableField,
  scope: { isReadOnly: boolean; isLimitedEdit: boolean },
): string {
  return isOrdenFieldReadOnly(field, scope)
    ? 'bg-gray-100 text-gray-600 cursor-not-allowed dark:bg-gray-800/50 dark:text-gray-400'
    : 'bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200 focus:border-[#ff801f] focus:ring-2 focus:ring-[#ff801f]/20 dark:focus:border-[#fb923c] dark:focus:ring-[#fb923c]/20';
}
