/**
 * Modelo de Gestión de usuarios: tipos, reglas de permisos y utilidades puras.
 * Sin JSX ni estado: todo lo que aquí vive se puede probar de forma aislada.
 */
import { fetchApi } from '@/config/api';

export type Role = 'admin' | 'tecnico';

export type CrudPerms = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  own_only?: boolean;
  /** Solo órdenes/proyectos: puede marcar/desmarcar "Liquidado" (ver LIQUIDABLE_MODULES). */
  liquidar?: boolean;
  /**
   * Solo órdenes/proyectos: puede cambiar el status operativo.
   * Independiente de liquidar: si solo tiene liquidar, no mueve el status.
   */
  cambiar_status?: boolean;
};

export type UserSignaturePayload = {
  user: number;
  url: string;
  public_id: string;
  updated_at: string;
};

export type PermissionsPayload = {
  ordenes?: Partial<CrudPerms>;
  proyectos?: Partial<CrudPerms>;
  inventario?: Partial<CrudPerms>;
  clientes?: Partial<CrudPerms>;
  productos?: Partial<CrudPerms>;
  servicios?: Partial<CrudPerms>;
  cotizaciones?: Partial<CrudPerms>;
  tareas?: Partial<CrudPerms>;
  usuarios?: Partial<CrudPerms>;
  reportes?: Partial<CrudPerms>;
  cuentas_antarix?: Partial<CrudPerms>;
  polizas?: Partial<CrudPerms>;
  reportes_mantenimiento?: Partial<CrudPerms>;
};

export type ModuleKey = keyof Required<PermissionsPayload>;

export type UserAccount = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active?: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  password_enabled?: boolean;
  role?: Role;
  smtp_email?: string;
  smtp_configured?: boolean;
  avatar_url?: string;
};

export type UserFormValues = {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  password: string;
  password2: string;
  smtp_email: string;
  smtp_password: string;
};

export const emptyUserForm: UserFormValues = {
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  role: 'tecnico',
  password: '',
  password2: '',
  smtp_email: '',
  smtp_password: '',
};

/** Usuarios que pueden asignar permisos (ver/crear/editar/eliminar) a otros, incluidos administradores. */
export const PERMISSION_DELEGATION_USERNAMES = new Set(['angelperez10', 'ivancruz01']);

export const isProtectedPrincipalUsername = (username: string): boolean =>
  PERMISSION_DELEGATION_USERNAMES.has((username || '').trim().toLowerCase());

export const isAdminUser = (u: UserAccount) => {
  const explicitRole = String(u.role ?? '').trim().toLowerCase();
  return explicitRole === 'admin' || !!u.is_superuser || !!u.is_staff;
};

export const displayName = (u: UserAccount) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;

