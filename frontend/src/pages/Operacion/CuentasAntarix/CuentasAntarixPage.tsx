import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import { Modal } from "@/components/ui/modal";
import Alert from "@/components/ui/alert/Alert";
import CuentasAntarixUsersTable from "./CuentasAntarixUsersTable";
import EditWialonUserModal from "./EditWialonUserModal";
import type { WialonUnitRow, WialonUserRow } from "./wialonTypes";
import { fetchApi } from "@/config/api";
import { cn } from "@/lib/utils";
import {
  erpBodyClass,
  erpCardShellClass,
  erpChipNeutralClass,
  erpHeroHeadingClass,
  erpPrimaryBtnClass,
  erpSansStyle,
  erpSearchInputClass,
  erpSecondaryBtnClass,
  erpSectionHeadingClass,
  erpSectionLabelClass,
  erpSubheadingClass,
} from "@/layout/erpPageStyles";
import {
  erpRowActionBarClass,
  erpRowActionBtnClass,
} from "@/pages/Operacion/OrdenesTrabajo/ordenTrabajoStyles";
import { PencilIcon, BoxCubeIcon } from "@/icons";

/** Tipografía unificada (Outfit) — misma escala en página, tabla, cards y modal */
const uiLabel = erpSectionLabelClass;
const uiValue = "text-sm font-medium leading-snug text-[#1c1917] dark:text-[#f8fafc]";
const uiValueMuted = "text-sm font-normal leading-snug text-[#57534e] dark:text-[#cbd5e1]";
const uiCaption = "text-xs font-normal leading-relaxed text-[#78716c] dark:text-[#8ea0b8]";
const uiCardTitle = "text-base font-semibold leading-snug tracking-normal text-[#1c1917] dark:text-[#f8fafc]";
const uiStatNumber = "text-xl font-semibold tabular-nums leading-none text-[#1c1917] dark:text-[#f8fafc] sm:text-2xl";
const uiBadge = "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium leading-none";

const pageInnerClass =
  "mx-auto w-full max-w-[min(100%,1920px)] space-y-5 px-3 pb-10 pt-5 text-sm font-normal leading-relaxed text-[#57534e] sm:space-y-6 sm:px-5 sm:pb-12 sm:pt-6 md:px-6 lg:px-8 xl:px-10 2xl:max-w-[min(100%,2200px)] dark:text-[#b7c1d1]";

const statCardClass =
  "rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-3 dark:border-[#273244] dark:bg-[#111a2b]/90 sm:p-4";

const statIconWrapClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e7ded0] bg-white/90 text-[#ea580c] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#fb923c] sm:h-10 sm:w-10";

const unitsModalClass =
  "my-2 flex max-h-[min(92dvh,820px)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fffdfa] p-0 shadow-[0_30px_90px_-45px_rgba(28,25,23,0.55)] dark:border-[#273244] dark:bg-[#111a2b] sm:my-auto sm:w-[min(98vw,72rem)] sm:max-w-[72rem] sm:rounded-3xl";

const mobileUserCardClass =
  "w-full min-w-0 overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fcfaf6]/90 p-4 text-left font-normal shadow-[0_8px_24px_-16px_rgba(28,25,23,0.2)] transition-all hover:border-[#ff801f]/35 hover:bg-[#fff8f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff801f] dark:border-[#273244] dark:bg-[#111a2b]/80 dark:hover:border-[#fb923c]/40 dark:hover:bg-white/[0.04] sm:p-5";

const TRUCK_CARD_IMAGE = "/images/cards/truck.png";

type UnitCardLevel = "ok" | "warn" | "neutral";

function getUnitCardLevel(unit: WialonUnitRow): UnitCardLevel {
  if (unit.last_message_at?.trim()) return "ok";
  if (unit.uid?.trim() || unit.phone?.trim()) return "warn";
  return "neutral";
}

function UnitField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <p className={uiLabel}>{label}</p>
      <p className={cn("break-words leading-snug tabular-nums", uiValue)}>{value || "—"}</p>
    </div>
  );
}

