import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/config/api";
import { cn } from "@/lib/utils";
import {
  erpPrimaryBtnClass,
  erpSansStyle,
  erpSearchInputClass,
  erpInputLikeClass,
  erpSecondaryBtnClass,
  erpSectionLabelClass,
  erpSubheadingClass,
} from "@/layout/erpPageStyles";
import SearchableSelect from "@/components/form/SearchableSelect";
import { modalPanelClass } from "@/components/clientes/clienteFormShared";
import { CheckLineIcon, CloseLineIcon, ListIcon, TrashBinIcon, UserIcon } from "@/icons";
import type {
  WialonAccessUser,
  WialonCustomField,
  WialonHwType,
  WialonUnitDetail,
  WialonUnitUpdatePayload,
} from "./wialonTypes";

const uiLabel = erpSectionLabelClass;
const uiCaption = "text-xs font-normal leading-relaxed text-[#78716c] dark:text-[#8ea0b8]";
/** Iconos discretos — tono piedra, sin acento coral/naranja */
const uiIconMuted = "h-4 w-4 shrink-0 text-[#78716c] dark:text-[#8ea0b8]";
const uiIconOnPrimary = "h-4 w-4 shrink-0 text-black/75";
const uiFieldInputClass = cn(erpInputLikeClass, "mt-0 w-full");

type Props = {
  unitId: number | null;
  contextUserId: number | null;
  canEdit: boolean;
  embedded?: boolean;
  onSaved: () => void;
  onCancel: () => void;
};

type AccessOption = WialonAccessUser;

function emptyField(): WialonCustomField {
  return { name: "", value: "", callMode: "create" };
}

