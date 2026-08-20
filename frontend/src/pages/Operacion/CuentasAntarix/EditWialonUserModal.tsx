import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/modal";
import { fetchApi } from "@/config/api";
import { cn } from "@/lib/utils";
import {
  erpInputLikeClass,
  erpPrimaryBtnClass,
  erpSansStyle,
  erpSearchInputClass,
  erpSecondaryBtnClass,
  erpSectionHeadingClass,
  erpSectionLabelClass,
  erpSelectFieldClass,
  erpSubheadingClass,
} from "@/layout/erpPageStyles";
import { erpModalFooterClass } from "@/pages/Operacion/OrdenesTrabajo/ordenTrabajoStyles";
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
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-none tabular-nums";
const wialonEyebrowClass =
  "text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ea580c] dark:text-[#fb923c] sm:text-[11px]";
const wialonPanelClass =
  "rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-4 dark:border-[#334155] dark:bg-[#0f172a]/90 sm:p-5";
const wialonDossierZoneClass = "relative space-y-3 sm:space-y-4";
const wialonDossierHeadingClass =
  "[font-family:Georgia,'Times_New_Roman',serif] text-base font-medium tracking-[-0.01em] text-[#1c1917] dark:text-[#f8fafc] sm:text-lg";
const wialonDossierCardClass =
  "relative overflow-visible rounded-2xl border border-[#e7ded0]/90 bg-gradient-to-br from-[#fffdfa] via-[#fcfaf6]/85 to-[#fff7ed]/40 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)] dark:border-[#273244] dark:from-[#111827]/80 dark:via-[#0f172a]/55 dark:to-[#7c2d12]/10 dark:shadow-none sm:p-5";