export const initialsOf = (u: UserAccount) =>
  (`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'U';

export const errorMessage = (e: unknown) => (e instanceof Error && e.message) || 'Error';

/* --------------------------------------------------------------------------
   Permisos
   -------------------------------------------------------------------------- */

export const normalizePerms = (
  p: PermissionsPayload | null | undefined,
  options?: { isAdmin?: boolean },
): Required<PermissionsPayload> => {
  const isAdmin = !!options?.isAdmin;
  const base: Required<PermissionsPayload> = {
    ordenes: {
      view: true, create: false, edit: false, delete: false,
      own_only: isAdmin ? false : true, liquidar: false, cambiar_status: false,
    },
    proyectos: {
      view: false, create: false, edit: false, delete: false,
      own_only: isAdmin ? false : true, liquidar: false, cambiar_status: false,
    },
    inventario: { view: false, create: false, edit: false, delete: false },
    clientes: { view: true, create: false, edit: false, delete: false },
    productos: { view: true, create: false, edit: false, delete: false },
    servicios: { view: true, create: false, edit: false, delete: false },
    cotizaciones: { view: true, create: false, edit: false, delete: false, own_only: false },
    tareas: { view: true, create: false, edit: false, delete: false },
    usuarios: { view: true, create: false, edit: false, delete: false },
    reportes: { view: true, create: true, edit: false, delete: false },
    cuentas_antarix: { view: false, create: false, edit: false, delete: false },
    polizas: { view: false, create: false, edit: false, delete: false },
    reportes_mantenimiento: {
      view: false,
      create: false,
      edit: false,
      delete: false,
      own_only: isAdmin ? false : true,
    },
  };
  const safe = (v: unknown) => (typeof v === 'boolean' ? v : undefined);
  const mergeCrud = (dst: Partial<CrudPerms>, src: Partial<CrudPerms> | undefined): Partial<CrudPerms> => {
    if (!src || typeof src !== 'object') return dst;
    return {
      view: safe(src.view) ?? dst.view,
      create: safe(src.create) ?? dst.create,
      edit: safe(src.edit) ?? dst.edit,
      delete: safe(src.delete) ?? dst.delete,
      own_only: safe(src.own_only) ?? dst.own_only,
      liquidar: safe(src.liquidar) ?? dst.liquidar,
      cambiar_status: safe(src.cambiar_status) ?? dst.cambiar_status,
    };
  };
  const out = {} as Required<PermissionsPayload>;
  (Object.keys(base) as ModuleKey[]).forEach((k) => {
    out[k] = mergeCrud(base[k], p?.[k]);
  });
  return out;
};

export const seedAdminPerms = async (userId: number) => {
  const full: Required<PermissionsPayload> = {
    ordenes: { view: true, create: true, edit: true, delete: true, own_only: false },
    proyectos: { view: true, create: true, edit: true, delete: true, own_only: false },
    inventario: { view: true, create: true, edit: true, delete: true },
    clientes: { view: true, create: true, edit: true, delete: true },
    productos: { view: true, create: true, edit: true, delete: true },
    servicios: { view: true, create: true, edit: true, delete: true },
    cotizaciones: { view: true, create: true, edit: true, delete: true, own_only: false },
    tareas: { view: true, create: true, edit: true, delete: true },
    usuarios: { view: true, create: true, edit: true, delete: true },
    reportes: { view: true, create: true, edit: true, delete: true },
    cuentas_antarix: { view: true, create: true, edit: true, delete: true },
    polizas: { view: true, create: true, edit: true, delete: true },
    reportes_mantenimiento: { view: true, create: true, edit: true, delete: true, own_only: false },
  };
  const res = await fetchApi(`/api/users/accounts/${userId}/permissions/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permissions: full }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || 'No se pudieron guardar permisos por defecto');
};

export type PermissionSectionKey =
  | 'escritorio'
  | 'contactos'
  | 'productos_servicios'
  | 'ventas'
  | 'operaciones'
  | 'configuracion';

export type PermissionSection = {
  key: PermissionSectionKey;
  /** Nombre del menú del panel donde vive cada vista. */
  menu: string;
  modules: { key: ModuleKey; label: string }[];
};

const BASE_SECTIONS: PermissionSection[] = [
  { key: 'escritorio', menu: 'Mi escritorio', modules: [{ key: 'tareas', label: 'Tareas' }] },
  { key: 'contactos', menu: 'Contactos de negocio', modules: [{ key: 'clientes', label: 'Clientes' }] },
  {
    key: 'productos_servicios',
    menu: 'Productos y servicios',
    modules: [
      { key: 'productos', label: 'Productos' },
      { key: 'servicios', label: 'Servicios' },
    ],
  },
  { key: 'ventas', menu: 'Ventas', modules: [{ key: 'cotizaciones', label: 'Cotizaciones' }] },
  {
    key: 'operaciones',
    menu: 'Operación',
    modules: [
      { key: 'ordenes', label: 'Órdenes de servicio' },
      { key: 'proyectos', label: 'Proyectos' },
      { key: 'inventario', label: 'Inventario' },
      { key: 'reportes', label: 'Reportes semanales' },
      { key: 'cuentas_antarix', label: 'Cuentas Antarix GPS' },
      { key: 'polizas', label: 'Póliza de mantenimiento' },
      { key: 'reportes_mantenimiento', label: 'Reporte de mantenimiento' },
    ],
  },
];

/** Los técnicos no ven el menú Configuración (Usuarios). */
export const permissionSectionsFor = (isAdmin: boolean): PermissionSection[] =>
  isAdmin
    ? [...BASE_SECTIONS, { key: 'configuracion', menu: 'Configuración', modules: [{ key: 'usuarios', label: 'Usuarios' }] }]
    : BASE_SECTIONS;

/**
 * Módulos con alcance: `own_only = true` → solo ve sus propios registros;
 * `false` → ve los de todo el equipo. (Misma semántica en los cuatro.)
 */
export const SCOPED_MODULES = new Set<ModuleKey>(['ordenes', 'proyectos', 'reportes_mantenimiento', 'cotizaciones']);

/**
 * Módulos con permisos especiales (Liquidar / Cambiar status), fuera de la
 * matriz Ver/Crear/Editar/Eliminar — ver UserPermissionsModal.
 */
export const LIQUIDABLE_MODULES = new Set<ModuleKey>(['ordenes', 'proyectos']);
/** Alias semántico: mismos módulos admiten `cambiar_status`. */
export const STATUSABLE_MODULES = LIQUIDABLE_MODULES;