function UnitStatusBadge({ status }: { status: string }) {
  const active = status === "Activo";
  const unknown = !status || status === "—";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium leading-none",
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

export default function EditWialonUnitPanel({
  unitId,
  contextUserId,
  canEdit,
  embedded = false,
  onSaved,
  onCancel,
}: Props) {
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

  const baseline = useMemo(() => detail, [detail]);

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

  const loadDetail = useCallback(async () => {
    if (!unitId) return;
    setLoading(true);
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
        setDetail(null);
        return;
      }
      const unit = data?.unit as WialonUnitDetail;
      setDetail(unit);
      setName(unit.name || "");
      setHwId(unit.hw_id != null ? String(unit.hw_id) : "");
      setUid(unit.uid || "");
      setPhone(unit.phone || "");
      setPassword("");
      setFields((unit.custom_fields || []).map((f) => ({ ...f, callMode: "update" as const })));
      setDeletedFieldIds([]);
      setAccessUsers(unit.access_users || []);
    } catch {
      setError("No se pudo cargar la unidad.");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [unitId, contextUserId]);

  useEffect(() => {
    void loadCatalogs();
  }, [loadCatalogs]);

  useEffect(() => {
    if (!unitId) {
      setDetail(null);
      return;
    }
    void loadDetail();
  }, [unitId, loadDetail]);

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
      await loadDetail();
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
      await loadDetail();
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
      onCancel();
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
      onSaved();
      onCancel();
    } catch {
      setError("No se pudo guardar la unidad en Wialon.");
    } finally {
      setSaving(false);
    }
  };

  if (!unitId) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#e7ded0] bg-[#fcfaf6]/80 px-6 py-14 text-center dark:border-[#334155] dark:bg-[#0f172a]/40",
          embedded && "min-h-[280px]"
        )}
      >
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e7ded0] bg-white/90 text-[#78716c] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#8ea0b8]">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M12 2 4 7v10l8 5 8-5V7l-8-5Z" strokeLinejoin="round" />
          </svg>
        </span>
        <p className={erpSubheadingClass}>Selecciona una unidad</p>
        <p className={cn("max-w-xs", uiCaption)}>
          {embedded
            ? "Elige una unidad de la lista para ver y editar sus datos en Wialon."
            : "En la pestaña Flota, pulsa Editar en la tarjeta de la unidad."}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-[#ff801f] border-t-transparent" aria-hidden />
        <p className={uiCaption}>Cargando unidad…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" style={erpSansStyle}>
      {error ? (
        <p className="rounded-lg border border-rose-200/80 bg-rose-50/70 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      ) : null}

      <div className={cn(modalPanelClass, "space-y-4")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={uiLabel}>Datos de la unidad</p>
          {detail ? <UnitStatusBadge status={detail.status ?? "—"} /> : null}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="unit-edit-name" className={uiLabel}>
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
            <label htmlFor="unit-edit-uid" className={uiLabel}>
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
            <label htmlFor="unit-edit-phone" className={uiLabel}>
              Número de teléfono
            </label>
            <input
              id="unit-edit-phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={cn(erpSearchInputClass, "mt-2 w-full")}
              disabled={!canEdit || saving}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="unit-edit-password" className={uiLabel}>
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
            <p className={cn("mt-1.5", uiCaption)}>
              Wialon no devuelve la contraseña actual; solo puedes establecer una nueva.
            </p>
          </div>
        </div>
      </div>

      <div className={cn(modalPanelClass, "space-y-4")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#e7ded0] bg-[#fcfaf6] text-[#78716c] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#8ea0b8]"
              aria-hidden
            >
              <ListIcon className="h-4 w-4" />
            </span>
            <div>
              <p className={uiLabel}>Campos personalizados</p>
              <p className={cn("mt-0.5 hidden sm:block", uiCaption)}>Pares nombre · valor en Wialon</p>
            </div>
          </div>
          {canEdit ? (
            <button
              type="button"
              className={cn(erpSecondaryBtnClass, "w-full shrink-0 sm:w-auto")}
              disabled={saving}
              onClick={() => setFields((prev) => [...prev, emptyField()])}
            >
              <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#e7ded0] bg-[#fcfaf6] text-[#78716c] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#8ea0b8]"
                aria-hidden
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              </span>
              <span>Agregar campo</span>
            </button>
          ) : null}
        </div>

        {fields.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#e7ded0]/90 bg-[#fcfaf6]/60 px-4 py-8 text-center dark:border-[#334155] dark:bg-[#0f172a]/30">
            <ListIcon className="h-5 w-5 text-[#a8a29e] dark:text-[#64748b]" aria-hidden />
            <p className={uiCaption}>Sin campos personalizados.</p>
          </div>
        ) : (
          <ul className="space-y-4" role="list">
            {fields.map((field, idx) => (
              <li
                key={field.id ?? `new-${idx}`}
                className="grid grid-cols-1 gap-3 border-b border-[#e7ded0]/60 pb-4 last:border-b-0 last:pb-0 dark:border-[#334155]/50 md:grid-cols-2 md:gap-x-3 md:gap-y-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end"
              >
                <div className="min-w-0">
                  <label htmlFor={`unit-field-name-${idx}`} className={cn(uiCaption, "mb-1.5 block font-medium")}>
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
                  <label htmlFor={`unit-field-value-${idx}`} className={cn(uiCaption, "mb-1.5 block font-medium")}>
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
                  <div className="md:col-span-2 lg:col-span-1">
                    <span className={cn(uiCaption, "mb-1.5 block font-medium lg:sr-only")}>Acción</span>
                    <button
                      type="button"
                      className={cn(
                        erpSecondaryBtnClass,
                        "w-full border-rose-200/70 text-rose-800/90 hover:bg-rose-50/80 dark:border-rose-900/35 dark:text-rose-300/90 dark:hover:bg-rose-950/25 lg:w-auto lg:min-w-[7.5rem]"
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
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={cn(modalPanelClass, "space-y-3")}>
        <p className={uiLabel}>Accesos a la unidad</p>
        <p className={uiCaption}>Usuarios Wialon con acceso además del titular de la cuenta.</p>

        {accessUsers.length === 0 ? (
          <p className={uiCaption}>Ningún acceso compartido registrado.</p>
        ) : (
          <ul className="space-y-2">
            {accessUsers.map((u) => (
              <li
                key={u.wialon_id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e7ded0] bg-white/70 px-3 py-2 dark:border-[#334155] dark:bg-[#0f172a]/50"
              >
                <span className="text-sm text-[#1c1917] dark:text-[#f8fafc]">
                  {u.user_id} · {u.name}
                </span>
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
                    <span>Quitar acceso</span>
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canEdit ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
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
      </div>

      {canEdit ? (
        <div
          className={cn(
            "flex flex-col-reverse gap-2 border-t border-[#e7ded0] pt-4 dark:border-[#334155] sm:flex-row sm:justify-end",
            embedded && "border-[#e7ded0]/70 pt-3"
          )}
        >
          <button type="button" onClick={onCancel} disabled={saving} className={erpSecondaryBtnClass}>
            <CloseLineIcon className={uiIconMuted} aria-hidden />
            <span>{embedded ? "Cerrar detalle" : "Volver a flota"}</span>
          </button>
          <button type="submit" disabled={saving || accessBusy} className={erpPrimaryBtnClass}>
            <CheckLineIcon className={uiIconOnPrimary} aria-hidden />
            <span>{saving ? "Guardando…" : "Guardar unidad"}</span>
          </button>
        </div>
      ) : null}
    </form>
  );
}