function WialonUnitCard({ unit }: { unit: WialonUnitRow }) {
  const level = getUnitCardLevel(unit);
  const borderCls =
    level === "warn"
      ? "border-amber-200/90 dark:border-amber-500/35"
      : level === "neutral"
        ? "border-[#e7ded0] dark:border-[#334155]"
        : "border-emerald-200/90 dark:border-emerald-500/35";
  const headerBgCls =
    level === "warn"
      ? "from-amber-50/80 via-[#fffdfa] to-[#fffdfa] dark:from-amber-500/8 dark:via-[#111a2b] dark:to-[#111a2b]"
      : level === "neutral"
        ? "from-[#fcfaf6] via-[#fffdfa] to-[#fffdfa] dark:from-white/[0.02] dark:via-[#111a2b] dark:to-[#111a2b]"
        : "from-emerald-50/80 via-[#fffdfa] to-[#fffdfa] dark:from-emerald-500/8 dark:via-[#111a2b] dark:to-[#111a2b]";
  const badgeCls =
    level === "warn"
      ? "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
      : level === "neutral"
        ? "bg-[#f5f0e8] text-[#57534e] dark:bg-[#1e293b] dark:text-[#cbd5e1]"
        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
  const statusText = level === "warn" ? "Sin reporte reciente" : level === "neutral" ? "Datos incompletos" : "En línea";
  const statusColorCls =
    level === "warn"
      ? "text-amber-700 dark:text-amber-300"
      : level === "neutral"
        ? "text-[#57534e] dark:text-[#cbd5e1]"
        : "text-emerald-700 dark:text-emerald-300";

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-[#fffdfa] shadow-[0_10px_28px_-18px_rgba(28,25,23,0.22)] transition-shadow hover:shadow-[0_14px_36px_-16px_rgba(28,25,23,0.28)] dark:bg-[#111a2b]/90 dark:shadow-[0_14px_36px_-16px_rgba(0,0,0,0.5)] xl:pb-6",
        borderCls
      )}
    >
      <div className={cn("bg-gradient-to-br p-5 sm:p-6", headerBgCls)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <h3 className={cn("break-words", uiCardTitle)}>{unit.name || "Unidad sin nombre"}</h3>
            <p className={cn("mt-1 break-words", uiCaption)}>
              {unit.device_type || "Sin tipo"} · UID {unit.uid || "—"}
            </p>
            {unit.is_shared ? (
              <p className={cn("mt-2 break-words", uiCaption)}>
                <span className="font-medium text-[#c45f00] dark:text-[#fb923c]">Compartida:</span>{" "}
                {unit.shared_with || "otros usuarios"}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:max-w-[45%] sm:shrink-0 sm:flex-col sm:items-end">
            {unit.is_shared ? (
              <span className={cn(uiBadge, "rounded-lg bg-[#fff3e6] text-[#c45f00] dark:bg-[#ff801f]/15 dark:text-[#ffb366]")}>
                Compartida
              </span>
            ) : null}
            <span className={cn(uiBadge, "rounded-lg whitespace-nowrap", badgeCls)}>
              {level === "ok" ? "Activa" : level === "warn" ? "Aviso" : "Pendiente"}
            </span>
          </div>
        </div>

        <div className="relative mt-5 space-y-5 pb-2">
          <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5 xl:grid-cols-2 xl:pr-28">
            <UnitField label="Teléfono" value={unit.phone} />
            <UnitField label="Último mensaje" value={unit.last_message_at} />
            <UnitField label="Creada" value={unit.created_at} className="sm:col-span-2 xl:col-span-1" />
            <div className="flex items-end sm:col-span-2 xl:col-span-1">
              <p className={cn("text-sm font-medium", statusColorCls)}>{statusText}</p>
            </div>
            {unit.custom_fields ? (
              <div className="sm:col-span-2 rounded-xl border border-[#e7ded0]/90 bg-white/70 px-3 py-2.5 dark:border-[#334155] dark:bg-[#0f172a]/50">
                <p className={uiLabel}>Campos personalizados</p>
                <p className={cn("mt-1 break-words", uiValueMuted)}>{unit.custom_fields}</p>
              </div>
            ) : null}
          </div>

          <div className="pointer-events-none flex justify-center sm:justify-end xl:absolute xl:bottom-4 xl:right-4 xl:justify-end">
            <img
              className="h-16 w-auto max-w-[9rem] select-none opacity-70 sm:h-20 sm:max-w-[10rem] xl:h-24"
              src={TRUCK_CARD_IMAGE}
              alt=""
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status === "Activo";
  return (
    <span
      className={cn(
        uiBadge,
        active
          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
      )}
    >
      {status}
    </span>
  );
}

function DealerBadge({ value }: { value: string }) {
  const yes = value === "Sí";
  return (
    <span
      className={cn(
        uiBadge,
        yes ? "bg-[#fff3e6] text-[#c45f00] dark:bg-[#ff801f]/15 dark:text-[#ffb366]" : erpChipNeutralClass
      )}
    >
      {value}
    </span>
  );
}

function MetaItem({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className={uiLabel}>{label}</dt>
      <dd className={cn("mt-1 break-words leading-snug tabular-nums", uiValue)}>{value || "—"}</dd>
    </div>
  );
}

export default function CuentasAntarixPage() {
  const { isAdmin, isAuthenticated, loading: authLoading, permissions } = useAuth();

  const cuentasPerms = (permissions as Record<string, { view?: boolean; edit?: boolean }>)?.cuentas_antarix;
  const canView = isAdmin || cuentasPerms?.view === true;
  const canEdit = isAdmin || cuentasPerms?.edit === true;
  const [rows, setRows] = useState<WialonUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "info", title: "", message: "" });

  const [selectedUser, setSelectedUser] = useState<WialonUserRow | null>(null);
  const [editUser, setEditUser] = useState<WialonUserRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitsError, setUnitsError] = useState("");
  const [units, setUnits] = useState<WialonUnitRow[]>([]);

  const loadUsers = async (forceRefresh = false) => {
    const showFullPageLoader = rows.length === 0;
    if (showFullPageLoader) setLoading(true);
    setError("");
    try {
      const url = forceRefresh ? "/api/wialon/usuarios/?refresh=1" : "/api/wialon/usuarios/";
      const res = await fetchApi(url, {
        method: "GET",
        cache: "no-store" as RequestCache,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setRows([]);
        if (res.status === 401) {
          setError("Sesión expirada o no válida. Vuelve a iniciar sesión.");
        } else if (res.status === 403) {
          setError("No tienes permiso para consultar cuentas de Antarix GPS.");
        } else {
          setError(String(data?.detail || `Error HTTP ${res.status}`));
        }
        return;
      }
      const list = Array.isArray(data?.users) ? (data.users as WialonUserRow[]) : [];
      setRows(list);
    } catch {
      setRows([]);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !isAuthenticated || !canView) return;
    loadUsers();
  }, [authLoading, isAuthenticated, canView]);

  const activosCount = useMemo(() => rows.filter((r) => r.status === "Activo").length, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const haystack = [
        r.user_id,
        r.name,
        r.creator,
        r.parent_account,
        r.dealer_rights,
        r.status,
        r.blocked,
        String(r.assigned_units),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search]);

  const showAlert = (
    variant: "success" | "error" | "warning" | "info",
    title: string,
    message: string
  ) => {
    setAlert({ show: true, variant, title, message });
    window.setTimeout(() => setAlert((p) => ({ ...p, show: false })), 4000);
  };

  const handleRefresh = async () => {
    await loadUsers(true);
    if (!error) {
      showAlert("info", "Actualizado", "Lista de usuarios Wialon sincronizada.");
    }
  };

  const closeUnitsModal = useCallback(() => {
    setUnitsOpen(false);
    setSelectedUser(null);
    setUnits([]);
    setUnitsError("");
    setUnitsLoading(false);
  }, []);

  const openEditUser = useCallback(
    (row: WialonUserRow) => {
      if (!canEdit) return;
      setEditUser(row);
      setEditOpen(true);
    },
    [canEdit]
  );

  const closeEditModal = useCallback(() => {
    setEditOpen(false);
    setEditUser(null);
  }, []);

  const handleUserSaved = useCallback((updated: WialonUserRow) => {
    const id = Number(updated.wialon_id);
    setRows((prev) =>
      prev.map((r) => (Number(r.wialon_id) === id ? { ...r, ...updated, wialon_id: id } : r))
    );
    setSelectedUser((prev) =>
      prev && Number(prev.wialon_id) === id ? { ...prev, ...updated, wialon_id: id } : prev
    );
    setEditUser((prev) =>
      prev && Number(prev.wialon_id) === id ? { ...prev, ...updated, wialon_id: id } : prev
    );
    showAlert("success", "Guardado", "Los cambios se aplicaron en Wialon.");
  }, []);

  const openUserUnits = useCallback(async (row: WialonUserRow) => {
    setSelectedUser(row);
    setUnitsOpen(true);
    setUnitsLoading(true);
    setUnitsError("");
    setUnits([]);
    try {
      const res = await fetchApi(`/api/wialon/usuarios/${row.wialon_id}/unidades/`, {
        method: "GET",
        cache: "no-store" as RequestCache,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setUnitsError(String(data?.detail || `Error HTTP ${res.status}`));
        return;
      }
      const list = Array.isArray(data?.units) ? (data.units as WialonUnitRow[]) : [];
      setUnits(list);
    } catch {
      setUnitsError("No se pudieron cargar las unidades.");
    } finally {
      setUnitsLoading(false);
    }
  }, []);

  const unitsModalTitleId = "cuentas-antarix-unidades-title";

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
        <p className={uiValueMuted}>Verificando acceso…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (!canView) {
    return <Navigate to="/ordenes-tecnico" replace />;
  }

  return (
    <div className="min-h-[calc(100dvh-5rem)] overflow-x-hidden">
      <div className={pageInnerClass} style={erpSansStyle}>
        <PageMeta
          title="Cuentas Antarix GPS | Sistema Grupo Intrax"
          description="Usuarios de Wialon — Antarix GPS"
        />

        {alert.show ? (
          <div role="alert" aria-live="polite">
            <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} />
          </div>
        ) : null}

        <nav className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-1", uiCaption)} aria-label="Migas de pan">
          <Link
            to="/"
            className="rounded-md px-1.5 py-0.5 text-[#57534e] transition-colors hover:bg-black/[0.03] hover:text-[#1c1917] dark:text-[#aeb8c8] dark:hover:bg-white/5 dark:hover:text-white"
          >
            Inicio
          </Link>
          <span className="text-[#d6d3d1] dark:text-[#334155]" aria-hidden>
            /
          </span>
          <span className="text-[#44403c] dark:text-[#cbd5e1]">Operación</span>
          <span className="text-[#d6d3d1] dark:text-[#334155]" aria-hidden>
            /
          </span>
          <span className="text-[#44403c] dark:text-[#cbd5e1]">Cuentas Antarix GPS</span>
        </nav>

        <header className={`relative flex w-full flex-col gap-4 ${erpCardShellClass} p-4 sm:p-6`}>
          <div
            className="pointer-events-none absolute right-4 top-4 h-20 w-20 rounded-full bg-[#ff801f]/10 blur-2xl sm:right-6 sm:top-6"
            aria-hidden
          />
          <div className="relative z-[1] flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff801f] text-black sm:h-11 sm:w-11">
              <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.75 6.5C6.75 3.6005 9.1005 1.25 12 1.25C14.8995 1.25 17.25 3.6005 17.25 6.5C17.25 9.3995 14.8995 11.75 12 11.75C9.1005 11.75 6.75 9.3995 6.75 6.5Z"
                  fill="currentColor"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M4.25 18.5714C4.25 15.6325 6.63249 13.25 9.57143 13.25H14.4286C17.3675 13.25 19.75 15.6325 19.75 18.5714C19.75 20.8792 17.8792 22.75 15.5714 22.75H8.42857C6.12081 22.75 4.25 20.8792 4.25 18.5714Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn(uiLabel, "text-[#ea580c] dark:text-[#fb923c]")}>Operación · Wialon</p>
              <h1 className={`mt-0.5 ${erpHeroHeadingClass}`}>Cuentas de Antarix GPS</h1>
              <p className={`mt-1 max-w-2xl ${erpBodyClass}`}>
                Usuarios disponibles en tu cuenta{" "}
                <span className="font-medium text-[#ea580c] dark:text-[#fb923c]">Wialon Hosting</span>. Los datos se
                obtienen en tiempo real con el token configurado en el servidor.
              </p>
              <div className="mt-3 h-px w-full max-w-xl bg-gradient-to-r from-[#ff801f]/35 via-[#ffbf8d]/30 to-transparent dark:from-[#ff9a52]/35 dark:via-[#64748b]/25 dark:to-transparent" />
            </div>
          </div>
        </header>

        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
          <div className={statCardClass}>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span className={statIconWrapClass}>
                <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
                  <path d="M20 22a8 8 0 1 0-16 0" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className={uiLabel}>Total usuarios</p>
                <p className={cn("mt-1", uiStatNumber)}>{loading ? "—" : rows.length.toLocaleString("es-MX")}</p>
              </div>
            </div>
          </div>

          <div className={statCardClass}>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200/80 bg-emerald-50/90 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 sm:h-10 sm:w-10">
                <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className={uiLabel}>Activos</p>
                <p className={cn("mt-1", uiStatNumber)}>{loading ? "—" : activosCount.toLocaleString("es-MX")}</p>
              </div>
            </div>
          </div>

          <div className={statCardClass}>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span className={statIconWrapClass}>
                <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className={uiLabel}>Mostrando</p>
                <p className={cn("mt-1", uiStatNumber)}>{loading ? "—" : filtered.length.toLocaleString("es-MX")}</p>
                {!loading && search.trim() ? (
                  <p className={cn("mt-1 truncate", uiCaption)}>Filtro: {search.trim()}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:justify-between">
          <div className="relative min-w-0 w-full shrink-0 sm:min-w-[min(100%,18rem)] sm:flex-1 md:min-w-[min(100%,22rem)] lg:max-w-none">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78716c] dark:text-[#64748b]"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path
                d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ID, nombre, creador, cuenta padre…"
              className={erpSearchInputClass}
              aria-label="Buscar usuarios Wialon"
            />
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className={cn(erpPrimaryBtnClass, "w-full shrink-0 sm:w-auto")}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0 0 14-2M19 5a9 9 0 0 0-14 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {loading ? "Cargando…" : "Actualizar"}
          </button>
        </div>

        <ComponentCard
          title="Usuarios Wialon"
          className={cn("min-w-0 overflow-hidden [&>div:first-child]:hidden", erpCardShellClass)}
          compact
        >
          <div className="mb-4 flex flex-col gap-1 border-b border-[#e7ded0]/80 pb-4 dark:border-[#273244] sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className={uiLabel}>Listado</p>
              <h2 className={cn("mt-1", erpSectionHeadingClass)}>Usuarios Wialon</h2>
              <p className={cn("mt-1", uiCaption)}>
                Edita la cuenta en Wialon o abre las unidades asignadas desde Acciones.
              </p>
            </div>
            {!loading && !error ? (
              <p className={cn("tabular-nums", uiCaption)}>
                {filtered.length} de {rows.length} registros
              </p>
            ) : null}
          </div>

          {loading ? (
            <p className={cn("py-12 text-center", uiValueMuted)}>Cargando usuarios…</p>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200/80 bg-rose-50/60 px-6 py-10 text-center dark:border-rose-900/40 dark:bg-rose-950/25">
              <p className={cn(uiValue, "text-rose-700 dark:text-rose-300")}>{error}</p>
              <p className={cn("mt-2", uiCaption)}>
                Verifica <span className={uiValue}>WIALON_ACCESS_TOKEN</span> en backend/.env y reinicia el servidor.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#e7ded0] bg-[#fcfaf6]/60 px-6 py-14 text-center dark:border-[#334155] dark:bg-[#0f172a]/40">
              <p className={uiCardTitle}>Sin resultados</p>
              <p className={cn("mt-1", uiCaption)}>No hay usuarios que coincidan con la búsqueda.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 xl:hidden">
                {filtered.map((row) => (
                  <article key={row.wialon_id} className={mobileUserCardClass}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className={cn("break-words", uiCardTitle)}>{row.name || "—"}</p>
                        <p className={cn("mt-1.5 break-all tabular-nums", uiCaption)}>ID {row.user_id || "—"}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                        <StatusBadge status={row.status} />
                        <DealerBadge value={row.dealer_rights} />
                      </div>
                    </div>
                    <dl className="mt-4 flex flex-col gap-4 border-t border-[#e7ded0]/80 pt-4 dark:border-[#334155]">
                      <MetaItem label="Cuenta padre" value={row.parent_account} />
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        <MetaItem label="Unidades" value={String(row.assigned_units)} />
                        <MetaItem label="Creador" value={row.creator} />
                        <MetaItem
                          label="Bloqueada"
                          value={row.status === "Bloqueado" && row.blocked !== "No" ? row.blocked : "No"}
                          className="col-span-2 sm:col-span-1"
                        />
                      </div>
                    </dl>
                    <div className="mt-4 flex flex-col gap-2 border-t border-[#e7ded0]/80 pt-4 dark:border-[#334155] sm:flex-row sm:items-center sm:justify-between">
                      <p className={cn(uiCaption)}>Acciones</p>
                      <div className={cn(erpRowActionBarClass, "w-full justify-center gap-2 p-2 sm:w-fit sm:gap-1 sm:p-1")}>
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => openEditUser(row)}
                            className={cn(
                              erpRowActionBtnClass,
                              "h-10 w-10 sm:h-7 sm:w-7",
                              "hover:border-[#ffa057] hover:text-[#ea580c] dark:hover:border-[#ff801f] dark:hover:text-[#ff801f]"
                            )}
                            title="Editar usuario"
                            aria-label={`Editar ${row.name || row.user_id}`}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => openUserUnits(row)}
                          className={cn(
                            erpRowActionBtnClass,
                            "h-10 w-10 sm:h-7 sm:w-7",
                            "hover:border-[#ffa057] hover:text-[#ea580c] dark:hover:border-[#ff801f] dark:hover:text-[#ff801f]"
                          )}
                          title="Ver unidades"
                          aria-label={`Ver unidades de ${row.name || row.user_id}`}
                        >
                          <BoxCubeIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden min-w-0 xl:block">
                <CuentasAntarixUsersTable
                  rows={filtered}
                  canEdit={canEdit}
                  onEdit={openEditUser}
                  onViewUnits={openUserUnits}
                />
              </div>
            </>
          )}
        </ComponentCard>

        <EditWialonUserModal
          user={editUser}
          isOpen={editOpen}
          onClose={closeEditModal}
          onSaved={handleUserSaved}
        />

        <Modal
          isOpen={unitsOpen}
          onClose={closeUnitsModal}
          closeOnBackdropClick={!unitsLoading}
          ariaLabelledBy={unitsModalTitleId}
          className={unitsModalClass}
        >
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#fffdfa] dark:bg-[#111a2b]">
            <header className="relative shrink-0 border-b border-[#e7ded0] bg-gradient-to-r from-[#fcfaf6] via-[#fffaf3] to-[#fffdfa] px-4 py-4 pr-14 dark:border-[#334155] dark:from-[#111827] dark:via-[#111827] dark:to-[#111827] sm:px-6 sm:py-5 sm:pr-16">
              <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#ff801f]" aria-hidden />
              <div className="flex min-w-0 items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ff801f] text-black shadow-sm sm:h-11 sm:w-11">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <path d="M12 2 4 7v10l8 5 8-5V7l-8-5Z" strokeLinejoin="round" />
                    <path d="M12 12 8 9.5V7l4 2.5v2.5L12 12Z" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn(uiLabel, "text-[#ea580c] dark:text-[#fb923c]")}>Unidades asignadas</p>
                  <h2 id={unitsModalTitleId} className={cn("mt-1", erpSubheadingClass)}>
                    {selectedUser?.name || "—"}
                  </h2>
                  <p className={cn("mt-1 break-words tabular-nums", uiCaption)}>
                    ID {selectedUser?.user_id || "—"}
                    {selectedUser?.parent_account ? (
                      <>
                        <span className="hidden min-[420px]:inline"> · </span>
                        <span className="block min-[420px]:inline">{selectedUser.parent_account}</span>
                      </>
                    ) : null}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={cn(uiBadge, "rounded-lg border border-[#e7ded0] bg-white/90 text-[#57534e] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#cbd5e1]")}>
                      {unitsLoading ? "Cargando…" : `${units.length} unidad${units.length === 1 ? "" : "es"}`}
                    </span>
                    {selectedUser ? <StatusBadge status={selectedUser.status} /> : null}
                    {selectedUser ? (
                      <span className={cn(uiBadge, "rounded-lg bg-[#fff3e6] text-[#c45f00] dark:bg-[#ff801f]/15 dark:text-[#ffb366]")}>
                        {selectedUser.assigned_units} asignadas
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </header>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#faf9f5]/50 p-4 dark:bg-[#0f172a]/30 sm:p-6">
              {unitsLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20">
                  <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-[#ff801f] border-t-transparent" aria-hidden />
                  <p className={uiValueMuted}>Cargando unidades…</p>
                </div>
              ) : unitsError ? (
                <div className="rounded-2xl border border-rose-200/80 bg-rose-50/70 px-6 py-12 text-center dark:border-rose-900/45 dark:bg-rose-950/30">
                  <p className={cn(uiValue, "text-rose-700 dark:text-rose-300")}>{unitsError}</p>
                </div>
              ) : units.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#e7ded0] bg-[#fcfaf6]/70 px-6 py-16 text-center dark:border-[#334155] dark:bg-[#0f172a]/40">
                  <p className={uiCardTitle}>Sin unidades</p>
                  <p className={cn("mt-1", uiCaption)}>Este usuario no tiene unidades asignadas en Wialon.</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <p className={uiLabel}>Flota asignada</p>
                    <p className={cn("tabular-nums", uiCaption)}>{units.length} en total</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 min-[480px]:gap-5 2xl:grid-cols-3">
                    {units.map((unit) => (
                      <WialonUnitCard key={unit.wialon_id} unit={unit} />
                    ))}
                  </div>
                </>
              )}
            </div>

            <footer className="shrink-0 border-t border-[#e7ded0] bg-[#fcfaf6] px-4 py-3.5 dark:border-[#334155] dark:bg-[#111827] sm:px-6 sm:py-4">
              <button
                type="button"
                onClick={closeUnitsModal}
                className={cn(erpSecondaryBtnClass, "w-full sm:ml-auto sm:w-auto")}
              >
                Cerrar
              </button>
            </footer>
          </div>
        </Modal>
      </div>
    </div>
  );
}
