import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchApi } from "@/config/api";
import { cn } from "@/lib/utils";
import {
  erpInputLikeClass,
  erpPrimaryBtnClass,
  erpSansStyle,
  erpSearchInputClass,
  erpSecondaryBtnClass,
} from "../../shared/cuentasAntarixStyles";
import SearchableSelect from "@/components/form/SearchableSelect";
import { ListIcon, TrashBinIcon, UserIcon } from "@/icons";
import type {
  WialonAccessUser,
  WialonCustomField,
  WialonHwType,
  WialonUnitDetail,
  WialonUnitRow,
  WialonUnitUpdatePayload,
} from "../../shared/wialonTypes";
import { fetchWialonCatalogs } from "../../shared/wialonApi";
import { sharingPatchFromAccess, unitRowPatchFromDetail } from "../../shared/wialonMappers";
import {
  WialonDossierSection,
  WialonEmptyState,
  WialonErrorAlert,
  WialonLoadingState,
  WialonSharedBadge,
  WialonStatusBadge,
  WialonTelemetryChips,
  wialonDossierCardClass,
  wialonEyebrowClass,
  wialonIconBtnClass,
  wialonUiBadge,
  wialonUiCaption,
  wialonUiLabel,
  wialonUiValue,
} from "../chrome/WialonModalChrome";
import WialonUnitActivePanel from "./WialonUnitActivePanel";
import UnitSimPanel from "./UnitSimPanel";

// ---------- Estilos locales ----------

const uiIconOnPrimary = "h-4 w-4 shrink-0 text-white/75";
const uiFieldInputClass = cn(erpInputLikeClass, "mt-0 w-full");

const unitSubTabTrackClass =
  "relative flex gap-1 overflow-x-auto rounded-[10px] border border-[#E7E7EA] bg-[#FAFAFA] p-1 dark:border-[#273244] dark:bg-[#1B2539] [-webkit-overflow-scrolling:touch] after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-6 after:bg-gradient-to-l after:from-[#FAFAFA] after:to-transparent dark:after:from-[#1B2539] after:transition-opacity motion-reduce:after:transition-none";

const unitSubTabBtnClass = (active: boolean) =>
  cn(
    "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 motion-reduce:transition-none",
    active
      ? "bg-white text-[#09090B] shadow-sm dark:bg-[#111827] dark:text-white"
      : "text-[#52525B] hover:text-[#09090B] dark:text-[#B7C1D1] dark:hover:text-white",
  );

const unitSubTabCountClass = (active: boolean) =>
  cn(
    "inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
    active
      ? "bg-[#1B5CFF]/12 text-[#1244D1] dark:bg-[#4B7CFF]/20 dark:text-[#4B7CFF]"
      : "bg-[#E7E7EA] text-[#52525B] dark:bg-[#273244] dark:text-[#B7C1D1]",
  );

// ---------- Tipos ----------

export type UnitBusyState = { saving: boolean; accessBusy: boolean; activeBusy?: boolean };

export type UnitFormProps = {
  unitId: number | null;
  contextUserId: number | null;
  canEdit: boolean;
  unitSummary?: WialonUnitRow | null;
  /** Enlaza el formulario con el pie del modal padre (`form` en submit). */
  formId?: string;
  onBusyChange?: (busy: UnitBusyState) => void;
  onSaved: (patch?: Partial<WialonUnitRow>) => void;
  onBackToList?: () => void;
};

type AccessOption = WialonAccessUser;

/** Sub-secciones de la ficha de unidad (pestaña Flota → detalle). */
type UnitSectionKey = "datos" | "sim" | "servicio" | "campos" | "accesos";

const UNIT_SECTIONS: { key: UnitSectionKey; label: string }[] = [
  { key: "datos", label: "Datos" },
  { key: "sim", label: "SIM" },
  { key: "servicio", label: "Servicio" },
  { key: "campos", label: "Campos" },
  { key: "accesos", label: "Accesos" },
];

