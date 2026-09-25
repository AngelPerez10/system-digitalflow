export interface AuthUser {
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
  first_name: string;
  last_name: string;
  id: number;
  avatar_url?: string;
  /** True si el admin ya cargó correo+contraseña webmail para envío de PDF. */
  smtp_configured?: boolean;
}

export type ModuleCrudPermissions = {
  view?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  /** Órdenes/proyectos/reportes_mantenimiento: true = solo propios; false = ver todos. */
  own_only?: boolean;
  /**
   * Solo órdenes/proyectos: puede marcar/desmarcar "Liquidado". Independiente
   * de `edit` — a propósito no da bypass a admins, exclusivo de quien tenga
   * esta casilla activa en Gestión de usuarios.
   */
  liquidar?: boolean;
  /**
   * Solo órdenes/proyectos: puede cambiar el status operativo. Independiente
   * de `liquidar`. Quien tiene `liquidar` sin esta casilla no puede mover el
   * status (aunque tenga `edit`).
   */
  cambiar_status?: boolean;
};

export type Permissions = Record<string, ModuleCrudPermissions>;
