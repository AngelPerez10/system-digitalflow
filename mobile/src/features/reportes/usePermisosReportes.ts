import { useMemo } from 'react';
import { useSession } from '@/auth/SessionProvider';
import {
  canCreateModule,
  canDeleteModule,
  canEditModule,
  canViewModule,
  isReportesOwnOnly,
} from '@/auth/permissions';

export const MODULO_REPORTES = 'reportes_mantenimiento';

export interface PermisosReportes {
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
  /** Técnico: solo ve y edita los reportes de sus órdenes/proyectos (lo recorta el servidor). */
  soloPropios: boolean;
  /** Puede ligar el reporte a un proyecto (el origen solo admite proyectos y necesita ver ese módulo). */
  origenProyectos: boolean;
}

/**
 * Permisos del rol en el módulo, en un solo lugar. Solo deciden qué se
 * muestra: la autorización real la vuelve a validar el servidor en cada
 * petición (`ReportesMantenimientoPermission` + `own_only`).
 */
export function usePermisosReportes(): PermisosReportes {
  const { user, permissions } = useSession();
  return useMemo(() => {
    const ver = canViewModule(permissions, user, MODULO_REPORTES);
    return {
      ver,
      crear: ver && canCreateModule(permissions, user, MODULO_REPORTES),
      editar: ver && canEditModule(permissions, user, MODULO_REPORTES),
      eliminar: ver && canDeleteModule(permissions, user, MODULO_REPORTES),
      soloPropios: isReportesOwnOnly(permissions, user),
      origenProyectos: canViewModule(permissions, user, 'proyectos'),
    };
  }, [permissions, user]);
}
