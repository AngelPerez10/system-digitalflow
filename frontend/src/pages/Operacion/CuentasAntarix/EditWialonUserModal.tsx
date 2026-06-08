import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { fetchApi } from "@/config/api";
import { cn } from "@/lib/utils";
import { modalPanelClass, modalTabBaseClass, selectLikeClassName } from "@/components/clientes/clienteFormShared";
import {
  erpHeroHeadingClass,
  erpPrimaryBtnClass,
  erpSansStyle,
  erpSearchInputClass,
  erpSecondaryBtnClass,
  erpSectionLabelClass,
} from "@/layout/erpPageStyles";
import EditWialonUnitPanel from "./EditWialonUnitPanel";
import type { UserModalTab, WialonUnitRow, WialonUserRow, WialonUserUpdatePayload } from "./wialonTypes";

const uiLabel = erpSectionLabelClass;
const uiCaption = "text-xs font-normal leading-relaxed text-[#78716c] dark:text-[#8ea0b8]";
const uiValue = "text-sm font-medium leading-snug text-[#1c1917] dark:text-[#f8fafc]";
const uiBadge =
  "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium leading-none tabular-nums";

const modalShellClass =
  "my-2 flex max-h-[min(92dvh,860px)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#faf9f5] p-0 shadow-[0_32px_90px_-40px_rgba(28,25,23,0.55)] dark:border-[#273244] dark:bg-[#111a2b] sm:my-auto sm:w-[min(98vw,56rem)] sm:max-w-[56rem] sm:rounded-3xl lg:w-[min(98vw,72rem)] lg:max-w-[72rem]";

type Props = {
  user: WialonUserRow | null;
  isOpen: boolean;
  initialTab?: UserModalTab;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (updated: WialonUserRow) => void;
};

function StatusBadge({ status }: { status: string }) {
  const active = status === "Activo";
  const unknown = !status || status === "â€”";
  return (
    <span
      className={cn(
        uiBadge,
        unknown
          ? "bg-[#f5f0e8] text-[#78716c] dark:bg-[#1e293b] dark:text-[#94a3b8]"
          : active
            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
      )}
    >
      {unknown ? "Sin dato" : status}
    </span>
  );
}

