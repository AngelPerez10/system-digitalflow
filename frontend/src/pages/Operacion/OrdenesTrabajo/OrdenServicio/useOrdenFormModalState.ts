import { useCallback, useMemo, useState } from "react";
import type { Orden } from "./ordenesPageTypes";
import {
  isOrdenFieldReadOnly,
  isOrdenLimitedEdit,
  type OrdenEditableField,
} from "./ordenEditScope";

export type TipoOrden = "servicio_tecnico" | "levantamiento" | "instalaciones" | "mantenimiento";
export type OrdenFormTab = "orden" | "cliente";

export function useOrdenFormModalState({
  canCreate,
  canEdit,
  editingOrdenForScope,
  userId,
  isAdmin = false,
}: {
  canCreate: boolean;
  canEdit: boolean;
  editingOrdenForScope?: Orden | null;
  userId?: number | null;
  isAdmin?: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<OrdenFormTab>("cliente");
  const [editingOrden, setEditingOrden] = useState<Orden | null>(null);
  const [tipoOrden, setTipoOrden] = useState<TipoOrden>("servicio_tecnico");

  const scopeOrden = editingOrdenForScope ?? editingOrden;
  const isReadOnly = scopeOrden ? !canEdit : !canCreate;

  const isLimitedEdit = useMemo(
    () =>
      isOrdenLimitedEdit({
        orden: scopeOrden,
        userId: userId ?? null,
        isAdmin,
        canEdit,
      }),
    [scopeOrden, userId, isAdmin, canEdit],
  );

  const isFieldReadOnly = useCallback(
    (field: OrdenEditableField) =>
      isOrdenFieldReadOnly(field, { isReadOnly, isLimitedEdit }),
    [isReadOnly, isLimitedEdit],
  );

  const tipoOrdenLabel = useMemo(() => {
    switch (tipoOrden) {
      case "levantamiento":
        return "Levantamiento";
      case "instalaciones":
        return "Instalaciones";
      case "mantenimiento":
        return "Mantenimiento";
      case "servicio_tecnico":
      default:
        return "Servicio";
    }
  }, [tipoOrden]);

  const openNewOrden = useCallback(
    (opts?: { tipo?: TipoOrden; tab?: OrdenFormTab }) => {
      setEditingOrden(null);
      setTipoOrden(opts?.tipo ?? "servicio_tecnico");
      setActiveTab(opts?.tab ?? "cliente");
      setShowModal(true);
    },
    []
  );

  const resetOrdenModalShell = useCallback(() => {
    setShowModal(false);
    setActiveTab("cliente");
    setTipoOrden("servicio_tecnico");
    setEditingOrden(null);
  }, []);

  return {
    showModal,
    setShowModal,
    showClienteModal,
    setShowClienteModal,
    activeTab,
    setActiveTab,
    editingOrden,
    setEditingOrden,
    tipoOrden,
    setTipoOrden,
    isReadOnly,
    isLimitedEdit,
    isFieldReadOnly,
    tipoOrdenLabel,
    openNewOrden,
    resetOrdenModalShell,
  };
}
