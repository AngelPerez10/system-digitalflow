import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { fetchApi } from "@/config/api";
import { cn } from "@/lib/utils";
import {
  caaModalEyebrowClass,
  caaModalHeaderClass,
  caaModalHeaderIconClass,
  caaModalSubtitleClass,
  caaModalTabBtnClass,
  caaModalTabTrackClass,
  caaModalTitleClass,
  erpSansStyle,
  erpSearchInputClass,
  erpSelectFieldClass,
} from "../shared/cuentasAntarixStyles";
import type {
  UserModalTab,
  WialonUnitRow,
  WialonUserRow,
  WialonUserUpdatePayload,
} from "../shared/wialonTypes";
import { fetchWialonCatalogs } from "../shared/wialonApi";
import {
  cachedUnits,
  getUnitsByUserCacheEntry,
  rememberUnits,
} from "../shared/wialonCache";
import { findMirrorAccounts } from "../shared/wialonAccountUtils";
import {
  WialonErrorAlert,
  WialonLoadingState,
  WialonModalFooter,
  WialonSharedBadge,
  WialonStatStrip,
  WialonStatusBadge,
  WialonSectionCard,
  wialonEyebrowClass,
  wialonUiBadge,
  wialonUiCaption,
  wialonUiLabel,
  type WialonFooterAction,
} from "./chrome/WialonModalChrome";
import WialonMirrorAccountsPanel from "./panels/WialonMirrorAccountsPanel";
import WialonUnitEditForm, { type UnitBusyState } from "./panels/WialonUnitEditForm";

const wialonModalShellClass =
  "flex max-h-[min(94dvh,94vh)] w-full flex-col overflow-hidden rounded-t-3xl border border-[#E7E7EA] bg-[#ffffff] p-0 shadow-[0_24px_48px_-12px_rgba(9,9,11,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] sm:max-h-[min(92vh,92vh)] sm:w-[min(96vw,72rem)] sm:max-w-[72rem] sm:rounded-2xl";

type Props = {
  user: WialonUserRow | null;
  /** Listado completo para detectar cuentas espejo creadas bajo esta cuenta. */
  allUsers?: WialonUserRow[];
  isOpen: boolean;
  initialTab?: UserModalTab;
  /** Si abre en flota, preselecciona esta unidad. */
  initialUnitId?: number | null;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (updated: WialonUserRow) => void;
  /** Abre otra cuenta del listado (p. ej. una espejo). */
  onOpenUser?: (row: WialonUserRow) => void;
};

