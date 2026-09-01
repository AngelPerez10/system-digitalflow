/** Espejo de los contratos del backend (`apps/users`). No inventar campos. */

export interface PermissionFlags {
  view?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  /** true = el usuario solo ve/edita sus propios registros. */
  own_only?: boolean;
}

export type ModulePermissions = Record<string, PermissionFlags>;

export interface SessionUser {
  id: number;
  username: string;
  email: string | null;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
  /** Foto de perfil (`permissions_profile.avatar_url`). Solo llega en `/me/`. */
  avatar_url: string | null;
  /**
   * Contexto de portal cliente — lo añade el backend a `/login/` y `/me/`
   * (`get_portal_context_for_user`, apps/clientes/portal_services.py).
   * `'staff'` para cualquier cuenta del ERP.
   */
  account_type: 'cliente' | 'staff';
  /** Contraseña temporal recién emitida: hay que cambiarla antes de seguir. */
  must_change_password: boolean;
  cliente_id: number | null;
  /** `active` | `pending_review` | `suspended` — vacío para staff. */
  portal_status: string | null;
}

/** `POST /api/login/` con `X-Client: mobile`. */
export interface LoginResponse extends SessionUser {
  access: string;
  refresh: string;
  permissions: ModulePermissions;
}

/** `POST /api/token/refresh/` con `X-Client: mobile`. */
export interface RefreshResponse {
  access: string;
  refresh: string;
}

/** Cuerpo de `POST /api/portal-cliente/registro/` (`apps/clientes/portal_serializers`). */
export interface RegistroClientePayload {
  first_name: string;
  last_name: string;
  email: string;
  telefono: string;
  razon_social?: string;
  rfc?: string;
  codigo_postal?: string;
  acepto_privacidad: boolean;
}

/** Respuesta de registro: la cuenta no queda activa, se revisa y llega por correo. */
export interface RegistroClienteResultado {
  /** 'created' (201) o 'pending_review' (202) — para el técnico ambos = «espera el correo». */
  status: 'created' | 'pending_review';
  solicitudId: number | null;
  detail: string;
}
