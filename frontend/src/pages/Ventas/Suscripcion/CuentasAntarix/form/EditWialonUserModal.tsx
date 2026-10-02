import { useCallback, useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";
import { Check, Loader2, Satellite, Truck, UserCog, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { appModalBtn } from "@/components/ui/modal-kit/modalKitStyles";
import "@/components/ui/modal-kit/motion.css";
import { fetchApi } from "@/config/api";
import { cn } from "@/lib/utils";
import { erpModalShellClass } from "@/pages/Operacion/OrdenesTrabajo/ordenTrabajoStyles";
import {
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
  WialonStatStrip,
  WialonStatusBadge,
  WialonSectionCard,
  wialonUiCaption,
  wialonUiLabel,
} from "./chrome/WialonModalChrome";
import WialonMirrorAccountsPanel from "./panels/WialonMirrorAccountsPanel";
import WialonFleetPanel from "./panels/WialonFleetPanel";
import WialonUnitEditForm, { type UnitBusyState } from "./panels/WialonUnitEditForm";

/** Mismo cascarón que el modal de órdenes / proyectos, un poco más ancho por la vista de flota. */
const wialonModalShellClass = `${erpModalShellClass} rounded-t-2xl! bg-white! dark:bg-[#111827]! sm:w-[min(96vw,78rem)]! sm:max-w-[78rem]! sm:rounded-2xl! lg:h-[min(90vh,880px)]`;

const TAB_ORDER: UserModalTab[] = ["cuenta", "unidades"];

const TAB_META: Record<UserModalTab, { label: string; hint: string; description: string }> = {
  cuenta: {
    label: "Cuenta",
    hint: "Datos y cuentas espejo",
    description: "Nombre, derechos de distribuidor y status. Los cambios se escriben en Wialon al guardar.",
  },
  unidades: {
    label: "Flota",
    hint: "Unidades, SIM y accesos",
    description: "Elige una unidad para editar su ficha, la SIM y quién tiene acceso.",
  },
};

const TAB_ICON: Record<UserModalTab, typeof UserCog> = {
  cuenta: UserCog,
  unidades: Truck,
};

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

  /** En Flota sin unidad elegida no hay nada que guardar: el pie solo ofrece cerrar. */
  const saveTarget: string | null = !canEdit
    ? null
    : activeTab === "unidades"
      ? selectedUnitId != null
        ? unitFormId
        : null
      : cuentaPanelId;
  const saveInFlight = activeTab === "unidades" ? unitBusy.saving : saving;

  const tabIds: Record<UserModalTab, string> = {
    cuenta: `${cuentaPanelId}-tab`,
    unidades: `${unidadesPanelId}-tab`,
  };
  const panelIds: Record<UserModalTab, string> = {
    cuenta: cuentaPanelId,
    unidades: unidadesPanelId,
  };

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, current: UserModalTab) => {
    const idx = TAB_ORDER.indexOf(current);
    const last = TAB_ORDER.length - 1;
    const map: Record<string, number> = {
      ArrowRight: idx === last ? 0 : idx + 1,
      ArrowDown: idx === last ? 0 : idx + 1,
      ArrowLeft: idx === 0 ? last : idx - 1,
      ArrowUp: idx === 0 ? last : idx - 1,
      Home: 0,
      End: last,
    };
    if (!(e.key in map)) return;
    e.preventDefault();
    const next = TAB_ORDER[map[e.key]];
    setActiveTab(next);
    requestAnimationFrame(() => document.getElementById(tabIds[next])?.focus());
  };

  const meta = TAB_META[activeTab];
  const SectionIcon = TAB_ICON[activeTab];
  const summaryRows = [
    { label: "Usuario", value: user?.user_id, mono: true },
    { label: "Cuenta padre", value: user?.parent_account },
    { label: "Creador", value: user?.creator },
    { label: "Distribuidor", value: user?.dealer_rights },
  ];

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
      mobileBottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      closeOnBackdropClick={false}
      closeOnEscape={!footerBusy}
      showCloseButton={false}
      ariaLabelledBy={titleId}
      className={wialonModalShellClass}
    >
      <div
        className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden lg:flex-row"
        style={erpSansStyle}
      >
        <button
          type="button"
          onClick={handleClose}
          disabled={footerBusy}
          aria-label="Cerrar ventana"
          className="absolute right-3 top-3 z-20 inline-flex size-10 items-center justify-center rounded-lg text-[#A1A1AA] transition-colors hover:bg-[#F4F4F5] hover:text-[#3F3F46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 disabled:opacity-40 dark:text-[#64748B] dark:hover:bg-[#1B2539] dark:hover:text-[#D6DEEA] lg:right-5 lg:top-5"
        >
          <X className="size-5" aria-hidden />
        </button>

        {/* ============================ Barra lateral ============================ */}
        <aside className="custom-scrollbar flex shrink-0 flex-col border-b border-[#F0F0F2] bg-[#FAFAFA] dark:border-[#1F2A3C] dark:bg-[#0B1220] lg:w-70 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3 px-5 pb-3 pr-16 pt-5 lg:block lg:px-6 lg:pb-5 lg:pr-6 lg:pt-6">
            <span
              className="cot-tick inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#17235B] text-[#E6A23C] dark:bg-[#1B2A63] lg:size-11"
              aria-hidden
            >
              <Satellite className="size-5" strokeWidth={1.9} />
            </span>
            <div className="min-w-0 lg:mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]">
                Cuenta Antarix GPS
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h2
                  id={titleId}
                  className="min-w-0 truncate text-[18px] font-semibold leading-tight tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC] lg:whitespace-normal lg:text-[20px]"
                  title={user?.name || undefined}
                >
                  {user?.name && user.name !== "—" ? user.name : "Cuenta"}
                </h2>
                {user ? <WialonStatusBadge status={user.status} /> : null}
              </div>
            </div>
          </div>

          <nav aria-label="Secciones de la cuenta" className="shrink-0">
            <div
              role="tablist"
              aria-label="Secciones de la cuenta"
              className="flex gap-1 overflow-x-auto px-3 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-col lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden"
            >
              {TAB_ORDER.map((tab) => {
                const active = activeTab === tab;
                const Icon = TAB_ICON[tab];
                const { label, hint } = TAB_META[tab];
                const count = tab === "unidades" && fleetUnits.length > 0 ? fleetUnits.length : null;
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    id={tabIds[tab]}
                    tabIndex={active ? 0 : -1}
                    aria-selected={active}
                    aria-controls={panelIds[tab]}
                    onClick={() => setActiveTab(tab)}
                    onKeyDown={(e) => handleTabKeyDown(e, tab)}
                    className={cn(
                      "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 lg:w-full",
                      active
                        ? "bg-white shadow-[0_1px_3px_rgba(9,9,11,0.08)] ring-1 ring-[#E4E4E7] dark:bg-[#111827] dark:ring-[#273244]"
                        : "hover:bg-white/70 dark:hover:bg-[#111827]/60",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex size-7 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
                        active
                          ? "bg-[#1B5CFF] text-white dark:bg-[#4B7CFF]"
                          : "bg-white text-[#71717A] ring-1 ring-inset ring-[#E4E4E7] dark:bg-[#111827] dark:text-[#8EA0B8] dark:ring-[#273244]",
                      )}
                      aria-hidden
                    >
                      <Icon className="size-3.5" strokeWidth={2.2} />
                    </span>
                    <span className="min-w-0 flex-1 pr-1">
                      <span
                        className={cn(
                          "block whitespace-nowrap text-[14px]",
                          active
                            ? "font-semibold text-[#09090B] dark:text-[#F8FAFC]"
                            : "font-medium text-[#3F3F46] dark:text-[#D6DEEA]",
                        )}
                      >
                        {label}
                      </span>
                      <span className="hidden text-[12px] text-[#71717A] dark:text-[#8EA0B8] lg:block">{hint}</span>
                    </span>
                    {count != null ? (
                      <span className="rounded-full bg-[#EEF3FF] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#1B5CFF] dark:bg-[#1B2A63] dark:text-[#9BB6FF]">
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </nav>

          {user ? (
            <dl className="mt-auto hidden shrink-0 space-y-3 border-t border-[#F0F0F2] px-6 py-5 dark:border-[#1F2A3C] lg:mt-6 lg:block">
              {summaryRows.map((r) => {
                const value = r.value && r.value !== "—" ? r.value : "";
                return (
                  <div key={r.label}>
                    <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A1A1AA] dark:text-[#64748B]">
                      {r.label}
                    </dt>
                    <dd
                      className={cn(
                        "mt-0.5 truncate text-[13px]",
                        value ? "font-medium text-[#27272A] dark:text-[#E5E7EB]" : "text-[#A1A1AA] dark:text-[#64748B]",
                        value && r.mono && "font-mono text-[12.5px] text-[#1B5CFF] dark:text-[#7FA2FF]",
                      )}
                      title={value || undefined}
                    >
                      {value || "Sin definir"}
                    </dd>
                  </div>
                );
              })}
            </dl>
          ) : null}
        </aside>

        {/* ============================ Contenido de la sección ============================ */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="relative hidden shrink-0 border-b border-[#F0F0F2] dark:border-[#1F2A3C] lg:block lg:px-8 lg:py-5 lg:pr-16">
            <div key={activeTab} className="cot-fade flex items-start gap-3.5">
              <span
                className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63] dark:text-[#9BB6FF]"
                aria-hidden
              >
                <SectionIcon className="size-5" strokeWidth={1.9} />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-[#1B5CFF] dark:text-[#7FA2FF]">
                  {canEdit ? "Edición" : "Solo lectura"}
                </p>
                <h3 className="text-[20px] font-semibold tracking-[-0.4px] text-[#09090B] dark:text-[#F8FAFC]">
                  {meta.label}
                </h3>
                <p className="mt-0.5 text-[13px] text-[#71717A] dark:text-[#8EA0B8]">{meta.description}</p>
              </div>
            </div>
          </header>

          {/* Panel Cuenta */}
          <form
            id={cuentaPanelId}
            role="tabpanel"
            aria-labelledby={tabIds.cuenta}
            hidden={activeTab !== "cuenta"}
            onSubmit={handleAccountSubmit}
            noValidate
            className="erp-modal-form-scroll custom-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain bg-[#F7F7F8] touch-pan-y dark:bg-[#0F172A]/60 sm:touch-auto"
          >
            <div className="cot-fade mx-auto w-full max-w-3xl space-y-5 px-4 py-5 sm:px-8 sm:py-7">
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
            </div>
          </form>

          {/* Panel Flota */}
          <div
            id={unidadesPanelId}
            role="tabpanel"
            aria-labelledby={tabIds.unidades}
            hidden={activeTab !== "unidades"}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <WialonFleetPanel
              units={fleetUnits}
              loading={unitsLoading}
              error={unitsError}
              search={unitSearch}
              onSearchChange={setUnitSearch}
              selectedUnitId={selectedUnitId}
              onSelect={setSelectedUnitId}
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
            </WialonFleetPanel>
          </div>

          {/* ============================ Pie ============================ */}
          <footer
            className="flex shrink-0 items-center justify-between gap-3 border-t border-[#F0F0F2] bg-white px-4 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] dark:border-[#1F2A3C] dark:bg-[#111827] sm:px-8 sm:pb-3.5"
            aria-busy={footerBusy || undefined}
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={footerBusy}
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-[14px] font-medium text-[#71717A] transition-colors hover:bg-[#F4F4F5] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 disabled:opacity-50 dark:text-[#8EA0B8] dark:hover:bg-[#1B2539] dark:hover:text-[#F8FAFC]"
            >
              {saveTarget ? "Cancelar" : "Cerrar"}
            </button>
            {saveTarget ? (
              <button
                type="submit"
                form={saveTarget}
                disabled={footerBusy}
                aria-busy={saveInFlight || undefined}
                className={appModalBtn.primary}
              >
                {saveInFlight ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Check className="size-4" aria-hidden />
                )}
                {saveInFlight
                  ? "Guardando…"
                  : activeTab === "unidades"
                    ? "Guardar unidad"
                    : "Guardar cambios"}
              </button>
            ) : null}
          </footer>
        </div>
      </div>
    </Modal>
  );
}