export default function EditWialonUserModal({
  user,
  allUsers = [],
  isOpen,
  initialTab = "cuenta",
  initialUnitId = null,
  canEdit,
  onClose,
  onSaved,
  onOpenUser,
}: Props) {
  const titleId = useId();
  const cuentaPanelId = useId();
  const unidadesPanelId = useId();
  const unitFormId = useId();
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
  const [unitBusy, setUnitBusy] = useState<UnitBusyState>({
    saving: false,
    accessBusy: false,
  });

  useEffect(() => {
    if (!user || !isOpen) return;
    setActiveTab(initialTab);
    setName(user.name === "—" ? "" : user.name);
    setDealerRights(user.dealer_rights);
    setStatus(user.status);
    setError("");
    setUnitSearch("");
    setSelectedUnitId(
      initialTab === "unidades" && initialUnitId != null && Number.isFinite(Number(initialUnitId))
        ? Number(initialUnitId)
        : null,
    );
  }, [user, isOpen, initialTab, initialUnitId]);

  const loadUnits = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!user) return;
      const userId = user.wialon_id;
      const fresh = cachedUnits(userId);
      if (fresh && !opts?.force) {
        setUnits(fresh);
        setUnitsError("");
        setUnitsLoading(false);
        return;
      }
      const stale = getUnitsByUserCacheEntry(userId);
      if (stale) {
        setUnits(stale.units);
        setUnitsLoading(false);
      } else {
        setUnitsLoading(true);
      }
      setUnitsError("");
      try {
        const res = await fetchApi(`/api/wialon/usuarios/${userId}/unidades/`, {
          method: "GET",
          cache: "no-store" as RequestCache,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          if (!stale) {
            setUnitsError(String(data?.detail || `Error HTTP ${res.status}`));
            setUnits([]);
          }
          return;
        }
        const next = Array.isArray(data?.units) ? (data.units as WialonUnitRow[]) : [];
        rememberUnits(userId, next);
        setUnits(next);
      } catch {
        if (!stale) {
          setUnitsError("No se pudieron cargar las unidades.");
          setUnits([]);
        }
      } finally {
        setUnitsLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    if (!isOpen || !user) return;
    void fetchWialonCatalogs();
    void loadUnits();
  }, [isOpen, user, loadUnits]);

  const fleetUnits = useMemo(() => units, [units]);

  const mirrorAccounts = useMemo(
    () => (user ? findMirrorAccounts(user, allUsers) : []),
    [user, allUsers],
  );

  const selectedUnit = useMemo(
    () => fleetUnits.find((u) => u.wialon_id === selectedUnitId) ?? null,
    [fleetUnits, selectedUnitId],
  );

  const filteredUnits = useMemo(() => {
    const q = unitSearch.trim().toLowerCase();
    if (!q) return fleetUnits;
    return fleetUnits.filter((u) =>
      [u.name, u.device_type, u.uid, u.phone, u.custom_fields, u.status, u.shared_with]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [fleetUnits, unitSearch]);

  const footerBusy = saving || unitBusy.saving || unitBusy.accessBusy || Boolean(unitBusy.activeBusy);

  const handleClose = useCallback(() => {
    if (footerBusy) return;
    onClose();
  }, [footerBusy, onClose]);

  const handleUnitBusyChange = useCallback((busy: UnitBusyState) => {
    setUnitBusy(busy);
  }, []);

  useEffect(() => {
    if (!selectedUnitId) {
      setUnitBusy({ saving: false, accessBusy: false });
    }
  }, [selectedUnitId]);

  const footerActions = useMemo((): WialonFooterAction[] => {
    const actions: WialonFooterAction[] = [
      {
        key: "cancel",
        label: "Cancelar",
        variant: "secondary",
        onClick: handleClose,
        disabled: footerBusy,
      },
    ];

    const editingUnit = activeTab === "unidades" && selectedUnitId != null;

    if (canEdit && editingUnit) {
      actions.push({
        key: "save-unit",
        label: unitBusy.saving ? "Guardando…" : "Guardar",
        variant: "primary",
        type: "submit",
        form: unitFormId,
        disabled: unitBusy.saving || unitBusy.accessBusy || footerBusy,
      });
    } else if (canEdit) {
      actions.push({
        key: "save-cuenta",
        label: saving ? "Guardando…" : "Guardar",
        variant: "primary",
        type: "submit",
        form: cuentaPanelId,
        disabled: footerBusy,
      });
    }

    return actions;
  }, [
    canEdit,
    saving,
    footerBusy,
    cuentaPanelId,
    unitFormId,
    activeTab,
    selectedUnitId,
    unitBusy.saving,
    unitBusy.accessBusy,
    handleClose,
  ]);

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving || !canEdit) return;

    const baselineName = user.name === "—" ? "" : user.name;
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
        setError("Wialon respondió sin datos de la cuenta actualizada.");
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

  const handleUnitSaved = useCallback(
    (patch?: Partial<WialonUnitRow>) => {
      if (!user || !selectedUnitId || !patch) return;
      setUnits((prev) => {
        const next = prev.map((unit) =>
          unit.wialon_id === selectedUnitId ? { ...unit, ...patch } : unit,
        );
        rememberUnits(user.wialon_id, next);
        return next;
      });
    },
    [user, selectedUnitId],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      closeOnBackdropClick={!saving}
      ariaLabelledBy={titleId}
      mobileBottomSheet
      className={wialonModalShellClass}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={erpSansStyle}>
        {/* Cabecera marina */}
        <header className={caaModalHeaderClass}>
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <span
              className={cn(caaModalHeaderIconClass, "hidden sm:inline-flex")}
              aria-hidden
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.65"
                aria-hidden
              >
                <path d="M12 2 4 7v10l8 5 8-5V7l-8-5Z" strokeLinejoin="round" />
                <path d="M12 12 8 9.5V7l4 2.5v2.5L12 12Z" strokeLinejoin="round" />
              </svg>
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className={caaModalEyebrowClass}>Ventas · Suscripción · Antarix</p>
                {user ? <WialonStatusBadge status={user.status} /> : null}
                {user?.dealer_rights === "Sí" ? (
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                    Distribuidor
                  </span>
                ) : null}
              </div>
              <h2 id={titleId} className={cn("mt-1 text-balance", caaModalTitleClass)}>
                {user?.name || "Cuenta"}
              </h2>
              <p className={caaModalSubtitleClass}>
                <span className="font-mono text-[13px] font-medium tracking-wide text-[#E6A23C]">
                  {user?.user_id || "—"}
                </span>
                {user?.parent_account ? (
                  <>
                    <span className="mx-1.5 text-white/30">·</span>
                    {user.parent_account}
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Secciones de la cuenta"
            className={cn(caaModalTabTrackClass, "relative mt-4")}
          >
            <button
              type="button"
              role="tab"
              id={`${cuentaPanelId}-tab`}
              aria-selected={activeTab === "cuenta"}
              aria-controls={cuentaPanelId}
              onClick={() => setActiveTab("cuenta")}
              className={caaModalTabBtnClass(activeTab === "cuenta")}
            >
              Cuenta
            </button>
            <button
              type="button"
              role="tab"
              id={`${unidadesPanelId}-tab`}
              aria-selected={activeTab === "unidades"}
              aria-controls={unidadesPanelId}
              onClick={() => setActiveTab("unidades")}
              className={caaModalTabBtnClass(activeTab === "unidades")}
            >
              Flota
              {fleetUnits.length > 0 ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                    activeTab === "unidades"
                      ? "bg-[#17235B]/10 text-[#17235B]"
                      : "bg-white/15 text-white",
                  )}
                >
                  {fleetUnits.length}
                </span>
              ) : null}
            </button>
          </div>
        </header>

        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-[#ffffff] dark:bg-[#111827]">
          {/* Panel Cuenta */}
          <form
            id={cuentaPanelId}
            role="tabpanel"
            aria-labelledby={`${cuentaPanelId}-tab`}
            hidden={activeTab !== "cuenta"}
            onSubmit={handleAccountSubmit}
            className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain p-4 sm:space-y-5 sm:p-6"
          >
            {error ? <WialonErrorAlert message={error} /> : null}

            <WialonStatStrip
              items={[
                {
                  label: "Activas",
                  value:
                    unitsLoading && fleetUnits.length === 0
                      ? "…"
                      : String(user?.assigned_units ?? fleetUnits.length),
                  serif: true,
                },
                { label: "Espejos", value: String(mirrorAccounts.length), serif: true },
                { label: "Creador", value: user?.creator || "—" },
                { label: "Bloqueado", value: user?.blocked || "—" },
              ]}
            />

            <WialonSectionCard
              eyebrow="Facturación"
              title="Datos de la cuenta"
              subtitle="Nombre, distribuidor y status se escriben en Wialon al guardar"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="wialon-edit-name" className={wialonUiLabel}>
                    Nombre de cuenta
                  </label>
                  <input
                    id="wialon-edit-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={cn(erpSearchInputClass, "mt-2 w-full pl-4")}
                    required
                    disabled={!canEdit || saving}
                  />
                </div>

                <div>
                  <label htmlFor="wialon-edit-dealer" className={wialonUiLabel}>
                    Derechos de distribuidor
                  </label>
                  <select
                    id="wialon-edit-dealer"
                    value={dealerRights}
                    onChange={(e) => setDealerRights(e.target.value)}
                    className={cn(erpSelectFieldClass, "mt-2")}
                    disabled={!canEdit || saving}
                  >
                    <option value="No">No</option>
                    <option value="Sí">Sí</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="wialon-edit-status" className={wialonUiLabel}>
                    Status de cuenta
                  </label>
                  <select
                    id="wialon-edit-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={cn(erpSelectFieldClass, "mt-2")}
                    disabled={!canEdit || saving}
                  >
                    <option value="Activo">Activo</option>
                    <option value="Bloqueado">Bloqueado</option>
                  </select>
                </div>
              </div>
            </WialonSectionCard>

            <WialonMirrorAccountsPanel
              mirrors={mirrorAccounts}
              currentUser={user}
              onOpenUser={onOpenUser}
            />

            {!canEdit ? (
              <p className={cn("text-center", wialonUiCaption)}>
                No tienes permiso para editar esta cuenta.
              </p>
            ) : null}
          </form>

          {/* Panel Flota */}
          <div
            id={unidadesPanelId}
            role="tabpanel"
            aria-labelledby={`${unidadesPanelId}-tab`}
            hidden={activeTab !== "unidades"}
            className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row"
          >
            {/* Sidebar: lista de unidades */}
            <aside
              className={cn(
                "flex min-h-0 flex-col border-[#E7E7EA] bg-[#FAFAFA]/80 p-3 dark:border-[#273244] dark:bg-[#0f172a]/40 sm:p-4",
                "lg:w-[min(100%,22rem)] lg:shrink-0 lg:self-stretch lg:border-b-0 lg:border-r",
                selectedUnitId != null
                  ? "hidden border-b lg:flex"
                  : "flex flex-1 border-b lg:flex-none",
              )}
            >
              <div className="mb-3 flex shrink-0 items-end justify-between gap-2">
                <div>
                  <p className={wialonEyebrowClass}>Flota</p>
                  <p className="mt-0.5 text-sm font-semibold text-[#09090B] dark:text-[#f8fafc]">
                    Unidades activas
                  </p>
                </div>
                <span className={cn(wialonUiCaption, "tabular-nums")}>
                  {filteredUnits.length}/{fleetUnits.length}
                </span>
              </div>

              <div className="relative mb-3 shrink-0">
                <input
                  type="search"
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  placeholder="Nombre, UID, placa…"
                  className={cn(erpSearchInputClass, "w-full")}
                  aria-label="Buscar unidad en la flota"
                />
                <svg
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E6E77] dark:text-[#8ea0b8]"
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

              <div
                className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-2 touch-pan-y [-webkit-overflow-scrolling:touch]"
                role="listbox"
                aria-label="Unidades de la flota"
              >
                {unitsLoading ? (
                  <WialonLoadingState label="Cargando unidades…" compact />
                ) : unitsError ? (
                  <WialonErrorAlert message={unitsError} />
                ) : filteredUnits.length === 0 ? (
                  <p className={cn("py-8 text-center", wialonUiCaption)}>
                    {fleetUnits.length === 0
                      ? "Sin unidades asignadas."
                      : "Ninguna unidad coincide con la búsqueda."}
                  </p>
                ) : (
                  filteredUnits.map((unit) => {
                    const selected = selectedUnitId === unit.wialon_id;
                    const inactive = unit.is_active === false || unit.status === "Inactivo";
                    return (
                      <button
                        key={unit.wialon_id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => setSelectedUnitId(unit.wialon_id)}
                        className={cn(
                          "relative flex w-full gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 motion-reduce:transition-none",
                          selected
                            ? "border-[#1B5CFF]/55 bg-[#F1F5FF] shadow-sm dark:border-[#4B7CFF]/50 dark:bg-[#4B7CFF]/10"
                            : inactive
                              ? "border-rose-200/70 bg-rose-50/40 opacity-90 hover:border-rose-300 dark:border-rose-900/40 dark:bg-rose-950/20"
                              : unit.is_shared
                                ? "border-[#1B5CFF]/20 bg-[#ffffff] hover:border-[#1B5CFF]/40 dark:border-[#4B7CFF]/25 dark:bg-[#111827]/40"
                                : "border-[#E7E7EA] bg-[#ffffff] hover:border-[#D3D3D8] dark:border-[#273244] dark:bg-[#111827] dark:hover:border-[#475569]/80",
                        )}
                      >
                        {selected ? (
                          <span
                            className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-full bg-[#1B5CFF]"
                            aria-hidden
                          />
                        ) : null}
                        <span
                          className={cn(
                            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-medium",
                            selected
                              ? "bg-[#1B5CFF] text-white"
                              : inactive
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
                                : "bg-[#1B5CFF]/12 text-[#1244D1] dark:bg-[#4B7CFF]/15 dark:text-[#4B7CFF]",
                          )}
                          aria-hidden
                        >
                          {(unit.name || "?").slice(0, 1).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className="truncate text-sm font-medium text-[#141413] dark:text-[#f8fafc]">
                              {unit.name || "Sin nombre"}
                            </span>
                            <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                              {inactive ? (
                                <span
                                  className={cn(
                                    wialonUiBadge,
                                    "bg-[#ebe6df] text-[#52525B] ring-1 ring-inset ring-[#D3D3D8] dark:bg-[#27272a] dark:text-[#d4d4d8] dark:ring-[#273244]",
                                  )}
                                >
                                  <span
                                    className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#A1A1AA]"
                                    aria-hidden
                                  />
                                  Inactiva
                                </span>
                              ) : null}
                              {unit.is_shared ? (
                                <WialonSharedBadge
                                  sharedWith={unit.shared_with}
                                  count={unit.shared_users_count}
                                  compact
                                />
                              ) : null}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate font-mono text-[11px] text-[#1B5CFF] dark:text-[#4B7CFF]">
                            {unit.uid !== "—" ? unit.uid : "Sin UID"}
                          </span>
                          <span className={cn("mt-1 block truncate", wialonUiCaption)}>
                            {unit.device_type}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            {/* Detalle de unidad */}
            <div
              className={cn(
                "custom-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-[#ffffff] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:bg-[#111827] sm:p-6",
                selectedUnitId == null ? "hidden lg:block" : "block",
              )}
            >
              <WialonUnitEditForm
                unitId={selectedUnitId}
                contextUserId={user?.wialon_id ?? null}
                canEdit={canEdit}
                unitSummary={selectedUnit}
                formId={unitFormId}
                onBusyChange={handleUnitBusyChange}
                onSaved={handleUnitSaved}
                onBackToList={() => setSelectedUnitId(null)}
              />
            </div>
          </div>
        </div>

        <WialonModalFooter actions={footerActions} busy={footerBusy} />
      </div>
    </Modal>
  );
}
