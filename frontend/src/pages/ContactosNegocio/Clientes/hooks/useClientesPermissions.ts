import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { canDeleteInModule } from "@/pages/Configuracion/usuarios/usuariosModel";

/**
 * Permisos del módulo `clientes` para la interfaz. El backend
 * (`ClientesCatalogPermission`) vuelve a validar cada petición: esto solo
 * decide qué controles se muestran.
 */
export function useClientesPermissions() {
  const { permissions, isAdmin } = useAuth();
  return useMemo(() => {
    const p = permissions?.clientes;
    return {
      canView: isAdmin || p?.view === true,
      canCreate: isAdmin || p?.create === true,
      canEdit: isAdmin || p?.edit === true,
      canDelete: canDeleteInModule(permissions, isAdmin, "clientes"),
    };
  }, [permissions, isAdmin]);
}