const wialonIconBtnClass =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e7ded0] bg-white text-[#78716c] transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#334155] dark:bg-[#111827] dark:text-[#94a3b8] dark:hover:border-rose-900/40 dark:hover:bg-rose-950/30 dark:hover:text-rose-300";
const wialonTabTrackClass =
  "inline-flex w-full gap-1 rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-1 dark:border-[#334155] dark:bg-[#0f172a] sm:w-auto";
const wialonTabBtnClass = (active: boolean) =>
  cn(
    "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/40 sm:flex-none",
    active
      ? "bg-[#ff801f] text-black shadow-sm"
      : "text-[#57534e] hover:bg-[#fff4eb] dark:text-[#aeb8c8] dark:hover:bg-[#1e293b]",
  );

const wialonModalShellClass =
  "flex max-h-[min(94dvh,94vh)] w-full flex-col overflow-hidden rounded-t-3xl border border-[#e7ded0] bg-[#fffdfa] p-0 shadow-[0_24px_48px_-12px_rgba(28,25,23,0.18)] dark:border-[#334155] dark:bg-[#111a2b] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] sm:max-h-[min(92vh,92vh)] sm:w-[min(96vw,72rem)] sm:max-w-[72rem] sm:rounded-2xl";

const CATALOGS_TTL_MS = 10 * 60 * 1000;
const UNITS_TTL_MS = 45 * 1000;

type WialonCatalogsCache = {
  hwTypes: WialonHwType[];
  accessUsers: WialonAccessUser[];
  loadedAt: number;
};

let catalogsCache: WialonCatalogsCache | null = null;
const unitsByUserCache = new Map<number, { units: WialonUnitRow[]; loadedAt: number }>();

function rememberUnits(userId: number, units: WialonUnitRow[]) {
  unitsByUserCache.set(userId, { units, loadedAt: Date.now() });
}

function cachedUnits(userId: number, maxAgeMs = UNITS_TTL_MS): WialonUnitRow[] | null {
  const hit = unitsByUserCache.get(userId);
  if (!hit) return null;
  if (Date.now() - hit.loadedAt > maxAgeMs) return null;
  return hit.units;
}

async function fetchWialonCatalogs(): Promise<WialonCatalogsCache> {
  if (catalogsCache && Date.now() - catalogsCache.loadedAt < CATALOGS_TTL_MS) {
    return catalogsCache;
  }
  const [catRes, usersRes] = await Promise.all([
    fetchApi("/api/wialon/catalogos/unidades/", { method: "GET", cache: "no-store" as RequestCache }),
    fetchApi("/api/wialon/usuarios-acceso/", { method: "GET", cache: "no-store" as RequestCache }),
  ]);
  const catData = await catRes.json().catch(() => null);
  const usersData = await usersRes.json().catch(() => null);
  const hwTypes =
    catRes.ok && Array.isArray(catData?.hw_types) ? (catData.hw_types as WialonHwType[]) : catalogsCache?.hwTypes ?? [];
  const accessUsers =
    usersRes.ok && Array.isArray(usersData?.users)
      ? (usersData.users as WialonAccessUser[])
      : catalogsCache?.accessUsers ?? [];
  // No cachear un catálogo vacío por fallo temporal: reintentar en el próximo open.
  const loadedOk = (catRes.ok || hwTypes.length > 0) && (usersRes.ok || accessUsers.length > 0);
  const next: WialonCatalogsCache = {
    hwTypes,
    accessUsers,
    loadedAt: loadedOk ? Date.now() : 0,
  };
  catalogsCache = next;
  return next;
}

function sharingPatchFromAccess(
  users: WialonAccessUser[],
  contextUserId?: number | null,
): Partial<WialonUnitRow> {
  const others = users.filter((u) => u.wialon_id !== contextUserId);
  return {
    is_shared: others.length > 0,
    shared_users_count: others.length,
    shared_with: others.length ? others.map((u) => u.name || u.user_id).join(", ") : "—",
  };
}

/** Normaliza claves de cuenta para emparejar creador / padre / login. */
function accountKey(value: string | null | undefined): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Cuentas espejo / hijas: las creó esta cuenta o cuelgan de su cuenta padre.
 * (Usuarios con creator o parent_account apuntando a este login/nombre.)
 */
function findMirrorAccounts(
  current: WialonUserRow,
  allUsers: WialonUserRow[],
): WialonUserRow[] {
  const selfId = Number(current.wialon_id);
  const keys = new Set(
    [current.user_id, current.name]
      .map(accountKey)
      .filter((k) => k && k !== "—")
  );
  if (keys.size === 0) return [];

  return allUsers
    .filter((row) => {
      if (Number(row.wialon_id) === selfId) return false;
      const creator = accountKey(row.creator);
      const parent = accountKey(row.parent_account);
      return (creator !== "" && keys.has(creator)) || (parent !== "" && keys.has(parent));
    })
    .sort((a, b) =>
      (a.name || a.user_id || "").localeCompare(b.name || b.user_id || "", "es", {
        sensitivity: "base",
      })
    );
}

function unitRowPatchFromDetail(
  unit: WialonUnitDetail,
  contextUserId?: number | null,
): Partial<WialonUnitRow> {
  const fields = (unit.custom_fields || [])
    .filter((f) => f.name.trim() || f.value.trim())
    .map((f) => `${f.name}: ${f.value}`)
    .join(", ");
  return {
    wialon_id: unit.wialon_id,
    name: unit.name,
    device_type: unit.device_type,
    uid: unit.uid?.trim() ? unit.uid : "—",
    phone: unit.phone?.trim() ? unit.phone : "—",
    status: unit.status,
    is_active: unit.is_active,
    last_state: unit.last_state,
    speed_kmh: unit.speed_kmh,
    is_online: unit.is_online,
    online_label: unit.online_label,
    engine_on: unit.engine_on,
    engine_label: unit.engine_label,
    last_message_at: unit.last_message_at,
    custom_fields: fields,
    ...sharingPatchFromAccess(unit.access_users || [], contextUserId),
  };
}

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

function WialonTelemetryChips({
  unit,
  compact = false,
}: {
  unit: Pick<
    WialonUnitRow,
    | "last_state"
    | "speed_kmh"
    | "is_online"
    | "online_label"
    | "engine_on"
    | "engine_label"
    | "last_message_at"
  >;
  compact?: boolean;
}) {
  const online = unit.is_online === true;
  const offline = unit.is_online === false;
  const onlineText = unit.online_label || (online ? "En línea" : offline ? "Fuera de línea" : "Sin dato");
  const engineOn = unit.engine_on === true;
  const engineOff = unit.engine_on === false;
  const engineText = unit.engine_label || (engineOn ? "Encendido" : engineOff ? "Apagado" : "Sin dato");
  const motion = (unit.last_state || "").trim() || "Sin posición";
  const speed =
    typeof unit.speed_kmh === "number" && Number.isFinite(unit.speed_kmh) && unit.speed_kmh > 0
      ? ` · ${unit.speed_kmh} km/h`
      : "";
  const lastConn =
    unit.last_message_at && unit.last_message_at !== "—"
      ? unit.last_message_at
      : "Sin conexión";

  const chip = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-none ring-1 ring-inset";

  return (
    <div className={cn("flex flex-col gap-1.5", compact ? "mt-1.5" : "mt-2")}>
      <div className="flex flex-wrap gap-1.5">
        <span
          className={cn(
            chip,
            online
              ? "bg-emerald-50 text-emerald-800 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/50"
              : offline
                ? "bg-rose-50 text-rose-800 ring-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800/50"
                : "bg-[#f5f0e8] text-[#78716c] ring-[#e7ded0] dark:bg-[#1e293b] dark:text-[#94a3b8] dark:ring-[#334155]"
          )}
          title="Estado de conexión"
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              online ? "bg-emerald-500" : offline ? "bg-rose-500" : "bg-[#a8a29e]"
            )}
            aria-hidden
          />
          {onlineText}
        </span>
        <span
          className={cn(
            chip,
            engineOn
              ? "bg-[#fff3e6] text-[#c45f00] ring-[#ff801f]/25 dark:bg-[#ff801f]/15 dark:text-[#ffb366] dark:ring-[#ff801f]/30"
              : engineOff
                ? "bg-[#f5f0e8] text-[#57534e] ring-[#e7ded0] dark:bg-[#1e293b] dark:text-[#cbd5e1] dark:ring-[#334155]"
                : "bg-[#f5f0e8] text-[#78716c] ring-[#e7ded0] dark:bg-[#1e293b] dark:text-[#94a3b8] dark:ring-[#334155]"
          )}
          title="Motor / ignición"
        >
          Motor {engineText.toLowerCase()}
        </span>
        <span
          className={cn(
            chip,
            motion === "En movimiento"
              ? "bg-sky-50 text-sky-800 ring-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-800/50"
              : "bg-[#f5f0e8] text-[#57534e] ring-[#e7ded0] dark:bg-[#1e293b] dark:text-[#cbd5e1] dark:ring-[#334155]"
          )}
          title="Último estado de movimiento"
        >
          {motion}
          {speed}
        </span>
      </div>
      <p className={cn(wialonUiCaption, "truncate")} title={`Última conexión: ${lastConn}`}>
        Última conexión: {lastConn}
      </p>
    </div>
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

function WialonUnitActivePanel({
  unitIsActive,
  canEdit,
  confirmDeactivate,
  activeBusy,
  saving,
  loading,
  onAskDeactivate,
  onCancelConfirm,
  onConfirmDeactivate,
  onReactivate,
}: {
  unitIsActive: boolean;
  canEdit: boolean;
  confirmDeactivate: boolean;
  activeBusy: boolean;
  saving: boolean;
  loading: boolean;
  onAskDeactivate: () => void;
  onCancelConfirm: () => void;
  onConfirmDeactivate: () => void;
  onReactivate: () => void;
}) {
  const busy = activeBusy || saving || loading;
  const showConfirm = unitIsActive && confirmDeactivate;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border transition-[border-color,background-color,box-shadow] duration-300 motion-reduce:transition-none",
        unitIsActive
          ? "border-[#e7ded0]/95 bg-[#fffdfa] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.75)] dark:border-[#273244] dark:bg-[#0f172a]/70 dark:shadow-none"
          : "border-[#d6d3d1]/90 bg-[#f5f0e8]/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.45)] dark:border-[#3f3f46]/70 dark:bg-[#18181b]/55 dark:shadow-none",
        showConfirm &&
          "border-[#ff801f]/45 bg-[#fff8f1] dark:border-[#fb923c]/40 dark:bg-[#431407]/35"
      )}
      role="region"
      aria-labelledby="unit-active-status-label"
      aria-describedby="unit-active-help"
    >
      {/* Accent rail */}
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          showConfirm
            ? "bg-[#ff801f]"
            : unitIsActive
              ? "bg-emerald-500"
              : "bg-[#a8a29e] dark:bg-[#71717a]"
        )}
        aria-hidden
      />

      {/* Soft atmosphere */}
      <div
        className={cn(
          "pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full blur-3xl",
          showConfirm
            ? "bg-[#ff801f]/20"
            : unitIsActive
              ? "bg-emerald-400/15"
              : "bg-[#a8a29e]/20 dark:bg-zinc-500/10"
        )}
        aria-hidden
      />

      <div className="relative grid gap-4 p-4 pl-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:p-5 sm:pl-6">
        {/* Power glyph */}
        <div
          className={cn(
            "relative mx-auto flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl sm:mx-0",
            showConfirm
              ? "bg-[#ff801f]/15 text-[#c2410c] ring-1 ring-[#ff801f]/35 dark:bg-[#fb923c]/15 dark:text-[#fdba74] dark:ring-[#fb923c]/30"
              : unitIsActive
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800/50"
                : "bg-[#ebe6df] text-[#78716c] ring-1 ring-[#d6d3d1] dark:bg-[#27272a] dark:text-[#a1a1aa] dark:ring-[#3f3f46]"
          )}
          aria-hidden
        >
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M12 2v10" strokeLinecap="round" />
            <path d="M6.7 5.8a8 8 0 1 0 10.6 0" strokeLinecap="round" />
          </svg>
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#fffdfa] dark:border-[#0f172a]",
              showConfirm
                ? "bg-[#ff801f]"
                : unitIsActive
                  ? "bg-emerald-500"
                  : "bg-[#a8a29e] dark:bg-[#71717a]"
            )}
          />
        </div>

        {/* Copy */}
        <div className="min-w-0 text-center sm:text-left">
          <p className={wialonEyebrowClass}>Estado en Wialon</p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <p
              id="unit-active-status-label"
              className="[font-family:Georgia,'Times_New_Roman',serif] text-xl font-medium tracking-[-0.02em] text-[#1c1917] dark:text-[#f8fafc] sm:text-2xl"
            >
              {showConfirm ? "¿Desactivar?" : unitIsActive ? "Activa" : "Inactiva"}
            </p>
            {!showConfirm ? (
              <span
                className={cn(
                  wialonUiBadge,
                  "ring-1 ring-inset",
                  unitIsActive
                    ? "bg-emerald-50 text-emerald-800 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/50"
                    : "bg-[#ebe6df] text-[#57534e] ring-[#d6d3d1] dark:bg-[#27272a] dark:text-[#d4d4d8] dark:ring-[#3f3f46]"
                )}
              >
                {unitIsActive ? "En servicio" : "Fuera de servicio"}
              </span>
            ) : null}
          </div>
          <p className={cn("mt-1.5 max-w-md", wialonUiCaption)} id="unit-active-help">
            {showConfirm
              ? "La unidad dejará de contar en facturación. No se borra el dispositivo ni su historial; puedes reactivarla después."
              : unitIsActive
                ? "La unidad cuenta en Wialon. Desactivar no elimina el dispositivo ni su historial."
                : "La unidad está fuera de facturación. Los datos se conservan; reactívala cuando vuelva a operar."}
          </p>
          {showConfirm ? (
            <p className="sr-only" role="status" aria-live="polite">
              Confirma si deseas desactivar esta unidad.
            </p>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[11.5rem]">
          {!canEdit ? (
            <p className={cn(wialonUiCaption, "rounded-xl border border-dashed border-[#e7ded0] px-3 py-2.5 text-center dark:border-[#334155]")}>
              Solo lectura
            </p>
          ) : showConfirm ? (
            <>
              <button
                type="button"
                className={cn(
                  erpPrimaryBtnClass,
                  "w-full min-h-11 justify-center bg-[#c2410c] hover:bg-[#9a3412] focus-visible:outline-[#c2410c]"
                )}
                disabled={busy}
                aria-busy={activeBusy || undefined}
                onClick={onConfirmDeactivate}
              >
                {activeBusy ? (
                  <>
                    <svg className="h-4 w-4 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
                      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Desactivando…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M12 2v10" strokeLinecap="round" />
                      <path d="M6.7 5.8a8 8 0 1 0 10.6 0" strokeLinecap="round" />
                    </svg>
                    Sí, desactivar
                  </>
                )}
              </button>
              <button
                type="button"
                className={cn(erpSecondaryBtnClass, "w-full min-h-11 justify-center")}
                disabled={busy}
                onClick={onCancelConfirm}
              >
                Cancelar
              </button>
            </>
          ) : unitIsActive ? (
            <button
              type="button"
              className={cn(
                erpSecondaryBtnClass,
                "w-full min-h-11 justify-center border-[#d6d3d1] text-[#44403c] hover:border-[#c2410c]/40 hover:bg-[#fff7ed] hover:text-[#9a3412] dark:border-[#3f3f46] dark:text-[#e7e5e4] dark:hover:border-[#fb923c]/40 dark:hover:bg-[#431407]/40 dark:hover:text-[#fdba74]"
              )}
              disabled={busy}
              onClick={onAskDeactivate}
            >
              <svg className="h-4 w-4 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 2v10" strokeLinecap="round" />
                <path d="M6.7 5.8a8 8 0 1 0 10.6 0" strokeLinecap="round" />
              </svg>
              Desactivar
            </button>
          ) : (
            <button
              type="button"
              className={cn(erpPrimaryBtnClass, "w-full min-h-11 justify-center")}
              disabled={busy}
              aria-busy={activeBusy || undefined}
              onClick={onReactivate}
            >
              {activeBusy ? (
                <>
                  <svg className="h-4 w-4 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Reactivando…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M12 2v10" strokeLinecap="round" />
                    <path d="M6.7 5.8a8 8 0 1 0 10.6 0" strokeLinecap="round" />
                  </svg>
                  Reactivar
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function WialonMirrorAccountsPanel({
  mirrors,
  currentUser,
  onOpenUser,
}: {
  mirrors: WialonUserRow[];
  currentUser: WialonUserRow | null;
  onOpenUser?: (row: WialonUserRow) => void;
}) {
  const countLabel =
    mirrors.length === 1 ? "1 cuenta espejo" : `${mirrors.length} cuentas espejo`;

  return (
    <section className={wialonDossierZoneClass} aria-labelledby="wialon-mirrors-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className={wialonEyebrowClass}>Jerarquía</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h3
              id="wialon-mirrors-heading"
              className={wialonDossierHeadingClass}
            >
              Cuentas espejo
            </h3>
            <span
              className={cn(
                wialonUiBadge,
                "bg-[#fff3e6] text-[#c45f00] ring-1 ring-[#ff801f]/25 dark:bg-[#ff801f]/15 dark:text-[#ffb366] dark:ring-[#ff801f]/30"
              )}
            >
              {countLabel}
            </span>
          </div>
          <p className={cn("mt-1 max-w-xl", wialonUiCaption)}>
            Cuentas hijas creadas por este usuario o que cuelgan de su cuenta padre
          </p>
        </div>
      </div>

      {mirrors.length === 0 ? (
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border border-dashed border-[#e7ded0] px-5 py-8 text-center dark:border-[#334155]",
            "bg-gradient-to-br from-[#fcfaf6] via-[#fffdfa] to-[#fff4eb]/50 dark:from-[#0f172a]/80 dark:via-[#111827]/60 dark:to-[#7c2d12]/10"
          )}
        >
          <div
            className="pointer-events-none absolute -left-6 top-4 flex -space-x-3 opacity-40"
            aria-hidden
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff801f]/20 ring-1 ring-[#ff801f]/25" />
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-[#ff801f]/40 bg-[#fffdfa]/80 dark:bg-[#111827]/80" />
          </div>
          <div className="relative mx-auto mb-3 flex h-14 w-14 items-center justify-center">
            <span
              className="absolute inset-0 rounded-2xl bg-[#ff801f]/12 ring-1 ring-[#ff801f]/20 dark:bg-[#fb923c]/15 dark:ring-[#fb923c]/25"
              aria-hidden
            />
            <span
              className="absolute -right-1.5 -top-1.5 h-10 w-10 rounded-xl border border-dashed border-[#ff801f]/45 bg-[#fffdfa]/90 dark:bg-[#111827]/90"
              aria-hidden
            />
            <svg
              className="relative h-6 w-6 text-[#ea580c] dark:text-[#fb923c]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              aria-hidden
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" />
              <circle cx="9" cy="7" r="3" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a3 3 0 0 1 0 5.74" strokeLinecap="round" />
            </svg>
          </div>
          <p className="[font-family:Georgia,'Times_New_Roman',serif] text-lg font-medium tracking-[-0.02em] text-[#1c1917] dark:text-[#f8fafc]">
            Sin cuentas espejo
          </p>
          <p className={cn("mx-auto mt-1.5 max-w-sm", wialonUiCaption)}>
            Cuando este usuario cree cuentas hijas, aparecerán aquí para abrirlas en un toque.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2" role="list">
          {mirrors.map((row, index) => {
            const initial = (row.name || row.user_id || "?").slice(0, 1).toUpperCase();
            const createdBySelf =
              accountKey(row.creator) === accountKey(currentUser?.user_id) ||
              accountKey(row.creator) === accountKey(currentUser?.name);
            const active = row.status === "Activo";
            const blocked = row.status === "Bloqueado";

            return (
              <li key={row.wialon_id}>
                <button
                  type="button"
                  onClick={() => onOpenUser?.(row)}
                  disabled={!onOpenUser}
                  className={cn(
                    "group relative flex w-full overflow-hidden rounded-2xl border text-left transition-[border-color,background-color,transform] duration-200 motion-reduce:transition-none",
                    "border-[#e7ded0]/95 bg-[#fffdfa] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)]",
                    "hover:border-[#ff801f]/50 hover:bg-[#fff8f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/40",
                    "disabled:cursor-default dark:border-[#273244] dark:bg-[#0f172a]/70 dark:shadow-none dark:hover:border-[#fb923c]/45 dark:hover:bg-[#1c1917]/40",
                    onOpenUser && "active:scale-[0.99] motion-reduce:active:scale-100"
                  )}
                >
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0 w-1",
                      active ? "bg-[#ff801f]" : blocked ? "bg-rose-400" : "bg-[#a8a29e]"
                    )}
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#ff801f]/10 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none dark:bg-[#fb923c]/15"
                    aria-hidden
                  />

                  <div className="relative flex w-full gap-3 p-3.5 pl-4 sm:p-4 sm:pl-5">
                    {/* Twin avatars (espejo) */}
                    <div className="relative h-12 w-12 shrink-0" aria-hidden>
                      <span className="absolute left-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#ebe6df] font-serif text-sm text-[#78716c] ring-1 ring-[#d6d3d1] dark:bg-[#27272a] dark:text-[#a1a1aa] dark:ring-[#3f3f46]">
                        {(currentUser?.name || currentUser?.user_id || "·")
                          .slice(0, 1)
                          .toUpperCase()}
                      </span>
                      <span className="absolute bottom-0 right-0 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff801f] font-serif text-sm font-medium text-black shadow-sm ring-2 ring-[#fffdfa] dark:ring-[#0f172a]">
                        {initial}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate [font-family:Georgia,'Times_New_Roman',serif] text-base font-medium tracking-[-0.015em] text-[#1c1917] dark:text-[#f8fafc]">
                            {row.name || "Sin nombre"}
                          </p>
                          <p className="mt-0.5 truncate font-mono text-[11px] tracking-wide text-[#ea580c] dark:text-[#fb923c]">
                            {row.user_id || "—"}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 font-serif text-xs tabular-nums text-[#cc785c]/80 dark:text-[#fdba74]/70"
                          )}
                          aria-hidden
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <WialonStatusBadge status={row.status} />
                        <span
                          className={cn(
                            wialonUiBadge,
                            createdBySelf
                              ? "bg-[#fff3e6] text-[#c45f00] ring-1 ring-[#ff801f]/20 dark:bg-[#ff801f]/15 dark:text-[#ffb366] dark:ring-[#ff801f]/25"
                              : "bg-[#f5f0e8] text-[#57534e] ring-1 ring-[#e7ded0] dark:bg-[#1e293b] dark:text-[#cbd5e1] dark:ring-[#334155]"
                          )}
                        >
                          {createdBySelf ? "Creada aquí" : "Cuenta hija"}
                        </span>
                        <span
                          className={cn(
                            wialonUiBadge,
                            "bg-[#fcfaf6] text-[#57534e] ring-1 ring-[#e7ded0] dark:bg-[#111827] dark:text-[#aeb8c8] dark:ring-[#334155]"
                          )}
                        >
                          {row.assigned_units} und.
                        </span>
                        {row.dealer_rights === "Sí" ? (
                          <span
                            className={cn(
                              wialonUiBadge,
                              "bg-[#fff3e6] text-[#9a3412] ring-1 ring-[#ff801f]/25 dark:bg-[#ff801f]/15 dark:text-[#fdba74]"
                            )}
                          >
                            Distribuidor
                          </span>
                        ) : null}
                      </div>

                      {onOpenUser ? (
                        <span className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#ea580c] transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none dark:text-[#fb923c]">
                          Abrir cuenta
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function WialonDossierSection({
  title,
  subtitle,
  eyebrow,
  action,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}) {
  const sectionId = `wialon-dossier-${title.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <section className={wialonDossierZoneClass} aria-labelledby={sectionId}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className={wialonEyebrowClass}>{eyebrow}</p> : null}
          <div className={cn("flex flex-wrap items-center gap-2", eyebrow && "mt-1")}>
            <h3 id={sectionId} className={wialonDossierHeadingClass}>
              {title}
            </h3>
            {badge}
          </div>
          {subtitle ? <p className={cn("mt-1 max-w-xl", wialonUiCaption)}>{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function WialonSectionCard({
  title,
  subtitle,
  eyebrow,
  icon,
  action,
  badge,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: ReactNode;
  action?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const sectionId = `wialon-section-${title.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <section className={cn(wialonPanelClass, className)} aria-labelledby={sectionId}>
      <div className="mb-4 flex flex-col gap-3 border-b border-[#e7ded0]/80 pb-3 dark:border-white/[0.06] sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          {icon ? (
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ff801f]/12 text-[#ea580c] dark:bg-[#fb923c]/15 dark:text-[#fb923c]" aria-hidden>
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            {eyebrow ? <p className={wialonEyebrowClass}>{eyebrow}</p> : null}
            <div className={cn("flex flex-wrap items-center gap-2", eyebrow && "mt-0.5")}>
              <h3 id={sectionId} className="text-sm font-semibold text-[#1c1917] dark:text-[#f1f5f9]">
                {title}
              </h3>
              {badge}
            </div>
            {subtitle ? <p className={cn("mt-0.5 text-[12px] leading-snug", wialonUiCaption)}>{subtitle}</p> : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
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
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#e2d9ca] bg-gradient-to-b from-[#fffdf8] to-[#fff6ed]/60 px-5 py-12 text-center dark:border-[#334155] dark:from-[#0f172a]/40 dark:to-[#111827]/20">
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

function WialonStatStrip({
  items,
}: {
  items: { label: string; value: string; serif?: boolean }[];
}) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-[#e7ded0]/80 bg-[#fffdfa] px-3 py-3 dark:border-[#334155] dark:bg-[#111827]/50"
        >
          <dt className={wialonEyebrowClass}>{item.label}</dt>
          <dd
            className={cn(
              "mt-1.5 break-words leading-snug text-[#1c1917] dark:text-[#f8fafc]",
              item.serif
                ? "[font-family:Georgia,'Times_New_Roman',serif] text-xl font-medium tabular-nums sm:text-2xl"
                : wialonUiValue,
            )}
          >
            {item.value || "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

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
    <footer className={cn(erpModalFooterClass, className)} aria-busy={busy || undefined}>
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
              action.variant === "primary" ? erpPrimaryBtnClass : erpSecondaryBtnClass,
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

const uiIconOnPrimary = "h-4 w-4 shrink-0 text-black/75";
const uiFieldInputClass = cn(erpInputLikeClass, "mt-0 w-full");

type UnitBusyState = { saving: boolean; accessBusy: boolean; activeBusy?: boolean };

type UnitFormProps = {
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
  const [activeBusy, setActiveBusy] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
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
      setConfirmDeactivate(false);
      return;
    }
    setConfirmDeactivate(false);
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
        nextActive
          ? "No se pudo reactivar la unidad."
          : "No se pudo desactivar la unidad."
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
      const unit = data?.unit as WialonUnitDetail | undefined;
      if (unit?.wialon_id != null) {
        detailCacheRef.current.set(unitId, unit);
        applyDetail(unit);
        onSaved(unitRowPatchFromDetail(unit, contextUserId));
      } else {
        onSaved({
          name: trimmedName,
          uid: uid.trim() || "—",
          phone: phone.trim() || "—",
        });
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
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-[#6c6a64] underline-offset-2 hover:text-[#ea580c] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/40 dark:text-[#94a3b8] dark:hover:text-[#fb923c] lg:hidden"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver a la flota
        </button>
      ) : null}

      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff801f] font-serif text-lg font-medium text-black" aria-hidden>
          {(name || unitSummary?.name || "?").slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className={wialonEyebrowClass}>Unidad</p>
          <h3 className={cn("mt-0.5 truncate", erpSubheadingClass)}>
            {name.trim() || unitSummary?.name || "Sin nombre"}
          </h3>
          <p className="mt-1 truncate font-mono text-sm tracking-wide text-[#ea580c] dark:text-[#fb923c]">
            {uid.trim() || (unitSummary?.uid && unitSummary.uid !== "—" ? unitSummary.uid : "Sin UID")}
          </p>
          <WialonTelemetryChips
            unit={{
              last_state: detail?.last_state ?? unitSummary?.last_state,
              speed_kmh: detail?.speed_kmh ?? unitSummary?.speed_kmh,
              is_online: detail?.is_online ?? unitSummary?.is_online,
              online_label: detail?.online_label ?? unitSummary?.online_label,
              engine_on: detail?.engine_on ?? unitSummary?.engine_on,
              engine_label: detail?.engine_label ?? unitSummary?.engine_label,
              last_message_at:
                detail?.last_message_at ?? unitSummary?.last_message_at ?? "—",
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
          className="flex flex-wrap items-start gap-2 rounded-xl border border-[#ff801f]/20 bg-[#fff8f1] px-3.5 py-2.5 dark:border-[#fb923c]/25 dark:bg-[#ff801f]/10"
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

      <WialonDossierSection
        eyebrow="Dispositivo"
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
                <label htmlFor="unit-edit-uid" className={cn(wialonUiLabel, "mb-1.5 block")}>
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

            <div className="grid grid-cols-1 items-start gap-4 border-t border-[#e7ded0]/80 pt-4 dark:border-[#334155]/70 @min-[34rem]:grid-cols-2">
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
                  placeholder={detail?.has_password ? "Dejar vacío para no cambiar" : "Nueva contraseña"}
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

      <WialonDossierSection
        eyebrow="Servicio"
        title="Potencia de la unidad"
        subtitle="Activa o pausa la facturación en Wialon sin borrar el dispositivo"
        badge={
          <span
            className={cn(
              wialonUiBadge,
              "ring-1 ring-inset",
              unitIsActive
                ? "bg-emerald-50 text-emerald-800 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/50"
                : "bg-[#ebe6df] text-[#57534e] ring-[#d6d3d1] dark:bg-[#27272a] dark:text-[#d4d4d8] dark:ring-[#3f3f46]"
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

      <WialonDossierSection
        eyebrow="Ficha"
        title="Campos personalizados"
        subtitle="Pares nombre · valor que viajan con la unidad"
        badge={
          <span className={cn(wialonUiBadge, "border border-[#e2d9ca] bg-[#fcfaf6] text-[#57534e] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#aeb8c8]")}>
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
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
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
          <ul className="overflow-hidden rounded-2xl border border-[#e7ded0]/90 bg-[#fffdfa] dark:border-[#273244] dark:bg-[#0f172a]/40" role="list">
            {fields.map((field, idx) => (
              <li
                key={field.id ?? `new-${idx}`}
                className="border-b border-[#e7ded0]/80 last:border-b-0 dark:border-[#334155]/70"
              >
                <div className="grid grid-cols-1 gap-3 p-3.5 sm:grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end sm:p-4">
                  <span
                    className="hidden [font-family:Georgia,'Times_New_Roman',serif] text-lg font-medium tabular-nums text-[#cc785c] sm:block dark:text-[#fdba74]"
                    aria-hidden
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
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

      <WialonDossierSection
        eyebrow="Permisos"
        title="Accesos compartidos"
        subtitle="Quién más puede ver esta unidad en Wialon"
        badge={
          <span className={cn(wialonUiBadge, "border border-[#e2d9ca] bg-[#fcfaf6] text-[#57534e] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#aeb8c8]")}>
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
                className="flex items-center gap-3 rounded-2xl border border-[#e7ded0]/90 bg-gradient-to-br from-[#fffdfa] to-[#fcfaf6] px-3.5 py-3 dark:border-[#273244] dark:from-[#111827]/70 dark:to-[#0f172a]/40"
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ff801f]/15 [font-family:Georgia,'Times_New_Roman',serif] text-sm font-medium text-[#9a3412] dark:bg-[#fb923c]/15 dark:text-[#fdba74]" aria-hidden>
                  {(u.name || u.user_id || "?").slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]">{u.name}</p>
                  <p className="truncate font-mono text-[11px] text-[#ea580c] dark:text-[#fb923c]">{u.user_id}</p>
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
          <div className="relative z-30 rounded-2xl border border-[#ff801f]/25 bg-gradient-to-br from-[#fff7ed] via-[#fffdfa] to-[#fcfaf6] p-4 dark:border-[#ff801f]/20 dark:from-[#7c2d12]/20 dark:via-[#111827]/80 dark:to-[#0f172a]/70">
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
    </form>
    </div>
  );
}

// --- Modal principal (export) ---

type EditWialonUserModalProps = {
  user: WialonUserRow | null;
  /** Listado completo para detectar cuentas espejo creadas bajo esta cuenta. */
  allUsers?: WialonUserRow[];
  isOpen: boolean;
  initialTab?: UserModalTab;
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
  canEdit,
  onClose,
  onSaved,
  onOpenUser,
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

  const loadUnits = useCallback(async (opts?: { force?: boolean }) => {
    if (!user) return;
    const userId = user.wialon_id;
    const fresh = cachedUnits(userId);
    if (fresh && !opts?.force) {
      setUnits(fresh);
      setUnitsError("");
      setUnitsLoading(false);
      return;
    }
    const stale = unitsByUserCache.get(userId);
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
  }, [user]);

  useEffect(() => {
    if (!isOpen || !user) return;
    void fetchWialonCatalogs();
    void loadUnits();
  }, [isOpen, user, loadUnits]);

  const fleetUnits = useMemo(() => units, [units]);

  const mirrorAccounts = useMemo(
    () => (user ? findMirrorAccounts(user, allUsers) : []),
    [user, allUsers]
  );

  const selectedUnit = useMemo(
    () => fleetUnits.find((u) => u.wialon_id === selectedUnitId) ?? null,
    [fleetUnits, selectedUnitId]
  );

  const filteredUnits = useMemo(() => {
    const q = unitSearch.trim().toLowerCase();
    if (!q) return fleetUnits;
    return fleetUnits.filter((u) =>
      [u.name, u.device_type, u.uid, u.phone, u.custom_fields, u.status, u.shared_with]
        .join(" ")
        .toLowerCase()
        .includes(q)
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

  const handleUnitSaved = useCallback((patch?: Partial<WialonUnitRow>) => {
    if (!user || !selectedUnitId || !patch) return;
    setUnits((prev) => {
      const next = prev.map((unit) =>
        unit.wialon_id === selectedUnitId ? { ...unit, ...patch } : unit,
      );
      rememberUnits(user.wialon_id, next);
      return next;
    });
  }, [user, selectedUnitId]);

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
        <header className="relative shrink-0 overflow-hidden border-b border-[#e7ded0] bg-gradient-to-br from-[#fcfaf6] via-[#fffdfa] to-[#fff6ed] px-5 py-4 pr-14 dark:border-[#334155] dark:from-[#111827] dark:via-[#111a2b] dark:to-[#0f172a] sm:px-6 sm:py-5 sm:pr-16">
          <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#ff801f]" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-[#ff801f]/15 blur-2xl" aria-hidden="true" />

          <div className="relative flex min-w-0 items-start gap-3 sm:gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff801f] text-black shadow-sm">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" aria-hidden>
                <path d="M12 2 4 7v10l8 5 8-5V7l-8-5Z" strokeLinejoin="round" />
                <path d="M12 12 8 9.5V7l4 2.5v2.5L12 12Z" strokeLinejoin="round" />
              </svg>
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className={wialonEyebrowClass}>Ventas · Suscripción · Antarix</p>
                {user ? <WialonStatusBadge status={user.status} /> : null}
                {user?.dealer_rights === "Sí" ? (
                  <span className="rounded-full bg-[#fff3e6] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#9a3412] dark:bg-[#ff801f]/15 dark:text-[#fdba74]">
                    Distribuidor
                  </span>
                ) : null}
              </div>
              <h2 id={titleId} className={cn("mt-1 text-balance", erpSectionHeadingClass)}>
                {user?.name || "Cuenta"}
              </h2>
              <p className="mt-1.5 text-sm text-[#57534e] dark:text-[#b7c1d1]">
                <span className="font-mono text-[13px] font-medium tracking-wide text-[#ea580c] dark:text-[#fb923c]">
                  {user?.user_id || "—"}
                </span>
                {user?.parent_account ? (
                  <>
                    <span className="mx-1.5 text-[#d6d3d1] dark:text-[#475569]">·</span>
                    {user.parent_account}
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Secciones de la cuenta"
            className={cn(wialonTabTrackClass, "relative mt-4")}
          >
            <button
              type="button"
              role="tab"
              id={`${cuentaPanelId}-tab`}
              aria-selected={activeTab === "cuenta"}
              aria-controls={cuentaPanelId}
              onClick={() => setActiveTab("cuenta")}
              className={wialonTabBtnClass(activeTab === "cuenta")}
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
              className={wialonTabBtnClass(activeTab === "unidades")}
            >
              Flota
              {fleetUnits.length > 0 ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                    activeTab === "unidades" ? "bg-black/10 text-black" : "bg-[#fff3e6] text-[#c45f00] dark:bg-[#ff801f]/20 dark:text-[#ffb366]",
                  )}
                >
                  {fleetUnits.length}
                </span>
              ) : null}
            </button>
          </div>
        </header>

        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-[#fffdfa] dark:bg-[#111a2b]">
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
                    value: unitsLoading && fleetUnits.length === 0 ? "…" : String(user?.assigned_units ?? fleetUnits.length),
                    serif: true,
                  },
                  {
                    label: "Espejos",
                    value: String(mirrorAccounts.length),
                    serif: true,
                  },
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
                <p className={cn("text-center", wialonUiCaption)}>No tienes permiso para editar esta cuenta.</p>
              ) : null}
          </form>

          <div
            id={unidadesPanelId}
            role="tabpanel"
            aria-labelledby={`${unidadesPanelId}-tab`}
            hidden={activeTab !== "unidades"}
            className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row"
          >
              <aside
                className={cn(
                  "flex min-h-0 flex-col border-[#e7ded0] bg-[#fcfaf6]/80 p-3 dark:border-[#334155] dark:bg-[#0f172a]/40 sm:p-4",
                  "lg:w-[min(100%,22rem)] lg:shrink-0 lg:self-stretch lg:border-b-0 lg:border-r",
                  selectedUnitId != null
                    ? "hidden border-b lg:flex"
                    : "flex flex-1 border-b lg:flex-none"
                )}
              >
                <div className="mb-3 flex shrink-0 items-end justify-between gap-2">
                  <div>
                    <p className={wialonEyebrowClass}>Flota</p>
                    <p className="mt-0.5 text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">Unidades activas</p>
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
                    aria-label="Buscar unidad"
                  />
                  <svg
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78716c] dark:text-[#8ea0b8]"
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
                      const inactive =
                        unit.is_active === false || unit.status === "Inactivo";
                      return (
                        <button
                          key={unit.wialon_id}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => setSelectedUnitId(unit.wialon_id)}
                          className={cn(
                            "relative flex w-full gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff801f]/40",
                            selected
                              ? "border-[#ff801f]/55 bg-[#fff7ed] shadow-sm dark:border-[#fb923c]/50 dark:bg-[#fb923c]/10"
                              : inactive
                                ? "border-rose-200/70 bg-rose-50/40 opacity-90 hover:border-rose-300 dark:border-rose-900/40 dark:bg-rose-950/20"
                                : unit.is_shared
                                  ? "border-[#ff801f]/20 bg-[#fffdfa] hover:border-[#ff801f]/40 dark:border-[#fb923c]/25 dark:bg-[#111827]/40"
                                  : "border-[#e7ded0] bg-[#fffdfa] hover:border-[#d6d3d1] dark:border-[#334155] dark:bg-[#111a2b] dark:hover:border-[#475569]/80"
                          )}
                        >
                          {selected ? (
                            <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-full bg-[#ff801f]" aria-hidden />
                          ) : null}
                          <span
                            className={cn(
                              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-serif text-sm font-medium",
                              selected
                                ? "bg-[#ff801f] text-black"
                                : inactive
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
                                  : "bg-[#ff801f]/12 text-[#9a3412] dark:bg-[#fb923c]/15 dark:text-[#fdba74]",
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
                                      "bg-[#ebe6df] text-[#57534e] ring-1 ring-inset ring-[#d6d3d1] dark:bg-[#27272a] dark:text-[#d4d4d8] dark:ring-[#3f3f46]"
                                    )}
                                  >
                                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#a8a29e]" aria-hidden />
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
                            <span className="mt-0.5 block truncate font-mono text-[11px] text-[#ea580c] dark:text-[#fb923c]">
                              {unit.uid !== "—" ? unit.uid : "Sin UID"}
                            </span>
                            <span className={cn("mt-1 block truncate", wialonUiCaption)}>
                              {unit.device_type}
                            </span>
                            <WialonTelemetryChips unit={unit} compact />
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </aside>

              <div
                className={cn(
                  "custom-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-[#fffdfa] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:bg-[#111a2b] sm:p-6",
                  selectedUnitId == null ? "hidden lg:block" : "block"
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
