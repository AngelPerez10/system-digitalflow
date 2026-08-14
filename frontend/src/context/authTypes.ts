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
  /** Órdenes/proyectos: true = solo propios; false = ver todos. */
  own_only?: boolean;
};

export type Permissions = Record<string, ModuleCrudPermissions>;