function emptyField(): WialonCustomField {
  return { name: "", value: "", callMode: "create" };
}

// ---------- Componente ----------

export default function WialonUnitEditForm({
  unitId,
  contextUserId,
  canEdit,
  unitSummary,
  formId,
  onBusyChange,
  onSaved,
  onBackToList,
}: UnitFormProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<WialonUnitDetail | null>(null);
  const [hwTypes, setHwTypes] = useState<WialonHwType[]>([]);
  const [accessOptions, setAccessOptions] = useState<AccessOption[]>([]);

  const [name, setName] = useState("");
  const [hwId, setHwId] = useState("");
  const [uid, setUid] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fields, setFields] = useState<WialonCustomField[]>([]);
  const [deletedFieldIds, setDeletedFieldIds] = useState<number[]>([]);
  const [accessUsers, setAccessUsers] = useState<WialonAccessUser[]>([]);
  const [grantUserId, setGrantUserId] = useState("");
  const [accessBusy, setAccessBusy] = useState(false);
  const [activeBusy, setActiveBusy] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [unitSection, setUnitSection] = useState<UnitSectionKey>("datos");
  const detailCacheRef = useRef<Map<number, WialonUnitDetail>>(new Map());
  const unitSummaryRef = useRef(unitSummary);
  unitSummaryRef.current = unitSummary;
  const [displayUnitId, setDisplayUnitId] = useState<number | null>(unitId);

  const baseline = useMemo(() => detail, [detail]);

  const applyDetail = useCallback((unit: WialonUnitDetail) => {
    setDetail(unit);
    setDisplayUnitId(unit.wialon_id);
    setName(unit.name || "");
    setHwId(unit.hw_id != null ? String(unit.hw_id) : "");
    setUid(unit.uid || "");
    setPhone(unit.phone || "");
    setPassword("");
    setFields((unit.custom_fields || []).map((f) => ({ ...f, callMode: "update" as const })));
    setDeletedFieldIds([]);
    setAccessUsers(unit.access_users || []);
  }, []);

  const loadCatalogs = useCallback(async () => {
    const cached = await fetchWialonCatalogs();
    setHwTypes(cached.hwTypes);
    setAccessOptions(cached.accessUsers);
  }, []);

  const loadDetail = useCallback(
    async (options?: { silent?: boolean; cancelled?: () => boolean }) => {
      if (!unitId) return;
      const stale = () => Boolean(options?.cancelled?.());
      const cached = detailCacheRef.current.get(unitId);
      if (cached) {
        if (!stale()) {
          applyDetail(cached);
          setLoading(false);
          setError("");
        }
        return;
      }

      if (!options?.silent) setLoading(true);
      if (!stale()) setError("");
      try {
        const qs = contextUserId ? `?context_user_id=${contextUserId}` : "";
        const res = await fetchApi(`/api/wialon/unidades/${unitId}/${qs}`, {
          method: "GET",
          cache: "no-store" as RequestCache,
        });
        const data = await res.json().catch(() => null);
        if (stale()) return;
        if (!res.ok) {
          setError(String(data?.detail || `Error HTTP ${res.status}`));
          return;
        }
        const unit = data?.unit as WialonUnitDetail;
        detailCacheRef.current.set(unitId, unit);
        applyDetail(unit);
      } catch {
        if (!stale()) setError("No se pudo cargar la unidad.");
      } finally {
        if (!stale()) setLoading(false);
      }
    },
    [unitId, contextUserId, applyDetail],
  );

  useEffect(() => {
    void loadCatalogs();
  }, [loadCatalogs]);

  useEffect(() => {
    if (!unitId) {
      setDetail(null);
      setDisplayUnitId(null);
      setError("");
      setLoading(false);
      setConfirmDeactivate(false);
      return;
    }
    setConfirmDeactivate(false);
    setUnitSection("datos");
    const cached = detailCacheRef.current.get(unitId);
    const summary = unitSummaryRef.current;
    if (cached) {
      applyDetail(cached);
      setLoading(false);
      setError("");
    } else if (summary?.wialon_id === unitId) {
      setDisplayUnitId(unitId);
      setName(summary.name || "");
      setHwId("");
      setUid(summary.uid === "—" ? "" : summary.uid || "");
      setPhone(summary.phone === "—" ? "" : summary.phone || "");
      setPassword("");
      setFields([]);
      setDeletedFieldIds([]);
      setAccessUsers([]);
      setLoading(true);
      setError("");
    }
    let cancelled = false;
    void loadDetail({
      silent: Boolean(cached) || summary?.wialon_id === unitId,
      cancelled: () => cancelled,
    });
    return () => {
      cancelled = true;
    };
  }, [unitId, loadDetail, applyDetail]);

  useEffect(() => {
    onBusyChange?.({ saving, accessBusy, activeBusy });
  }, [saving, accessBusy, activeBusy, onBusyChange]);

  const grantableUsers = useMemo(() => {
    const existing = new Set(accessUsers.map((u) => u.wialon_id));
    if (contextUserId) existing.add(contextUserId);
    return accessOptions.filter((u) => !existing.has(u.wialon_id));
  }, [accessOptions, accessUsers, contextUserId]);

  const hwTypeOptions = useMemo(
    () =>
      hwTypes.map((t) => ({
        value: String(t.id),
        label: t.name || `Tipo ${t.id}`,
      })),
    [hwTypes],
  );

  const grantUserOptions = useMemo(
    () =>
      grantableUsers.map((u) => ({
        value: String(u.wialon_id),
        label: u.name || u.user_id || String(u.wialon_id),
        accentPrefix: u.user_id || undefined,
      })),
    [grantableUsers],
  );

  const handleGrantAccess = async () => {
    if (!unitId || !grantUserId) return;
    setAccessBusy(true);
    setError("");
    try {
      const res = await fetchApi(`/api/wialon/unidades/${unitId}/accesos/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: Number(grantUserId) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(String(data?.detail || `Error HTTP ${res.status}`));
        return;
      }
      setGrantUserId("");
      const granted = accessOptions.find((u) => u.wialon_id === Number(grantUserId));
      const nextUsers = granted
        ? [...accessUsers.filter((u) => u.wialon_id !== granted.wialon_id), granted]
        : accessUsers;
      setAccessUsers(nextUsers);
      const cached = detailCacheRef.current.get(unitId);
      if (cached) {
        detailCacheRef.current.set(unitId, { ...cached, access_users: nextUsers });
      }
      onSaved(sharingPatchFromAccess(nextUsers, contextUserId));
    } catch {
      setError("No se pudo conceder acceso.");
    } finally {
      setAccessBusy(false);
    }
  };

  const handleRevokeAccess = async (userId: number) => {
    if (!unitId) return;
    setAccessBusy(true);
    setError("");
    try {
      const res = await fetchApi(`/api/wialon/unidades/${unitId}/accesos/${userId}/`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(String(data?.detail || `Error HTTP ${res.status}`));
        return;
      }
      const nextUsers = accessUsers.filter((u) => u.wialon_id !== userId);
      setAccessUsers(nextUsers);
      const cached = detailCacheRef.current.get(unitId);
      if (cached) {
        detailCacheRef.current.set(unitId, { ...cached, access_users: nextUsers });
      }
      onSaved(sharingPatchFromAccess(nextUsers, contextUserId));
    } catch {
      setError("No se pudo revocar acceso.");
    } finally {
      setAccessBusy(false);
    }
  };

  const unitIsActive =
    detail?.is_active === true ||
    detail?.status === "Activo" ||
    (detail?.is_active == null && detail?.status !== "Inactivo");

  const handleToggleActive = async (nextActive: boolean) => {
    if (!unitId || !canEdit || activeBusy) return;
    setActiveBusy(true);
    setError("");
    try {
      const res = await fetchApi(`/api/wialon/unidades/${unitId}/activo/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: nextActive,
          ...(contextUserId ? { context_user_id: contextUserId } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(String(data?.detail || `Error HTTP ${res.status}`));
        return;
      }
      const unit = data?.unit as WialonUnitDetail | undefined;
      if (unit) {
        detailCacheRef.current.set(unitId, unit);
        applyDetail(unit);
        onSaved({
          status: unit.status,
          is_active: unit.is_active,
          name: unit.name,
          uid: unit.uid,
          phone: unit.phone,
          device_type: unit.device_type,
        });
      }
      setConfirmDeactivate(false);
    } catch {
      setError(
        nextActive ? "No se pudo reactivar la unidad." : "No se pudo desactivar la unidad.",
      );
    } finally {
      setActiveBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitId || !baseline || !canEdit || saving) return;

    const payload: WialonUnitUpdatePayload = {};
    const trimmedName = name.trim();
    if (trimmedName !== (baseline.name || "")) payload.name = trimmedName;
    if (hwId !== (baseline.hw_id != null ? String(baseline.hw_id) : "")) {
      payload.hw_id = Number(hwId);
    }
    if (uid.trim() !== (baseline.uid || "")) payload.uid = uid.trim();
    if (phone.trim() !== (baseline.phone || "")) payload.phone = phone.trim();
    if (password.trim()) payload.access_password = password.trim();

    const customOps: WialonCustomField[] = [];
    for (const field of fields) {
      const baseField = baseline.custom_fields.find((f) => f.id === field.id);
      const isNew = !field.id;
      const nameChanged = (field.name || "") !== (baseField?.name || "");
      const valueChanged = (field.value || "") !== (baseField?.value || "");
      if (isNew && (field.name.trim() || field.value.trim())) {
        customOps.push({ name: field.name.trim(), value: field.value.trim(), callMode: "create" });
      } else if (field.id && (nameChanged || valueChanged)) {
        customOps.push({
          id: field.id,
          name: field.name.trim(),
          value: field.value.trim(),
          callMode: "update",
        });
      }
    }
    for (const id of deletedFieldIds) {
      customOps.push({ id, name: "", value: "", callMode: "delete" });
    }
    if (customOps.length) payload.custom_fields = customOps;

    if (Object.keys(payload).length === 0) return;

    setSaving(true);
    setError("");
    try {
      const res = await fetchApi(`/api/wialon/unidades/${unitId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(String(data?.detail || `Error HTTP ${res.status}`));
        return;
      }
      const unit = data?.unit as WialonUnitDetail | undefined;
      if (unit?.wialon_id != null) {
        detailCacheRef.current.set(unitId, unit);
        applyDetail(unit);
        onSaved(unitRowPatchFromDetail(unit, contextUserId));
      } else {
        onSaved({ name: trimmedName, uid: uid.trim() || "—", phone: phone.trim() || "—" });
      }
    } catch {
      setError("No se pudo guardar la unidad en Wialon.");
    } finally {
      setSaving(false);
    }
  };

  const isDetailStale = unitId != null && displayUnitId !== unitId;
  const showDetailLoader = loading && (!detail || isDetailStale) && displayUnitId !== unitId;

  if (!unitId) {
    return (
      <WialonEmptyState
        title="Selecciona una unidad"
        description="Elige una unidad de la lista para ver y editar sus datos en Wialon."
        icon={
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M12 2 4 7v10l8 5 8-5V7l-8-5Z" strokeLinejoin="round" />
          </svg>
        }
      />
    );
  }

  if (showDetailLoader && !detail) {
    return (
      <div className="min-h-0 flex-1">
        <WialonLoadingState label="Cargando unidad…" compact />
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1">
      {showDetailLoader ? (
        <div
          className="absolute inset-0 z-10 flex items-start justify-center rounded-xl bg-[#FAFAFA]/80 pt-12 dark:bg-[#111827]/70"
          aria-live="polite"
        >
          <WialonLoadingState label="Cargando unidad…" compact />
        </div>
      ) : null}

      <form
        id={formId}
        onSubmit={handleSubmit}
        className={cn("space-y-4", showDetailLoader && "pointer-events-none invisible")}
        style={erpSansStyle}
        aria-busy={saving || accessBusy || showDetailLoader}
      >
        {onBackToList ? (
          <button
            type="button"
            onClick={onBackToList}
            disabled={saving || accessBusy}
            aria-label="Volver a la lista de flota"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-[#6E6E77] underline-offset-2 hover:text-[#1B5CFF] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:text-[#8EA0B8] dark:hover:text-[#4B7CFF] lg:hidden"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Volver a la flota
          </button>
        ) : null}

        <div className="flex items-start gap-3">
          <span
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1B5CFF] text-lg font-medium text-white"
            aria-hidden
          >
            {(name || unitSummary?.name || "?").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className={wialonEyebrowClass}>Unidad</p>
            <h3 className="mt-0.5 truncate text-base font-semibold leading-[1.3] tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC] sm:text-base">
              {name.trim() || unitSummary?.name || "Sin nombre"}
            </h3>
            <p className="mt-1 truncate font-mono text-sm tracking-wide text-[#1B5CFF] dark:text-[#4B7CFF]">
              {uid.trim() ||
                (unitSummary?.uid && unitSummary.uid !== "—" ? unitSummary.uid : "Sin UID")}
            </p>
            <WialonTelemetryChips
              unit={{
                last_state: detail?.last_state ?? unitSummary?.last_state,
                speed_kmh: detail?.speed_kmh ?? unitSummary?.speed_kmh,
                is_online: detail?.is_online ?? unitSummary?.is_online,
                online_label: detail?.online_label ?? unitSummary?.online_label,
                engine_on: detail?.engine_on ?? unitSummary?.engine_on,
                engine_label: detail?.engine_label ?? unitSummary?.engine_label,
                last_message_at: detail?.last_message_at ?? unitSummary?.last_message_at ?? "—",
              }}
            />
          </div>
          {detail ? <WialonStatusBadge status={detail.status ?? "—"} /> : null}
        </div>

        {error ? <WialonErrorAlert message={error} /> : null}

        {loading && !showDetailLoader ? (
          <p className={cn(wialonUiCaption, "m-0")} role="status" aria-live="polite">
            Actualizando datos de Wialon…
          </p>
        ) : null}

        {unitSummary?.is_shared ? (
          <div
            className="flex flex-wrap items-start gap-2 rounded-xl border border-[#1B5CFF]/20 bg-[#F1F5FF] px-3.5 py-2.5 dark:border-[#4B7CFF]/25 dark:bg-[#1B5CFF]/10"
            role="status"
          >
            <WialonSharedBadge
              sharedWith={unitSummary.shared_with}
              count={unitSummary.shared_users_count}
            />
            {unitSummary.shared_with && unitSummary.shared_with !== "—" ? (
              <p className="min-w-0 flex-1 text-sm text-[#3d3d3a] dark:text-[#e2e8f0]">
                También asignada a{" "}
                <span className="font-medium text-[#141413] dark:text-[#f8fafc]">
                  {unitSummary.shared_with}
                </span>
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Sub-tabs de sección */}
        <div
          className={unitSubTabTrackClass}
          role="tablist"
          aria-label="Secciones de la unidad"
        >
          {UNIT_SECTIONS.map((s) => {
            const count =
              s.key === "campos" ? fields.length : s.key === "accesos" ? accessUsers.length : null;
            const active = unitSection === s.key;
            return (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setUnitSection(s.key)}
                className={unitSubTabBtnClass(active)}
              >
                {s.label}
                {count != null && count > 0 ? (
                  <span className={unitSubTabCountClass(active)}>{count}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* --- Datos --- */}
        <div role="tabpanel" hidden={unitSection !== "datos"}>
          <WialonDossierSection
            title="Identificación"
            subtitle="Nombre, tipo y UID se escriben en Wialon al guardar"
          >
            <div className={cn(wialonDossierCardClass, "@container min-w-0")}>
              <div className="space-y-4">
                <div className="min-w-0">
                  <label htmlFor="unit-edit-name" className={wialonUiLabel}>
                    Nombre
                  </label>
                  <input
                    id="unit-edit-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={cn(erpInputLikeClass, "mt-2 w-full")}
                    required
                    disabled={!canEdit || saving}
                  />
                </div>

                <div className="grid grid-cols-1 items-start gap-4 @min-[34rem]:grid-cols-2">
                  <div className="relative z-20 min-w-0 w-full">
                    <SearchableSelect
                      label="Tipo de dispositivo"
                      value={hwId}
                      onChange={setHwId}
                      options={hwTypeOptions}
                      disabled={!canEdit || saving}
                      required
                      placeholder="Buscar dispositivo..."
                    />
                  </div>

                  <div className="min-w-0 w-full">
                    <label
                      htmlFor="unit-edit-uid"
                      className={cn(wialonUiLabel, "mb-1.5 block")}
                    >
                      ID único
                    </label>
                    <input
                      id="unit-edit-uid"
                      type="text"
                      value={uid}
                      onChange={(e) => setUid(e.target.value)}
                      className={cn(erpInputLikeClass, "w-full font-mono text-sm tracking-wide")}
                      required
                      disabled={!canEdit || saving}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 items-start gap-4 border-t border-[#E7E7EA]/80 pt-4 dark:border-[#273244]/70 @min-[34rem]:grid-cols-2">
                  <div className="min-w-0">
                    <label htmlFor="unit-edit-phone" className={wialonUiLabel}>
                      Número de teléfono
                    </label>
                    <input
                      id="unit-edit-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={cn(erpInputLikeClass, "mt-2 w-full")}
                      disabled={!canEdit || saving}
                      autoComplete="tel"
                    />
                  </div>

                  <div className="min-w-0">
                    <label htmlFor="unit-edit-password" className={wialonUiLabel}>
                      Contraseña de acceso
                    </label>
                    <input
                      id="unit-edit-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        detail?.has_password
                          ? "Dejar vacío para no cambiar"
                          : "Nueva contraseña"
                      }
                      className={cn(erpInputLikeClass, "mt-2 w-full")}
                      disabled={!canEdit || saving}
                      autoComplete="new-password"
                    />
                    <p className={cn("mt-1.5", wialonUiCaption)}>
                      Wialon no muestra la actual; solo puedes poner una nueva.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </WialonDossierSection>
        </div>

        {/* --- SIM --- */}
        <div role="tabpanel" hidden={unitSection !== "sim"}>
          <WialonDossierSection
            title="SIM / M2M"
            subtitle="Estado M2M de la línea; los SMS de comando salen por Wialon (GSM)"
          >
            <UnitSimPanel
              unitId={unitId}
              uid={uid}
              phone={phone}
              canEdit={canEdit}
              disabled={saving || loading || activeBusy}
            />
          </WialonDossierSection>
        </div>

        {/* --- Servicio --- */}
        <div role="tabpanel" hidden={unitSection !== "servicio"}>
          <WialonDossierSection
            title="Potencia de la unidad"
            subtitle="Activa o pausa la facturación en Wialon sin borrar el dispositivo"
            badge={
              <span
                className={cn(
                  wialonUiBadge,
                  "ring-1 ring-inset",
                  unitIsActive
                    ? "bg-emerald-50 text-emerald-800 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/50"
                    : "bg-[#ebe6df] text-[#52525B] ring-[#D3D3D8] dark:bg-[#27272a] dark:text-[#d4d4d8] dark:ring-[#273244]",
                )}
              >
                {unitIsActive ? "Activa" : "Inactiva"}
              </span>
            }
          >
            <WialonUnitActivePanel
              unitIsActive={unitIsActive}
              canEdit={canEdit}
              confirmDeactivate={confirmDeactivate}
              activeBusy={activeBusy}
              saving={saving}
              loading={loading}
              onAskDeactivate={() => setConfirmDeactivate(true)}
              onCancelConfirm={() => setConfirmDeactivate(false)}
              onConfirmDeactivate={() => void handleToggleActive(false)}
              onReactivate={() => void handleToggleActive(true)}
            />
          </WialonDossierSection>
        </div>

        {/* --- Campos --- */}
        <div role="tabpanel" hidden={unitSection !== "campos"}>
          <WialonDossierSection
            title="Campos personalizados"
            subtitle="Pares nombre · valor que viajan con la unidad"
            badge={
              <span
                className={cn(
                  wialonUiBadge,
                  "border border-[#E7E7EA] bg-[#FAFAFA] text-[#52525B] dark:border-[#273244] dark:bg-[#111827] dark:text-[#B7C1D1]",
                )}
              >
                {fields.length}
              </span>
            }
            action={
              canEdit ? (
                <button
                  type="button"
                  className={cn(erpSecondaryBtnClass, "w-full sm:w-auto")}
                  disabled={saving}
                  onClick={() => setFields((prev) => [...prev, emptyField()])}
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                  <span>Agregar campo</span>
                </button>
              ) : undefined
            }
          >
            {fields.length === 0 ? (
              <WialonEmptyState
                title="Sin campos todavía"
                description="Agrega placa, VIN u otro dato que quieras ver en Wialon."
                icon={<ListIcon className="h-5 w-5" />}
              />
            ) : (
              <ul
                className="overflow-hidden rounded-2xl border border-[#E7E7EA]/90 bg-[#ffffff] dark:border-[#273244] dark:bg-[#0f172a]/40"
                role="list"
              >
                {fields.map((field, idx) => (
                  <li
                    key={field.id ?? `new-${idx}`}
                    className="border-b border-[#E7E7EA]/80 last:border-b-0 dark:border-[#273244]/70"
                  >
                    <div className="grid grid-cols-1 gap-3 p-3.5 sm:grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end sm:p-4">
                      <span
                        className="hidden text-lg font-medium tabular-nums text-[#1B5CFF] sm:block dark:text-[#4B7CFF]"
                        aria-hidden
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <label
                          htmlFor={`unit-field-name-${idx}`}
                          className={cn(wialonUiCaption, "mb-1.5 block font-medium")}
                        >
                          Nombre
                        </label>
                        <input
                          id={`unit-field-name-${idx}`}
                          type="text"
                          value={field.name}
                          onChange={(e) =>
                            setFields((prev) =>
                              prev.map((f, i) => (i === idx ? { ...f, name: e.target.value } : f)),
                            )
                          }
                          placeholder="Ej. Placa, VIN…"
                          className={uiFieldInputClass}
                          disabled={!canEdit || saving}
                        />
                      </div>
                      <div className="min-w-0">
                        <label
                          htmlFor={`unit-field-value-${idx}`}
                          className={cn(wialonUiCaption, "mb-1.5 block font-medium")}
                        >
                          Valor
                        </label>
                        <input
                          id={`unit-field-value-${idx}`}
                          type="text"
                          value={field.value}
                          onChange={(e) =>
                            setFields((prev) =>
                              prev.map((f, i) =>
                                i === idx ? { ...f, value: e.target.value } : f,
                              ),
                            )
                          }
                          placeholder="Contenido del campo"
                          className={uiFieldInputClass}
                          disabled={!canEdit || saving}
                        />
                      </div>
                      {canEdit ? (
                        <button
                          type="button"
                          className={cn(wialonIconBtnClass, "self-end")}
                          disabled={saving}
                          aria-label={`Quitar campo ${field.name || idx + 1}`}
                          onClick={() => {
                            if (field.id) setDeletedFieldIds((prev) => [...prev, field.id!]);
                            setFields((prev) => prev.filter((_, i) => i !== idx));
                          }}
                        >
                          <TrashBinIcon className="h-4 w-4" aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </WialonDossierSection>
        </div>

        {/* --- Accesos --- */}
        <div role="tabpanel" hidden={unitSection !== "accesos"}>
          <WialonDossierSection
            title="Accesos compartidos"
            subtitle="Quién más puede ver esta unidad en Wialon"
            badge={
              <span
                className={cn(
                  wialonUiBadge,
                  "border border-[#E7E7EA] bg-[#FAFAFA] text-[#52525B] dark:border-[#273244] dark:bg-[#111827] dark:text-[#B7C1D1]",
                )}
              >
                {accessUsers.length}
              </span>
            }
          >
            {accessUsers.length === 0 ? (
              <WialonEmptyState
                title="Solo el titular"
                description="Concede acceso si otra cuenta necesita monitorear esta unidad."
                icon={<UserIcon className="h-5 w-5" />}
              />
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2" role="list">
                {accessUsers.map((u) => (
                  <li
                    key={u.wialon_id}
                    className="flex items-center gap-3 rounded-2xl border border-[#E7E7EA]/90 bg-gradient-to-br from-[#ffffff] to-[#FAFAFA] px-3.5 py-3 dark:border-[#273244] dark:from-[#111827]/70 dark:to-[#0f172a]/40"
                  >
                    <span
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1B5CFF]/15 text-sm font-medium text-[#1244D1] dark:bg-[#4B7CFF]/15 dark:text-[#4B7CFF]"
                      aria-hidden
                    >
                      {(u.name || u.user_id || "?").slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#09090B] dark:text-[#f8fafc]">
                        {u.name}
                      </p>
                      <p className="truncate font-mono text-[11px] text-[#1B5CFF] dark:text-[#4B7CFF]">
                        {u.user_id}
                      </p>
                    </div>
                    {canEdit ? (
                      <button
                        type="button"
                        className={wialonIconBtnClass}
                        disabled={accessBusy || saving}
                        aria-label={`Quitar acceso de ${u.name || u.user_id}`}
                        onClick={() => void handleRevokeAccess(u.wialon_id)}
                      >
                        <TrashBinIcon className="h-4 w-4" aria-hidden />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            {canEdit ? (
              <div className="relative z-30 rounded-2xl border border-[#1B5CFF]/25 bg-gradient-to-br from-[#F1F5FF] via-[#ffffff] to-[#FAFAFA] p-4 dark:border-[#1B5CFF]/20 dark:from-[#17235B]/20 dark:via-[#111827]/80 dark:to-[#0f172a]/70">
                <p className={wialonEyebrowClass}>Conceder acceso</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="relative z-30 min-w-0 flex-1 overflow-visible">
                    <SearchableSelect
                      label="Usuario Wialon"
                      value={grantUserId}
                      onChange={setGrantUserId}
                      options={grantUserOptions}
                      disabled={accessBusy || saving || grantableUsers.length === 0}
                      placeholder="Buscar usuario..."
                    />
                  </div>
                  <button
                    type="button"
                    className={cn(erpPrimaryBtnClass, "w-full sm:w-auto")}
                    disabled={!grantUserId || accessBusy || saving}
                    onClick={() => void handleGrantAccess()}
                  >
                    <UserIcon className={uiIconOnPrimary} aria-hidden />
                    <span>{accessBusy ? "Aplicando…" : "Dar acceso"}</span>
                  </button>
                </div>
                {grantableUsers.length === 0 ? (
                  <p className={cn("mt-2", wialonUiCaption)} role="status">
                    {accessOptions.length === 0
                      ? "No se pudieron cargar los usuarios Wialon. Cierra y vuelve a abrir la ficha, o pulsa Actualizar en la página."
                      : "Todos los usuarios disponibles ya tienen acceso a esta unidad."}
                  </p>
                ) : null}
              </div>
            ) : null}
          </WialonDossierSection>
        </div>

        {/* Búsqueda de unidad dentro del modal (flota sidebar) - referencia al aria de búsqueda */}
        <div className="sr-only" aria-live="polite">
          {wialonUiValue && wialonUiLabel && erpSearchInputClass ? null : null}
        </div>
      </form>
    </div>
  );
}
