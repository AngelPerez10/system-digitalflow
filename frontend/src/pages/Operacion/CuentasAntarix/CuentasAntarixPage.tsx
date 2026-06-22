import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import Alert from "@/components/ui/alert/Alert";
import CuentasAntarixUsersTable from "./CuentasAntarixUsersTable";
import EditWialonUserModal from "./EditWialonUserModal";
import type { WialonUnitSearchEntry, WialonUserRow } from "./wialonTypes";
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
  erpSectionHeadingClass,
  erpSectionLabelClass,
} from "@/layout/erpPageStyles";
import {
  erpRowActionBarClass,
  erpRowActionBtnClass,
} from "@/pages/Operacion/OrdenesTrabajo/ordenTrabajoStyles";
import { PencilIcon } from "@/icons";

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

const mobileUserCardClass =
  "w-full min-w-0 overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fcfaf6]/90 p-4 text-left font-normal shadow-[0_8px_24px_-16px_rgba(28,25,23,0.2)] transition-all hover:border-[#ff801f]/35 hover:bg-[#fff8f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff801f] dark:border-[#273244] dark:bg-[#111a2b]/80 dark:hover:border-[#fb923c]/40 dark:hover:bg-white/[0.04] sm:p-5";

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

function compactSearchToken(value: string): string {
  return value.replace(/[\s\-_./:;]+/g, "").toLowerCase();
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function unitEntryMatchesQuery(entry: WialonUnitSearchEntry, query: string): boolean {
  const haystack = (
    entry.search_text ??
    [entry.name, entry.uid, entry.phone, entry.custom_fields, String(entry.unit_id)].join(" ")
  ).toLowerCase();
  if (haystack.includes(query)) return true;

  const queryDigits = digitsOnly(query);
  const uidDigits = digitsOnly(String(entry.uid ?? ""));
  const phoneDigits = digitsOnly(String(entry.phone ?? ""));
  if (queryDigits.length >= 6) {
    if (uidDigits.includes(queryDigits) || phoneDigits.includes(queryDigits)) return true;
    if (digitsOnly(haystack).includes(queryDigits)) return true;
  }

  const compactQuery = compactSearchToken(query);
  if (compactQuery.length < 3) return false;
  return compactSearchToken(haystack).includes(compactQuery);
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
  const [unitSearchIndex, setUnitSearchIndex] = useState<WialonUnitSearchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [unitIndexLoading, setUnitIndexLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "info", title: "", message: "" });

  const [modalUser, setModalUser] = useState<WialonUserRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadUsers = async (forceRefresh = false) => {
    const showFullPageLoader = rows.length === 0;
    if (showFullPageLoader) setLoading(true);
    setUnitIndexLoading(true);
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
        } else if (res.status === 502) {
          setError(
            String(
              data?.detail ||
                "No se pudo conectar con Wialon. Verifica WIALON_ACCESS_TOKEN en backend/.env y reinicia el servidor."
            )
          );
        } else {
          setError(String(data?.detail || `Error HTTP ${res.status}`));
        }
        return;
      }
      const list = Array.isArray(data?.users) ? (data.users as WialonUserRow[]) : [];
      setRows(list);
      const bundledUnits = Array.isArray(data?.units_index)
        ? (data.units_index as WialonUnitSearchEntry[])
        : null;
      if (bundledUnits) {
        setUnitSearchIndex(bundledUnits);
        setUnitIndexLoading(false);
      } else if (!forceRefresh) {
        await loadUnitSearchIndex(false);
      }
    } catch {
      setRows([]);
      setUnitSearchIndex([]);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
      setUnitIndexLoading(false);
    }
  };

  const loadUnitSearchIndex = async (forceRefresh = false) => {
    setUnitIndexLoading(true);
    try {
      const url = forceRefresh ? "/api/wialon/indice-unidades/?refresh=1" : "/api/wialon/indice-unidades/";
      const res = await fetchApi(url, {
        method: "GET",
        cache: "no-store" as RequestCache,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setUnitSearchIndex([]);
        return;
      }
      const list = Array.isArray(data?.units) ? (data.units as WialonUnitSearchEntry[]) : [];
      setUnitSearchIndex(list);
    } catch {
      setUnitSearchIndex([]);
    } finally {
      setUnitIndexLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !isAuthenticated || !canView) return;
    void loadUsers();
  }, [authLoading, isAuthenticated, canView]);

  const activosCount = useMemo(() => rows.filter((r) => r.status === "Activo").length, [rows]);

  const { filteredRows, matchedUnitsByUser } = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return { filteredRows: rows, matchedUnitsByUser: new Map<number, string[]>() };
    }

    const matchedUnitsByUser = new Map<number, string[]>();
    const userIdsFromUnits = new Set<number>();

    for (const entry of unitSearchIndex) {
      if (!unitEntryMatchesQuery(entry, q)) continue;

      const unitLabel = entry.name || entry.uid || `Unidad ${entry.unit_id}`;
      for (const owner of entry.users) {
        const ownerId = Number(owner.wialon_id);
        if (!Number.isFinite(ownerId)) continue;
        userIdsFromUnits.add(ownerId);
        const prev = matchedUnitsByUser.get(ownerId) ?? [];
        if (!prev.includes(unitLabel)) {
          matchedUnitsByUser.set(ownerId, [...prev, unitLabel]);
        }
      }
    }

    const filteredRows = rows.filter((r) => {
      const accountHaystack = [
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
      if (accountHaystack.includes(q)) return true;
      return userIdsFromUnits.has(Number(r.wialon_id));
    });

    return { filteredRows, matchedUnitsByUser };
  }, [rows, search, unitSearchIndex]);

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
      showAlert("info", "Actualizado", "Usuarios e índice de unidades sincronizados con Wialon.");
    }
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalUser(null);
  }, []);

  const openEditUser = useCallback(
    (row: WialonUserRow) => {
      if (!canEdit) return;
      setModalUser(row);
      setModalOpen(true);
    },
    [canEdit]
  );

  const handleUserSaved = useCallback((updated: WialonUserRow) => {
    const id = Number(updated.wialon_id);
    setRows((prev) =>
      prev.map((r) => (Number(r.wialon_id) === id ? { ...r, ...updated, wialon_id: id } : r))
    );
    setModalUser((prev) =>
      prev && Number(prev.wialon_id) === id ? { ...prev, ...updated, wialon_id: id } : prev
    );
    showAlert("success", "Guardado", "Los cambios se aplicaron en Wialon.");
  }, []);

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
                <p className={cn("mt-1", uiStatNumber)}>{loading ? "—" : filteredRows.length.toLocaleString("es-MX")}</p>
                {!loading && search.trim() ? (
                  <p className={cn("mt-1 truncate", uiCaption)}>
                    Filtro: {search.trim()}
                    {unitIndexLoading ? " · unidades…" : ""}
                  </p>
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
              placeholder="Buscar cuenta, nombre de unidad, UID/IMEI, campo personalizado…"
              className={erpSearchInputClass}
              aria-label="Buscar usuarios o unidades Wialon"
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
        {search.trim() && unitIndexLoading ? (
          <p className={cn("-mt-1", uiCaption)}>Cargando índice de unidades para búsqueda por IMEI…</p>
        ) : null}
        {search.trim() && !unitIndexLoading && unitSearchIndex.length === 0 ? (
          <p className={cn("-mt-1 text-amber-800 dark:text-amber-300", uiCaption)}>
            El índice de unidades no está disponible. Pulsa Actualizar e intenta de nuevo.
          </p>
        ) : null}

        <ComponentCard
          title="Usuarios Wialon"
          className={cn(
            "min-w-0 overflow-hidden [&>div:first-child]:hidden",
            erpCardShellClass,
            "border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.22)] dark:border-[#273244] dark:bg-[#111827]/80 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.5)]"
          )}
          compact
        >
          <div className="mb-4 flex flex-col gap-1 border-b border-[#e7ded0]/80 pb-4 dark:border-[#273244] sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className={uiLabel}>Listado</p>
              <h2 className={cn("mt-1", erpSectionHeadingClass)}>Usuarios Wialon</h2>
              <p className={cn("mt-1", uiCaption)}>
                Edita la cuenta y sus unidades en Wialon desde Acciones.
              </p>
            </div>
            {!loading && !error ? (
              <p className={cn("tabular-nums", uiCaption)}>
                {filteredRows.length} de {rows.length} registros
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
          ) : filteredRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#e7ded0] bg-[#fcfaf6]/60 px-6 py-14 text-center dark:border-[#334155] dark:bg-[#0f172a]/40">
              <p className={uiCardTitle}>Sin resultados</p>
              <p className={cn("mt-1", uiCaption)}>
                No hay cuentas ni unidades que coincidan con la búsqueda.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 xl:hidden">
                {filteredRows.map((row) => (
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
                    {search.trim() && matchedUnitsByUser.get(Number(row.wialon_id))?.length ? (
                      <div className="mt-3 rounded-xl border border-[#e7ded0]/90 bg-[#fff8f1]/80 px-3 py-2.5 dark:border-[#334155] dark:bg-[#ff801f]/10">
                        <p className={uiLabel}>Unidades coincidentes</p>
                        <p className={cn("mt-1 break-words", uiCaption)}>
                          {matchedUnitsByUser.get(Number(row.wialon_id))!.join(" · ")}
                        </p>
                      </div>
                    ) : null}
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
                    {canEdit ? (
                      <div className="mt-4 flex flex-col gap-2 border-t border-[#e7ded0]/80 pt-4 dark:border-[#334155] sm:flex-row sm:items-center sm:justify-between">
                        <p className={cn(uiCaption)}>Acciones</p>
                        <div className={cn(erpRowActionBarClass, "w-full justify-center gap-2 p-2 sm:w-fit sm:gap-1 sm:p-1")}>
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
                        </div>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>

              <div className="hidden min-w-0 xl:block">
                <CuentasAntarixUsersTable
                  rows={filteredRows}
                  canEdit={canEdit}
                  matchedUnitsByUser={search.trim() ? matchedUnitsByUser : undefined}
                  onEdit={openEditUser}
                />
              </div>
            </>
          )}
        </ComponentCard>

        <EditWialonUserModal
          user={modalUser}
          isOpen={modalOpen}
          initialTab="cuenta"
          canEdit={canEdit}
          onClose={closeModal}
          onSaved={handleUserSaved}
        />
      </div>
    </div>
  );
}
