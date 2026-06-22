import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/modal";
import { fetchApi } from "@/config/api";
import { cn } from "@/lib/utils";
import { modalTabBaseClass, selectLikeClassName } from "@/components/clientes/clienteFormShared";
import {
  erpInputLikeClass,
  erpPrimaryBtnClass,
  erpSansStyle,
  erpSearchInputClass,
  erpSecondaryBtnClass,
  erpSectionLabelClass,
  erpSubheadingClass,
} from "@/layout/erpPageStyles";
import SearchableSelect from "@/components/form/SearchableSelect";
import { ListIcon, TrashBinIcon, UserIcon } from "@/icons";
import type {
  UserModalTab,
  WialonAccessUser,
  WialonCustomField,
  WialonHwType,
  WialonUnitDetail,
  WialonUnitRow,
  WialonUnitUpdatePayload,
  WialonUserRow,
  WialonUserUpdatePayload,
} from "./wialonTypes";

// --- UI del modal Wialon (misma escala que TareasPage / ProductosPage) ---

const wialonUiLabel = erpSectionLabelClass;
const wialonUiCaption =
  "text-xs font-normal leading-relaxed text-[#78716c] dark:text-[#8ea0b8]";
const wialonUiValue =
  "text-sm font-medium leading-snug text-[#1c1917] dark:text-[#f8fafc]";
const wialonUiBadge =
  "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium leading-none tabular-nums";
const wialonBodyClass =
  "text-base font-normal leading-[1.6] text-[#57534e] dark:text-[#b7c1d1]";

const modalPanelClass =
  "rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-4 dark:border-[#273244] dark:bg-[#111a2b] sm:p-5";

const orangeBtn =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#ff801f] px-5 py-2.5 text-sm font-semibold text-black shadow-none transition-colors hover:bg-[#ff6a00] active:brightness-95 disabled:opacity-50 sm:min-h-0";

const orangeBtnOutline =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#e2d9ca] bg-white px-5 py-2.5 text-sm font-semibold text-[#44403c] transition-colors hover:bg-[#fafaf9] disabled:opacity-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#e5e7eb] dark:hover:bg-white/[0.05] sm:min-h-0";

const wialonModalShellClass =
  "my-2 flex max-h-[min(92dvh,860px)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-[#e7ded0] bg-white p-0 shadow-[0_24px_48px_-12px_rgba(28,25,23,0.18)] dark:border-[#334155] dark:bg-[#111a2b] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] sm:my-auto sm:w-[min(98vw,56rem)] sm:max-w-[56rem] lg:w-[min(98vw,72rem)] lg:max-w-[72rem]";

const wialonIconWrapClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ff801f]/10 text-[#ea580c] dark:bg-[#ff801f]/15 dark:text-[#fb923c]";

function WialonSharedBadge({
  sharedWith,
  count,
  compact = false,
  label: labelOverride,
}: {
  sharedWith?: string;
  count?: number;
  compact?: boolean;
  label?: string;
}) {
  const label =
    labelOverride ??
    (count && count > 1
      ? `Compartida · ${count} cuentas`
      : "Compartida");
  return (
    <span
      className={cn(
        wialonUiBadge,
        "bg-[#fff3e6] text-[#c45f00] ring-1 ring-[#ff801f]/20 dark:bg-[#ff801f]/15 dark:text-[#ffb366] dark:ring-[#ff801f]/25",
        compact && "text-[10px] px-2 py-0"
      )}
      title={sharedWith && sharedWith !== "—" ? `Con: ${sharedWith}` : undefined}
    >
      {label}
    </span>
  );
}

function WialonStatusBadge({ status }: { status: string }) {
  const active = status === "Activo";
  const unknown = !status || status === "—";
  return (
    <span
      className={cn(
        wialonUiBadge,
        unknown
          ? "bg-[#f5f0e8] text-[#78716c] dark:bg-[#1e293b] dark:text-[#94a3b8]"
          : active
            ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/40"
            : "bg-rose-50 text-rose-800 ring-1 ring-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800/40"
      )}
    >
      {unknown ? "Sin dato" : status}
    </span>
  );
}

function WialonErrorAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex gap-2.5 rounded-xl border border-rose-200/80 bg-rose-50/80 px-3.5 py-2.5 text-sm text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
    >
      <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
      </svg>
      <p className="min-w-0 flex-1 leading-relaxed">{message}</p>
    </div>
  );
}