export default function EditWialonUserModal({
  user,
  isOpen,
  initialTab = "cuenta",
  canEdit,
  onClose,
  onSaved,
}: Props) {
  const titleId = useId();
  const [activeTab, setActiveTab] = useState<UserModalTab>(initialTab);
  const [name, setName] = useState("");
  const [dealerRights, setDealerRights] = useState("No");
  const [status, setStatus] = useState("Activo");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [units, setUnits] = useState<WialonUnitRow[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitsError, setUnitsError] = useState("");
  const [unitSearch, setUnitSearch] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);

  useEffect(() => {
    if (!user || !isOpen) return;
    setActiveTab(initialTab);
    setName(user.name === "â€”" ? "" : user.name);
    setDealerRights(user.dealer_rights);
    setStatus(user.status);
    setError("");
    setUnitSearch("");
    setSelectedUnitId(null);
  }, [user, isOpen, initialTab]);

  const loadUnits = useCallback(async () => {
    if (!user) return;
    setUnitsLoading(true);
    setUnitsError("");
    try {
      const res = await fetchApi(`/api/wialon/usuarios/${user.wialon_id}/unidades/`, {
        method: "GET",
        cache: "no-store" as RequestCache,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setUnitsError(String(data?.detail || `Error HTTP ${res.status}`));
        setUnits([]);
        return;
      }
      setUnits(Array.isArray(data?.units) ? (data.units as WialonUnitRow[]) : []);
    } catch {
      setUnitsError("No se pudieron cargar las unidades.");
      setUnits([]);
    } finally {
      setUnitsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isOpen || !user) return;
    if (activeTab === "unidades") void loadUnits();
  }, [isOpen, user, activeTab, loadUnits]);

  const activeUnits = useMemo(
    () =>
      units.filter((u) => {
        if (u.is_active === true || u.status === "Activo") return true;
        if (u.is_active === false || u.status === "Inactivo") return false;
        return true;
      }),
    [units]
  );

  const filteredUnits = useMemo(() => {
    const q = unitSearch.trim().toLowerCase();
    if (!q) return activeUnits;
    return activeUnits.filter((u) =>
      [u.name, u.device_type, u.uid, u.phone, u.custom_fields, u.status]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [activeUnits, unitSearch]);

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving || !canEdit) return;

    const baselineName = user.name === "â€”" ? "" : user.name;
    const trimmedName = name.trim();
    const payload: WialonUserUpdatePayload = {};

    if (trimmedName !== baselineName) payload.name = trimmedName;
    if (dealerRights !== user.dealer_rights) payload.dealer_rights = dealerRights;
    if (status !== user.status) {
      payload.status = status;
      payload.enabled = status === "Activo";
    }

    if (Object.keys(payload).length === 0) {
      handleClose();
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetchApi(`/api/wialon/usuarios/${user.wialon_id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(String(data?.detail || `Error HTTP ${res.status}`));
        return;
      }
      const updated = (data?.user ?? data) as WialonUserRow | null;
      if (!updated || updated.wialon_id == null) {
        setError("Wialon respondiÃ³ sin datos de la cuenta actualizada.");
        return;
      }
      onSaved({ ...user, ...updated, wialon_id: Number(updated.wialon_id) });
      handleClose();
    } catch {
      setError("No se pudo guardar en Wialon.");
    } finally {
      setSaving(false);
    }
  };

  const handleUnitSaved = useCallback(() => {
    void loadUnits();
  }, [loadUnits]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      closeOnBackdropClick={!saving}
      ariaLabelledBy={titleId}
      className={modalShellClass}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={erpSansStyle}>
        {/* Header */}
        <header className="relative shrink-0 border-b border-[#e7ded0] bg-gradient-to-br from-[#fcfaf6] via-[#fffaf3] to-[#faf9f5] px-4 py-4 pr-14 dark:border-[#334155] dark:from-[#111827] dark:via-[#111827] dark:to-[#0f172a] sm:px-6 sm:py-5 sm:pr-16">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#ff801f] via-[#cc785c] to-[#ff801f]/40" aria-hidden />
          <div className="pointer-events-none absolute -right-8 top-0 h-32 w-32 rounded-full bg-[#ff801f]/10 blur-3xl" aria-hidden />

          <div className="relative flex min-w-0 items-start gap-3 sm:gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff801f] text-black shadow-[0_8px_24px_-8px_rgba(255,128,31,0.65)] sm:h-12 sm:w-12">
              <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M12 2 4 7v10l8 5 8-5V7l-8-5Z" strokeLinejoin="round" />
                <path d="M12 12 8 9.5V7l4 2.5v2.5L12 12Z" strokeLinejoin="round" />
              </svg>
            </span>

            <div className="min-w-0 flex-1">
              <p className={cn(uiLabel, "text-[#cc785c] dark:text-[#fb923c]")}>Wialon Hosting Â· Antarix GPS</p>
              <h2
                id={titleId}
                className={cn("mt-1 text-balance", erpHeroHeadingClass, "text-[clamp(1.35rem,2.5vw,1.85rem)]")}
              >
                {user?.name || "Cuenta"}
              </h2>
              <p className={cn("mt-1.5 break-words tabular-nums", uiCaption)}>
                Login <span className="font-medium text-[#57534e] dark:text-[#cbd5e1]">{user?.user_id || "â€”"}</span>
                {user?.parent_account ? (
                  <>
                    <span className="mx-1.5 text-[#d6d3d1] dark:text-[#475569]">Â·</span>
                    {user.parent_account}
                  </>
                ) : null}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {user ? <StatusBadge status={user.status} /> : null}
                <span className={cn(uiBadge, "rounded-lg border border-[#e7ded0] bg-white/90 text-[#57534e] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#cbd5e1]")}>
                  {unitsLoading ? "â€¦" : `${activeUnits.length} activas`}
                </span>
                {user?.dealer_rights === "SÃ­" ? (
                  <span className={cn(uiBadge, "rounded-lg bg-[#fff3e6] text-[#c45f00] dark:bg-[#ff801f]/15 dark:text-[#ffb366]")}>
                    Distribuidor
                  </span>
                ) : null}
              </div>

              <div className="mt-4 inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-[#e7ded0] bg-[#fcfaf6]/90 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-[#334155] dark:bg-[#0f172a]/80">
                <button
                  type="button"
                  onClick={() => setActiveTab("cuenta")}
                  className={cn(
                    modalTabBaseClass,
                    "border whitespace-nowrap",
                    activeTab === "cuenta"
                      ? "border-[#cc785c]/35 bg-[#cc785c] text-white shadow-sm dark:bg-[#ff801f] dark:text-black"
                      : "border-transparent bg-transparent text-[#57534e] dark:text-[#cbd5e1]"
                  )}
                >
                  Datos de cuenta
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("unidades")}
                  className={cn(
                    modalTabBaseClass,
                    "border whitespace-nowrap",
                    activeTab === "unidades"
                      ? "border-[#cc785c]/35 bg-[#cc785c] text-white shadow-sm dark:bg-[#ff801f] dark:text-black"
                      : "border-transparent bg-transparent text-[#57534e] dark:text-[#cbd5e1]"
                  )}
                >
                  Unidades
                  {activeUnits.length > 0 ? (
                    <span className="ml-1.5 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-semibold dark:bg-white/20">
                      {activeUnits.length}
                    </span>
                  ) : null}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#faf9f5]/60 dark:bg-[#0f172a]/25">
          {activeTab === "cuenta" ? (
            <form onSubmit={handleAccountSubmit} className="space-y-5 p-4 sm:p-6">
              {error ? (
                <p className="rounded-xl border border-rose-200/80 bg-rose-50/70 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
                  {error}
                </p>
              ) : null}

              <div className={cn(modalPanelClass, "grid grid-cols-1 gap-4 sm:grid-cols-2")}>
                <p className={cn(uiLabel, "sm:col-span-2")}>InformaciÃ³n de facturaciÃ³n</p>

                <div className="sm:col-span-2">
                  <label htmlFor="wialon-edit-name" className={uiLabel}>
                    Nombre de cuenta
                  </label>
                  <input
                    id="wialon-edit-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={cn(erpSearchInputClass, "mt-2 w-full")}
                    required
                    disabled={!canEdit || saving}
                  />
                </div>

                <div>
                  <label htmlFor="wialon-edit-dealer" className={uiLabel}>
                    Derechos de distribuidor
                  </label>
                  <select
                    id="wialon-edit-dealer"
                    value={dealerRights}
                    onChange={(e) => setDealerRights(e.target.value)}
                    className={cn(selectLikeClassName, "mt-2")}
                    disabled={!canEdit || saving}
                  >
                    <option value="No">No</option>
                    <option value="SÃ­">SÃ­</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="wialon-edit-status" className={uiLabel}>
                    Status de cuenta
                  </label>
                  <select
                    id="wialon-edit-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={cn(selectLikeClassName, "mt-2")}
                    disabled={!canEdit || saving}
                  >
                    <option value="Activo">Activo</option>
                    <option value="Bloqueado">Bloqueado</option>
                  </select>
                </div>

                <div className="sm:col-span-2 rounded-xl border border-[#e7ded0]/90 bg-[#fcfaf6]/80 px-3 py-3 dark:border-[#334155] dark:bg-[#0f172a]/50">
                  <p className={uiLabel}>Solo lectura</p>
                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <p className={uiCaption}>Creador</p>
                      <p className={cn("mt-0.5", uiValue)}>{user?.creator || "â€”"}</p>
                    </div>
                    <div>
                      <p className={uiCaption}>Cuenta padre</p>
                      <p className={cn("mt-0.5", uiValue)}>{user?.parent_account || "â€”"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {canEdit ? (
                <div className="flex flex-col-reverse gap-2 border-t border-[#e7ded0] pt-4 dark:border-[#334155] sm:flex-row sm:justify-end">
                  <button type="button" onClick={handleClose} disabled={saving} className={erpSecondaryBtnClass}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={saving} className={erpPrimaryBtnClass}>
                    {saving ? "Guardandoâ€¦" : "Guardar cuenta"}
                  </button>
                </div>
              ) : (
                <p className={cn("text-center", uiCaption)}>No tienes permiso para editar esta cuenta.</p>
              )}
            </form>
          ) : (
            <div className="flex min-h-[min(520px,60dvh)] flex-col lg:flex-row">
              {/* Lista de unidades */}
              <aside className="shrink-0 border-b border-[#e7ded0] bg-[#fcfaf6]/90 p-4 dark:border-[#334155] dark:bg-[#111827]/60 lg:w-[min(100%,320px)] lg:border-b-0 lg:border-r">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className={uiLabel}>Flota</p>
                  <span className={cn(uiCaption, "tabular-nums")}>
                    {filteredUnits.length} activa{filteredUnits.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="relative mb-3">
                  <input
                    type="search"
                    value={unitSearch}
                    onChange={(e) => setUnitSearch(e.target.value)}
                    placeholder="Buscar por nombre, UIDâ€¦"
                    className={cn(erpSearchInputClass, "w-full pl-9")}
                    aria-label="Buscar unidad"
                  />
                  <svg
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78716c] dark:text-[#8ea0b8]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3-3" />
                  </svg>
                </div>

                <div className="custom-scrollbar max-h-[min(340px,45dvh)] space-y-1.5 overflow-y-auto lg:max-h-[min(560px,58dvh)]">
                  {unitsLoading ? (
                    <div className="flex flex-col items-center gap-2 py-10">
                      <span className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-[#ff801f] border-t-transparent" />
                      <p className={uiCaption}>Cargandoâ€¦</p>
                    </div>
                  ) : unitsError ? (
                    <p className="rounded-lg border border-rose-200/80 bg-rose-50/70 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
                      {unitsError}
                    </p>
                  ) : filteredUnits.length === 0 ? (
                    <p className={cn("py-8 text-center", uiCaption)}>
                      {activeUnits.length === 0
                        ? "Sin unidades activas asignadas."
                        : "Ninguna unidad activa coincide con la bÃºsqueda."}
                    </p>
                  ) : (
                    filteredUnits.map((unit) => {
                      const selected = selectedUnitId === unit.wialon_id;
                      return (
                        <button
                          key={unit.wialon_id}
                          type="button"
                          onClick={() => setSelectedUnitId(unit.wialon_id)}
                          className={cn(
                            "w-full rounded-xl border px-3 py-2.5 text-left transition-all",
                            selected
                              ? "border-[#cc785c]/50 bg-[#fff8f1] shadow-[0_4px_16px_-8px_rgba(204,120,92,0.45)] dark:border-[#fb923c]/45 dark:bg-[#ff801f]/10"
                              : "border-[#e7ded0]/90 bg-white/80 hover:border-[#ff801f]/30 hover:bg-[#fffdfa] dark:border-[#334155] dark:bg-[#0f172a]/50 dark:hover:border-[#fb923c]/30"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <p className={cn("truncate text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]")}>
                                {unit.name || "Sin nombre"}
                              </p>
                              <p className={cn("mt-0.5 truncate font-mono text-[11px] text-[#78716c] dark:text-[#8ea0b8]")}>
                                {unit.uid !== "â€”" ? unit.uid : "Sin UID"}
                              </p>
                              <p className={cn("mt-1 truncate", uiCaption)}>
                                {unit.device_type}
                                {unit.last_message_at && unit.last_message_at !== "â€”"
                                  ? ` Â· Ãšltimo msg. ${unit.last_message_at}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </aside>

              {/* Panel de ediciÃ³n */}
              <div className="min-w-0 flex-1 p-4 sm:p-5 lg:p-6">
                <EditWialonUnitPanel
                  unitId={selectedUnitId}
                  contextUserId={user?.wialon_id ?? null}
                  canEdit={canEdit}
                  embedded
                  onSaved={handleUnitSaved}
                  onCancel={() => setSelectedUnitId(null)}
                />
              </div>
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-[#e7ded0] bg-[#fcfaf6]/95 px-4 py-3.5 dark:border-[#334155] dark:bg-[#111827] sm:px-6">
          <button type="button" onClick={handleClose} disabled={saving} className={cn(erpSecondaryBtnClass, "w-full sm:ml-auto sm:w-auto")}>
            Cerrar
          </button>
        </footer>
      </div>
    </Modal>
  );
}