export type PermAction = 'view' | 'create' | 'edit' | 'delete';

export const PERM_ACTIONS: { key: PermAction; label: string }[] = [
  { key: 'view', label: 'Ver' },
  { key: 'create', label: 'Crear' },
  { key: 'edit', label: 'Editar' },
  { key: 'delete', label: 'Eliminar' },
];

/**
 * Acciones que el guardado anula para técnicos (ver `save` en el modal):
 * se muestran bloqueadas para no prometer algo que no se aplica.
 */
export const lockedForTecnico = (key: ModuleKey, action: PermAction) => key === 'reportes' && action === 'delete';

/**
 * Cambio coherente de una casilla: las acciones requieren «Ver», y quitar
 * «Ver» quita las acciones (y los flags especiales liquidar / cambiar_status).
 */
export const applyPermChange = (cur: CrudPerms, action: PermAction, value: boolean): CrudPerms => {
  if (action === 'view') {
    return value
      ? { ...cur, view: true }
      : {
          ...cur,
          view: false,
          create: false,
          edit: false,
          delete: false,
          liquidar: false,
          cambiar_status: false,
        };
  }
  return { ...cur, [action]: value, view: value ? true : cur.view };
};

/**
 * ¿Puede cambiar el status operativo del módulo? Espejo de
 * `user_can_change_module_status` + la puerta de `edit` en la UI:
 * - `cambiar_status` → sí (incluso sin `edit`; va por ruta dedicada).
 * - `liquidar` sin `cambiar_status` → no, aunque tenga `edit`.
 * - sin `liquidar` → sí solo si tiene `edit` (flujo normal).
 */
export function moduleAllowsStatusChange(
  modulePerms: Pick<CrudPerms, 'liquidar' | 'cambiar_status'> | null | undefined,
  canEdit: boolean,
): boolean {
  if (modulePerms?.cambiar_status === true) return true;
  if (modulePerms?.liquidar === true) return false;
  return canEdit;
}

/* --------------------------------------------------------------------------
   Contraseñas y validación
   -------------------------------------------------------------------------- */

export const generatePassword = (username: string, firstName: string, lastName: string) => {
  const avoid = new Set(
    [username, firstName, lastName].map((s) => (s || '').toLowerCase().trim()).filter(Boolean),
  );

  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%*_-+=';
  const all = upper + lower + digits + symbols;

  const rand = (s: string) => s[Math.floor(Math.random() * s.length)];
  const shuffle = (arr: string[]) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  for (let attempt = 0; attempt < 10; attempt++) {
    const chars = [rand(upper), rand(lower), rand(digits), rand(symbols)];
    while (chars.length < 14) chars.push(rand(all));
    const pw = shuffle(chars).join('');

    const low = pw.toLowerCase();
    let tooSimilar = false;
    for (const a of avoid) {
      if (a.length >= 3 && low.includes(a)) {
        tooSimilar = true;
        break;
      }
    }
    if (!tooSimilar) return pw;
  }

  return 'Atr@' + Math.random().toString(36).slice(2, 10) + '9!';
};

/** 0–4: longitud, mayúsc./minúsc., dígito, símbolo. Solo orientativo. */
export const passwordScore = (pw: string) => {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(4, score);
};

export type FormTab = 'cuenta' | 'seguridad' | 'correo' | 'firma';

export const validateUserForm = (
  f: UserFormValues,
  mode: 'create' | 'edit',
): { message: string; tab: FormTab } | null => {
  const username = f.username.trim();
  if (!username) return { message: 'Nombre de usuario es requerido', tab: 'cuenta' };
  if (username.length > 150) return { message: 'Nombre de usuario: máximo 150 caracteres', tab: 'cuenta' };
  if (!/^[\w.@+-]+$/.test(username)) {
    return { message: 'Nombre de usuario: solo letras, dígitos y @/./+/-/_', tab: 'cuenta' };
  }

  const mustCheckPassword = mode === 'create' || !!f.password || !!f.password2;
  if (mustCheckPassword) {
    const tab: FormTab = mode === 'create' ? 'cuenta' : 'seguridad';
    if (!f.password) return { message: 'Contraseña es requerida', tab };
    if (f.password.length < 8) return { message: 'La contraseña debe contener al menos 8 caracteres', tab };
    if (/^\d+$/.test(f.password)) return { message: 'La contraseña no puede ser completamente numérica', tab };
    if (f.password !== f.password2) return { message: 'Confirmación de contraseña no coincide', tab };
  }
  return null;
};