function WialonSectionCard({
  title,
  subtitle,
  icon,
  action,
  badge,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const sectionId = `wialon-section-${title.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <section className={cn(modalPanelClass, className)} aria-labelledby={sectionId}>
      <div className="mb-4 flex flex-col gap-0.5 border-b border-[#f5f5f4] pb-3 dark:border-[#334155]/80">
        <div className="flex flex-wrap items-start gap-2">
          {icon ? <span className={wialonIconWrapClass} aria-hidden>{icon}</span> : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id={sectionId} className="text-sm font-semibold text-[#1c1917] dark:text-white">
                {title}
              </h3>
              {badge}
            </div>
            {subtitle ? <p className={cn("mt-1", wialonUiCaption)}>{subtitle}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function WialonEmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-[#e7ded0] bg-[#fcfaf6] px-4 py-10 text-center dark:border-[#334155] dark:bg-[#0f172a]/30">
      {icon ? (
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#e7ded0] bg-white/90 text-[#a8a29e] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#64748b]" aria-hidden>
          {icon}
        </span>
      ) : null}
      <p className={erpSubheadingClass}>{title}</p>
      {description ? <p className={cn("max-w-sm", wialonUiCaption)}>{description}</p> : null}
    </div>
  );
}

function WialonLoadingState({
  label = "Cargando…",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        compact ? "py-8" : "py-16"
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          "inline-flex animate-spin rounded-full border-2 border-[#ff801f] border-t-transparent",
          compact ? "h-7 w-7" : "h-10 w-10"
        )}
        aria-hidden
      />
      <p className={wialonUiCaption}>{label}</p>
    </div>
  );
}

function WialonReadOnlyGrid({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-[#e7ded0] bg-[#fffdfa] px-3 py-2.5 dark:border-[#334155] dark:bg-[#111827]/50">
          <dt className={wialonUiCaption}>{item.label}</dt>
          <dd className={cn("mt-1 break-words", wialonUiValue)}>{item.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

const wialonModalFooterClass =
  "shrink-0 border-t border-[#e7ded0] bg-[#fcfaf6] px-5 py-4 dark:border-[#334155] dark:bg-[#111827] sm:px-6";

type WialonFooterAction = {
  key: string;
  label: string;
  variant: "primary" | "secondary";
  type?: "button" | "submit";
  /** Asocia un submit con un form fuera del footer (HTML5 `form`). */
  form?: string;
  disabled?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  /** Nombre accesible cuando el label visible no basta (p. ej. solo icono). */
  ariaLabel?: string;
};

/**
 * Pie único del modal Wialon: evita barras sticky duplicadas y centraliza acciones.
 * Usar `form` en acciones submit para enlazar formularios en el cuerpo del diálogo.
 */
function WialonModalFooter({
  actions,
  busy = false,
  className,
}: {
  actions: WialonFooterAction[];
  busy?: boolean;
  className?: string;
}) {
  if (actions.length === 0) return null;

  return (
    <footer className={cn(wialonModalFooterClass, className)} aria-busy={busy || undefined}>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
        {actions.map((action) => (
          <button
            key={action.key}
            type={action.type ?? "button"}
            form={action.form}
            disabled={action.disabled}
            onClick={action.onClick}
            aria-label={action.ariaLabel}
            className={cn(
              action.variant === "primary" ? orangeBtn : orangeBtnOutline,
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff801f]"
            )}
          >
            {action.icon ? <span aria-hidden>{action.icon}</span> : null}
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </footer>
  );
}

// --- Formulario de unidad (pestaña Flota) ---

const uiIconMuted = "h-4 w-4 shrink-0 text-[#78716c] dark:text-[#8ea0b8]";
const uiIconOnPrimary = "h-4 w-4 shrink-0 text-black/75";
const uiFieldInputClass = cn(erpInputLikeClass, "mt-0 w-full");

type UnitBusyState = { saving: boolean; accessBusy: boolean };

type UnitFormProps = {
  unitId: number | null;
  contextUserId: number | null;
  canEdit: boolean;
  unitSummary?: Pick<WialonUnitRow, "is_shared" | "shared_with" | "shared_users_count"> | null;
  /** Enlaza el formulario con el pie del modal padre (`form` en submit). */
  formId?: string;
  onBusyChange?: (busy: UnitBusyState) => void;
  onSaved: () => void;
  onBackToList?: () => void;
};

type AccessOption = WialonAccessUser;

function emptyField(): WialonCustomField {
  return { name: "", value: "", callMode: "create" };
}

function WialonUnitEditForm({
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
  const detailCacheRef = useRef<Map<number, WialonUnitDetail>>(new Map());
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
    const [catRes, usersRes] = await Promise.all([
      fetchApi("/api/wialon/catalogos/unidades/", { method: "GET", cache: "no-store" as RequestCache }),
      fetchApi("/api/wialon/usuarios-acceso/", { method: "GET", cache: "no-store" as RequestCache }),
    ]);
    const catData = await catRes.json().catch(() => null);
    const usersData = await usersRes.json().catch(() => null);
    if (catRes.ok) {
      setHwTypes(Array.isArray(catData?.hw_types) ? catData.hw_types : []);
    }
    if (usersRes.ok) {
      setAccessOptions(Array.isArray(usersData?.users) ? usersData.users : []);
    }
  }, []);

  const loadDetail = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!unitId) return;
      const cached = detailCacheRef.current.get(unitId);
      if (cached) {
        applyDetail(cached);
        setLoading(false);
        setError("");
        return;
      }

      if (!options?.silent) setLoading(true);
      setError("");
      try {
        const qs = contextUserId ? `?context_user_id=${contextUserId}` : "";
        const res = await fetchApi(`/api/wialon/unidades/${unitId}/${qs}`, {
          method: "GET",
          cache: "no-store" as RequestCache,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError(String(data?.detail || `Error HTTP ${res.status}`));
          return;
        }
        const unit = data?.unit as WialonUnitDetail;
        detailCacheRef.current.set(unitId, unit);
        applyDetail(unit);
      } catch {
        setError("No se pudo cargar la unidad.");
      } finally {
        setLoading(false);
      }
    },
    [unitId, contextUserId, applyDetail]
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
      return;
    }
    void loadDetail();
  }, [unitId, loadDetail]);

  useEffect(() => {
    onBusyChange?.({ saving, accessBusy });
  }, [saving, accessBusy, onBusyChange]);

  const grantableUsers = useMemo(() => {
    const existing = new Set(accessUsers.map((u) => u.wialon_id));
    if (contextUserId) existing.add(contextUserId);
    return accessOptions.filter((u) => !existing.has(u.wialon_id));
  }, [accessOptions, accessUsers, contextUserId]);

  const hwTypeOptions = useMemo(
    () => [
      { value: "", label: "— Seleccionar —" },
      ...hwTypes.map((t) => ({
        value: String(t.id),
        label: t.name || `Tipo ${t.id}`,
      })),
    ],
    [hwTypes]
  );

  const grantUserOptions = useMemo(
    () => [
      { value: "", label: "— Usuario —" },
      ...grantableUsers.map((u) => ({
        value: String(u.wialon_id),
        label: `${u.user_id} · ${u.name}`,
      })),
    ],
    [grantableUsers]
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
      detailCacheRef.current.delete(unitId);
      await loadDetail({ silent: true });
      onSaved();
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
      detailCacheRef.current.delete(unitId);
      await loadDetail({ silent: true });
      onSaved();
    } catch {
      setError("No se pudo revocar acceso.");
    } finally {
      setAccessBusy(false);
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
        customOps.push({
          name: field.name.trim(),
          value: field.value.trim(),
          callMode: "create",
        });
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

    if (Object.keys(payload).length === 0) {
      return;
    }

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
      detailCacheRef.current.delete(unitId);
      await loadDetail({ silent: true });
      onSaved();
    } catch {
      setError("No se pudo guardar la unidad en Wialon.");
    } finally {
      setSaving(false);
    }
  };

  const isDetailStale = unitId != null && displayUnitId !== unitId;
  const showDetailLoader = loading && (!detail || isDetailStale);

  if (!unitId) {
    return (
      <WialonEmptyState
        title="Selecciona una unidad" description="Elige una unidad de la lista para ver y editar sus datos en Wialon."
        icon={
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 2 4 7v10l8 5 8-5V7l-8-5Z" strokeLinejoin="round" />
          </svg>
        }
      />
    );
  }

  if (showDetailLoader && !detail) {
    return (
      <div className="min-h-[min(420px,50dvh)]">
        <WialonLoadingState label="Cargando unidad…" compact />
      </div>
    );
  }

  return (
    <div className="relative min-h-[min(420px,50dvh)]">
      {showDetailLoader ? (
        <div
          className="absolute inset-0 z-10 flex items-start justify-center rounded-xl bg-[#fcfaf6]/80 pt-12 dark:bg-[#111827]/70"
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
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-[#6c6a64] underline-offset-2 hover:text-[#cc785c] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cc785c] dark:text-[#94a3b8] dark:hover:text-[#f4a98a]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver a la lista
        </button>
      ) : null}

      {error ? <WialonErrorAlert message={error} /> : null}

      {unitSummary?.is_shared ? (
        <div
          className="flex flex-wrap items-start gap-2 rounded-xl border border-[#cc785c]/25 bg-[#fff8f4] px-3.5 py-2.5 dark:border-[#cc785c]/30 dark:bg-[#cc785c]/10"
          role="status"
        >
          <WialonSharedBadge
            sharedWith={unitSummary.shared_with}
            count={unitSummary.shared_users_count}
          />
          {unitSummary.shared_with && unitSummary.shared_with !== "—" ? (
            <p className={cn("min-w-0 flex-1 text-sm text-[#3d3d3a] dark:text-[#e2e8f0]")}>
              También asignada a{" "}
              <span className="font-medium text-[#141413] dark:text-[#f8fafc]">{unitSummary.shared_with}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      <WialonSectionCard
        title="Datos de la unidad"
        subtitle="Identificación del dispositivo en Wialon Hosting"
        badge={detail ? <WialonStatusBadge status={detail.status ?? "—"} /> : null}
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 2 4 7v10l8 5 8-5V7l-8-5Z" strokeLinejoin="round" />
          </svg>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="unit-edit-name" className={wialonUiLabel}>
              Nombre
            </label>
            <input
              id="unit-edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn(erpSearchInputClass, "mt-2 w-full")}
              required
              disabled={!canEdit || saving}
            />
          </div>

          <SearchableSelect
            label="Tipo de dispositivo"
            value={hwId}
            onChange={setHwId}
            options={hwTypeOptions}
            disabled={!canEdit || saving}
            required
            placeholder="Buscar dispositivo..."
          />

          <div>
            <label htmlFor="unit-edit-uid" className={wialonUiLabel}>
              ID único
            </label>
            <input
              id="unit-edit-uid"
              type="text"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              className={cn(erpSearchInputClass, "mt-2 w-full font-mono text-sm")}
              required
              disabled={!canEdit || saving}
            />
          </div>

          <div>
            <label htmlFor="unit-edit-phone" className={wialonUiLabel}>
              Número de teléfono
            </label>
            <input
              id="unit-edit-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={cn(erpSearchInputClass, "mt-2 w-full")}
              disabled={!canEdit || saving}
              autoComplete="tel"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="unit-edit-password" className={wialonUiLabel}>
              Contraseña de acceso
            </label>
            <input
              id="unit-edit-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={detail?.has_password ? "Dejar vacío para no cambiar" : "Nueva contraseña"}
              className={cn(erpSearchInputClass, "mt-2 w-full")}
              disabled={!canEdit || saving}
              autoComplete="new-password"
            />
            <p className={cn("mt-1.5", wialonUiCaption)}>
              Wialon no devuelve la contraseña actual; solo puedes establecer una nueva.
            </p>
          </div>
        </div>
      </WialonSectionCard>

      <WialonSectionCard
        title="Campos personalizados"
        subtitle="Pares nombre · valor sincronizados con Wialon"
        icon={<ListIcon className="h-4 w-4" />}
        action={
          canEdit ? (
            <button
              type="button"
              className={cn(erpSecondaryBtnClass, "w-full sm:w-auto")}
              disabled={saving}
              onClick={() => setFields((prev) => [...prev, emptyField()])}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              <span>Agregar</span>
            </button>
          ) : undefined
        }
      >
        {fields.length === 0 ? (
          <WialonEmptyState title="Sin campos personalizados" icon={<ListIcon className="h-5 w-5" />} />
        ) : (
          <ul className="space-y-3" role="list">
            {fields.map((field, idx) => (
              <li
                key={field.id ?? `new-${idx}`}
                className="rounded-xl border border-[#e7ded0]/80 bg-[#fcfaf6]/50 p-3 dark:border-[#334155]/70 dark:bg-[#111827]/40"
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                  <div className="min-w-0">
                    <label htmlFor={`unit-field-name-${idx}`} className={cn(wialonUiCaption, "mb-1.5 block font-medium")}>
                      Nombre
                    </label>
                    <input
                      id={`unit-field-name-${idx}`}
                      type="text"
                      value={field.name}
                      onChange={(e) =>
                        setFields((prev) =>
                          prev.map((f, i) => (i === idx ? { ...f, name: e.target.value } : f))
                        )
                      }
                      placeholder="Ej. Placa, VIN…"
                      className={uiFieldInputClass}
                      disabled={!canEdit || saving}
                    />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor={`unit-field-value-${idx}`} className={cn(wialonUiCaption, "mb-1.5 block font-medium")}>
                      Valor
                    </label>
                    <input
                      id={`unit-field-value-${idx}`}
                      type="text"
                      value={field.value}
                      onChange={(e) =>
                        setFields((prev) =>
                          prev.map((f, i) => (i === idx ? { ...f, value: e.target.value } : f))
                        )
                      }
                      placeholder="Contenido del campo"
                      className={uiFieldInputClass}
                      disabled={!canEdit || saving}
                    />
                  </div>
                  {canEdit ? (
                    <div>
                      <span className={cn(wialonUiCaption, "mb-1.5 block font-medium lg:sr-only")}>Acción</span>
                      <button
                        type="button"
                        className={cn(
                          erpSecondaryBtnClass,
                          "w-full border-rose-200/70 text-rose-800/90 hover:bg-rose-50/80 dark:border-rose-900/35 dark:text-rose-300/90 dark:hover:bg-rose-950/25 lg:min-w-[7.5rem]"
                        )}
                        disabled={saving}
                        aria-label={`Quitar campo ${field.name || idx + 1}`}
                        onClick={() => {
                          if (field.id) setDeletedFieldIds((prev) => [...prev, field.id!]);
                          setFields((prev) => prev.filter((_, i) => i !== idx));
                        }}
                      >
                        <TrashBinIcon className={cn(uiIconMuted, "text-rose-700/80 dark:text-rose-400/80")} aria-hidden />
                        <span>Quitar</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </WialonSectionCard>

      <WialonSectionCard
        title="Accesos compartidos"
        subtitle="Usuarios Wialon con acceso además del titular de la cuenta"
        icon={<UserIcon className="h-4 w-4" />}
      >
        {accessUsers.length === 0 ? (
          <p className={wialonUiCaption}>Ningún acceso compartido registrado.</p>
        ) : (
          <ul className="space-y-2" role="list">
            {accessUsers.map((u) => (
              <li
                key={u.wialon_id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e7ded0] bg-white/80 px-3.5 py-2.5 shadow-[0_2px_8px_-6px_rgba(28,25,23,0.15)] dark:border-[#334155] dark:bg-[#111827]/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]">{u.name}</p>
                  <p className={cn("truncate font-mono text-[11px]", wialonUiCaption)}>{u.user_id}</p>
                </div>
                {canEdit ? (
                  <button
                    type="button"
                    className={cn(
                      erpSecondaryBtnClass,
                      "w-full shrink-0 border-rose-200/70 text-rose-800/90 hover:bg-rose-50/80 sm:w-auto dark:border-rose-900/35 dark:text-rose-300/90 dark:hover:bg-rose-950/25"
                    )}
                    disabled={accessBusy || saving}
                    onClick={() => void handleRevokeAccess(u.wialon_id)}
                  >
                    <TrashBinIcon className={cn(uiIconMuted, "text-rose-700/80 dark:text-rose-400/80")} aria-hidden />
                    <span>Quitar</span>
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canEdit ? (
          <div className="flex flex-col gap-2 border-t border-[#e7ded0]/70 pt-4 dark:border-[#334155]/60 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <SearchableSelect
                label="Conceder acceso a"
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
        ) : null}
      </WialonSectionCard>
    </form>
    </div>
  );
}

// --- Modal principal (export) ---

type EditWialonUserModalProps = {
  user: WialonUserRow | null;
  isOpen: boolean;
  initialTab?: UserModalTab;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (updated: WialonUserRow) => void;
};

export default function EditWialonUserModal({
  user,
  isOpen,
  initialTab = "cuenta",
  canEdit,
  onClose,
  onSaved,
}: EditWialonUserModalProps) {
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
    void loadUnits();
  }, [isOpen, user, loadUnits]);

  const activeUnits = useMemo(
    () =>
      units.filter((u) => {
        if (u.is_active === true || u.status === "Activo") return true;
        if (u.is_active === false || u.status === "Inactivo") return false;
        return true;
      }),
    [units]
  );

  const sharedUnits = useMemo(
    () => activeUnits.filter((u) => u.is_shared),
    [activeUnits]
  );

  const selectedUnit = useMemo(
    () => activeUnits.find((u) => u.wialon_id === selectedUnitId) ?? null,
    [activeUnits, selectedUnitId]
  );

  const filteredUnits = useMemo(() => {
    const q = unitSearch.trim().toLowerCase();
    if (!q) return activeUnits;
    return activeUnits.filter((u) =>
      [u.name, u.device_type, u.uid, u.phone, u.custom_fields, u.status, u.shared_with]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [activeUnits, unitSearch]);

  const footerBusy = saving || unitBusy.saving || unitBusy.accessBusy;

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

  const handleUnitSaved = useCallback(() => {
    void loadUnits();
  }, [loadUnits]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      closeOnBackdropClick={!saving}
      ariaLabelledBy={titleId}
      className={wialonModalShellClass}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={erpSansStyle}>
        <header className="relative shrink-0 border-b border-[#e7ded0] bg-[#fcfaf6] px-6 py-5 pr-14 dark:border-[#334155] dark:bg-[#111827] sm:pr-16">
          <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#ff801f]" aria-hidden />

          <div className="relative flex min-w-0 items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff801f] text-black shadow-sm">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" aria-hidden>
                <path d="M12 2 4 7v10l8 5 8-5V7l-8-5Z" strokeLinejoin="round" />
                <path d="M12 12 8 9.5V7l4 2.5v2.5L12 12Z" strokeLinejoin="round" />
              </svg>
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              <p className={wialonUiLabel}>Operación · Wialon Hosting</p>
              <h2 id={titleId} className={cn("mt-1.5 text-balance", erpSubheadingClass)}>
            {user?.name || "Cuenta"}
          </h2>
              <p className={cn("mt-1.5 max-w-2xl text-sm", wialonBodyClass)}>
                Login <span className="font-medium tabular-nums text-[#1c1917] dark:text-[#f8fafc]">{user?.user_id || "—"}</span>
                {user?.parent_account ? (
                  <>
                    <span className="mx-1.5 text-[#d6d3d1] dark:text-[#475569]">·</span>
                    {user.parent_account}
                  </>
                ) : null}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {user ? <WialonStatusBadge status={user.status} /> : null}
                <span className={cn(wialonUiBadge, "rounded-lg border border-[#e7ded0] bg-[#fcfaf6] text-[#57534e] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#cbd5e1]")}>
                  {unitsLoading ? "…" : `${activeUnits.length} activas`}
                </span>
                {!unitsLoading && sharedUnits.length > 0 ? (
                  <WialonSharedBadge
                    label={`${sharedUnits.length} compartida${sharedUnits.length === 1 ? "" : "s"}`}
                  />
                ) : null}
                {user?.dealer_rights === "Sí" ? (
                  <span className={cn(wialonUiBadge, "rounded-lg bg-[#fff3e6] text-[#c45f00] dark:bg-[#ff801f]/15 dark:text-[#ffb366]")}>
                    Distribuidor
                  </span>
                ) : null}
              </div>

              <div
                role="tablist"
                aria-label="Secciones de la cuenta"
                className="mt-4 inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-[#e7ded0] bg-[#fcfaf6] p-0.5 dark:border-[#334155] dark:bg-[#0f172a]"
              >
                <button
                  type="button"
                  role="tab"
                  id={`${cuentaPanelId}-tab`}
                  aria-selected={activeTab === "cuenta"}
                  aria-controls={cuentaPanelId}
                  onClick={() => setActiveTab("cuenta")}
                  className={cn(
                    modalTabBaseClass,
                    "whitespace-nowrap rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff801f]",
                    activeTab === "cuenta"
                      ? "bg-white text-[#ea580c] shadow-sm dark:bg-[#111a2b] dark:text-[#fb923c]"
                      : "bg-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                >
                  Datos de cuenta
                </button>
                <button
                  type="button"
                  role="tab"
                  id={`${unidadesPanelId}-tab`}
                  aria-selected={activeTab === "unidades"}
                  aria-controls={unidadesPanelId}
                  onClick={() => setActiveTab("unidades")}
                  className={cn(
                    modalTabBaseClass,
                    "whitespace-nowrap rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff801f]",
                    activeTab === "unidades"
                      ? "bg-white text-[#ea580c] shadow-sm dark:bg-[#111a2b] dark:text-[#fb923c]"
                      : "bg-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                >
                  Unidades
                  {activeUnits.length > 0 ? (
                    <span className="ml-1.5 rounded-full bg-[#fff3e6] px-1.5 py-0.5 text-[10px] font-semibold text-[#c45f00] dark:bg-[#ff801f]/20 dark:text-[#ffb366]">
                      {activeUnits.length}
                    </span>
                  ) : null}
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#fcfaf6]/60 dark:bg-[#111827]/40">
          <form
            id={cuentaPanelId}
            role="tabpanel"
            aria-labelledby={`${cuentaPanelId}-tab`}
            hidden={activeTab !== "cuenta"}
            onSubmit={handleAccountSubmit}
            className="space-y-4 px-5 py-5 pb-6 sm:px-6"
          >
              {error ? <WialonErrorAlert message={error} /> : null}

              <WialonSectionCard
                title="Información de facturación"
                subtitle="Datos editables sincronizados con Wialon Hosting"
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
              className={cn(erpSearchInputClass, "mt-2 w-full")}
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
                      className={cn(selectLikeClassName, "mt-2")}
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
                      className={cn(selectLikeClassName, "mt-2")}
                      disabled={!canEdit || saving}
            >
              <option value="Activo">Activo</option>
              <option value="Bloqueado">Bloqueado</option>
            </select>
                  </div>
                </div>
              </WialonSectionCard>

              <WialonSectionCard title="Metadatos de cuenta" subtitle="Solo lectura desde Wialon">
                <WialonReadOnlyGrid
                  items={[
                    { label: "Creador", value: user?.creator || "—" },
                    { label: "Cuenta padre", value: user?.parent_account || "—" },
                    { label: "Unidades activas", value: String(user?.assigned_units ?? activeUnits.length) },
                    { label: "Bloqueado", value: user?.blocked || "—" },
                  ]}
                />
              </WialonSectionCard>

              <WialonSectionCard
                title="Unidades compartidas"
                subtitle="Activas asignadas también a otras cuentas Wialon"
                badge={
                  !unitsLoading ? (
                    <span className={cn(wialonUiBadge, "bg-[#faf9f5] text-[#6c6a64] ring-1 ring-[#e6dfd8] dark:bg-[#111827] dark:text-[#94a3b8] dark:ring-[#334155]")}>
                      {sharedUnits.length}
                    </span>
                  ) : null
                }
              >
                {unitsLoading ? (
                  <WialonLoadingState label="Cargando unidades…" />
                ) : sharedUnits.length === 0 ? (
                  <p className={wialonUiCaption}>Ninguna unidad activa compartida con otras cuentas.</p>
                ) : (
                  <ul className="space-y-2" role="list">
                    {sharedUnits.map((unit) => (
                      <li
                        key={unit.wialon_id}
                        className="rounded-xl border border-[#e7ded0] bg-[#fffdfa] px-3.5 py-3 dark:border-[#334155] dark:bg-[#111827]/60"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[#141413] dark:text-[#f8fafc]">
                              {unit.name || "Sin nombre"}
                            </p>
                            <p className="mt-0.5 truncate font-mono text-[11px] text-[#6c6a64] dark:text-[#94a3b8]">
                              {unit.uid !== "—" ? unit.uid : "Sin UID"}
            </p>
          </div>
                          <WialonSharedBadge
                            sharedWith={unit.shared_with}
                            count={unit.shared_users_count}
                            compact
                          />
                        </div>
                        {unit.shared_with && unit.shared_with !== "—" ? (
                          <p className={cn("mt-2", wialonUiCaption)}>
                            Con{" "}
                            <span className="font-medium text-[#3d3d3a] dark:text-[#e2e8f0]">{unit.shared_with}</span>
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </WialonSectionCard>

              {!canEdit ? (
                <p className={cn("text-center", wialonUiCaption)}>No tienes permiso para editar esta cuenta.</p>
              ) : null}
          </form>

          <div
            id={unidadesPanelId}
            role="tabpanel"
            aria-labelledby={`${unidadesPanelId}-tab`}
            hidden={activeTab !== "unidades"}
            className="flex min-h-[min(520px,60dvh)] flex-col lg:flex-row"
          >
              <aside className="shrink-0 border-b border-[#e7ded0] bg-[#fcfaf6]/80 p-4 dark:border-[#334155] dark:bg-[#111827]/50 lg:w-[min(100%,340px)] lg:border-b-0 lg:border-r">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className={wialonUiLabel}>Flota activa</p>
                  <span className={cn(wialonUiCaption, "tabular-nums")}>
                    {filteredUnits.length} de {activeUnits.length}
                  </span>
                </div>

                <div className="relative mb-3">
                  <input
                    type="search"
                    value={unitSearch}
                    onChange={(e) => setUnitSearch(e.target.value)}
                    placeholder="Buscar por nombre, UID…"
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

                <div
                  className="custom-scrollbar max-h-[min(340px,45dvh)] space-y-1.5 overflow-y-auto lg:max-h-[min(560px,58dvh)]"
                  role="listbox"
                  aria-label="Unidades activas"
                >
                  {unitsLoading ? (
                    <WialonLoadingState label="Cargando unidades…" />
                  ) : unitsError ? (
                    <WialonErrorAlert message={unitsError} />
                  ) : filteredUnits.length === 0 ? (
                    <p className={cn("py-8 text-center", wialonUiCaption)}>
                      {activeUnits.length === 0
                        ? "Sin unidades activas asignadas."
                        : "Ninguna unidad activa coincide con la búsqueda."}
                    </p>
                  ) : (
                    filteredUnits.map((unit) => {
                      const selected = selectedUnitId === unit.wialon_id;
                      return (
                        <button
                          key={unit.wialon_id}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => setSelectedUnitId(unit.wialon_id)}
                          className={cn(
                            "relative w-full rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff801f]",
                            selected
                              ? "border-[#ff801f]/40 bg-[#fff8f1] ring-1 ring-[#ff801f]/15 dark:border-[#fb923c]/40 dark:bg-[#111827]"
                              : unit.is_shared
                                ? "border-[#ff801f]/20 bg-[#fff8f1]/80 hover:border-[#ff801f]/35 dark:border-[#fb923c]/25 dark:bg-[#ff801f]/5"
                                : "border-[#e7ded0] bg-[#fffdfa] hover:border-[#ff801f]/25 dark:border-[#334155] dark:bg-[#0f172a]/50"
                          )}
                        >
                          {selected ? (
                            <span
                              className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-[#ff801f]"
                              aria-hidden
                            />
                          ) : null}
                          <div className="min-w-0 pl-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-sm font-medium text-[#141413] dark:text-[#f8fafc]">
                                {unit.name || "Sin nombre"}
                              </p>
                              {unit.is_shared ? (
                                <WialonSharedBadge
                                  sharedWith={unit.shared_with}
                                  count={unit.shared_users_count}
                                  compact
                                />
                              ) : null}
                            </div>
                            <p className="mt-0.5 truncate font-mono text-[11px] text-[#6c6a64] dark:text-[#94a3b8]">
                              {unit.uid !== "—" ? unit.uid : "Sin UID"}
                            </p>
                            <p className={cn("mt-1 truncate", wialonUiCaption)}>
                              {unit.device_type}
                              {unit.last_message_at && unit.last_message_at !== "—"
                                ? ` · Último msg. ${unit.last_message_at}`
                                : ""}
                            </p>
                            {unit.is_shared && unit.shared_with && unit.shared_with !== "—" ? (
                              <p className={cn("mt-1 truncate", wialonUiCaption)} title={unit.shared_with}>
                                Con {unit.shared_with}
            </p>
          ) : null}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </aside>

              <div className="min-h-[min(420px,50dvh)] min-w-0 flex-1 bg-[#fcfaf6]/40 p-4 dark:bg-transparent sm:p-5 lg:p-6">
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
