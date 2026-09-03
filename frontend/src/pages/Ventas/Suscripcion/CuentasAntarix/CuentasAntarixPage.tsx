import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import Alert from "@/components/ui/alert/Alert";
import { fetchApi } from "@/config/api";
import { cn } from "@/lib/utils";
import { useCuentasAntarixPermissions } from "./useCuentasAntarixPermissions";
import {
  caaCountPillClass,
  caaEmptyPanelClass,
  caaEyebrowClass,
  caaBreadcrumbCurrentClass,
  caaBreadcrumbLinkClass,
  caaBreadcrumbNavClass,
  caaBreadcrumbSepClass,
  caaHeroBandClass,
  caaHeroBlurClass,
  caaHeroBodyClass,
  caaHeroEyebrowClass,
  caaHeroIconWrapClass,
  caaHeroLinkClass,
  caaPageCanvasClass,
  caaPageInnerClass,
  caaViewTabClass,
  caaViewTabTrackClass,
  erpCardShellClass,
  erpHeroHeadingClass,
  erpPrimaryBtnClass,
  erpSansStyle,
  erpSearchInputClass,
  erpSectionHeadingClass,
} from "./shared/cuentasAntarixStyles";
import type { UserModalTab, WialonUnitSearchEntry, WialonUserRow } from "./shared/wialonTypes";
import { unitEntryMatchesQuery } from "./shared/cuentasAntarixSearch";
import CuentasAntarixUsersTable from "./list/CuentasAntarixUsersTable";
import CuentasAntarixUnitsTable from "./list/CuentasAntarixUnitsTable";
import CuentasAntarixUsersMobileList from "./list/CuentasAntarixUsersMobileList";
import CuentasAntarixUnitsMobileList from "./list/CuentasAntarixUnitsMobileList";
import CuentasAntarixPageStats from "./list/CuentasAntarixPageStats";
import EditWialonUserModal from "./form/EditWialonUserModal";

const uiValueMuted = "text-sm font-normal leading-snug text-[#52525B] dark:text-[#B7C1D1]";
const uiCaption = "text-xs font-normal leading-relaxed text-[#6E6E77] dark:text-[#8EA0B8]";
const uiCardTitle = "text-base font-semibold leading-snug tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]";
const pageInnerClass = caaPageInnerClass;
const viewTabClass = caaViewTabClass;

type DirectoryView = "cuentas" | "unidades";

export default function CuentasAntarixPage() {
  const { canView, canEdit, isAuthenticated, authLoading } = useCuentasAntarixPermissions();

  const [rows, setRows] = useState<WialonUserRow[]>([]);
  const [unitSearchIndex, setUnitSearchIndex] = useState<WialonUnitSearchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unitIndexLoading, setUnitIndexLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState<DirectoryView>("cuentas");
  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "info", title: "", message: "" });

  const [modalUser, setModalUser] = useState<WialonUserRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<UserModalTab>("cuenta");
  const [modalInitialUnitId, setModalInitialUnitId] = useState<number | null>(null);

  const loadUnitSearchIndex = async (forceRefresh = false) => {
    setUnitIndexLoading(true);
    try {
      const url = forceRefresh
        ? "/api/wialon/indice-unidades/?refresh=1"
        : "/api/wialon/indice-unidades/";
      const res = await fetchApi(url, { method: "GET", cache: "no-store" as RequestCache });
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

  const loadUsers = async (forceRefresh = false): Promise<boolean> => {
    const showFullPageLoader = rows.length === 0;
    if (showFullPageLoader) setLoading(true);
    if (forceRefresh && !showFullPageLoader) setRefreshing(true);
    setUnitIndexLoading(true);
    setError("");
    try {
      const url = forceRefresh ? "/api/wialon/usuarios/?refresh=1" : "/api/wialon/usuarios/";
      const res = await fetchApi(url, { method: "GET", cache: "no-store" as RequestCache });
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
                "No se pudo conectar con Wialon. Verifica WIALON_ACCESS_TOKEN en backend/.env y reinicia el servidor.",
            ),
          );
        } else {
          setError(String(data?.detail || `Error HTTP ${res.status}`));
        }
        return false;
      }
      const list = Array.isArray(data?.users) ? (data.users as WialonUserRow[]) : [];
      setRows(list);
      const bundledUnits = Array.isArray(data?.units_index)
        ? (data.units_index as WialonUnitSearchEntry[])
        : null;
      if (bundledUnits) {
        setUnitSearchIndex(bundledUnits);
        setUnitIndexLoading(false);
      } else {
        await loadUnitSearchIndex(forceRefresh);
      }
      return true;
    } catch {
      setRows([]);
      setUnitSearchIndex([]);
      setError("No se pudo conectar con el servidor.");
      return false;
    } finally {
      setLoading(false);
      setRefreshing(false);
      setUnitIndexLoading(false);
    }
  };

  const purgeExpiredBlocked = async (): Promise<number> => {
    if (!canEdit) return 0;
    try {
      const res = await fetchApi("/api/wialon/usuarios/limpiar-bloqueados/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 35, dry_run: false }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return 0;
      return typeof data?.purged_count === "number" ? data.purged_count : 0;
    } catch {
      return 0;
    }
  };

  useEffect(() => {
    if (authLoading || !isAuthenticated || !canView) return;
    void loadUsers();
    // loadUsers reads `rows` for a show-full-loader heuristic; including it
    // in deps would cause an infinite loop — this is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, canView]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !canView) return;
    if (activeView !== "unidades") return;
    void loadUnitSearchIndex(true);
  }, [activeView, authLoading, isAuthenticated, canView]);

  const activosCount = useMemo(() => rows.filter((r) => r.status === "Activo").length, [rows]);
  const activeUnitsCount = useMemo(
    () => unitSearchIndex.filter((u) => u.is_active === true || u.status === "Activo").length,
    [unitSearchIndex],
  );

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = !q
      ? [...unitSearchIndex]
      : unitSearchIndex.filter((entry) => unitEntryMatchesQuery(entry, q));
    return list.sort((a, b) =>
      (a.name || a.uid || String(a.unit_id)).localeCompare(
        b.name || b.uid || String(b.unit_id),
        "es",
        { sensitivity: "base" },
      ),
    );
  }, [search, unitSearchIndex]);

  const { filteredRows, matchedUnitsByUser } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byBlockedFirst = (list: WialonUserRow[]) =>
      [...list].sort((a, b) => {
        const aBlocked = a.status === "Bloqueado" ? 0 : 1;
        const bBlocked = b.status === "Bloqueado" ? 0 : 1;
        if (aBlocked !== bBlocked) return aBlocked - bBlocked;
        return (a.name || a.user_id || "").localeCompare(b.name || b.user_id || "", "es", {
          sensitivity: "base",
        });
      });

    if (!q) {
      return {
        filteredRows: byBlockedFirst(rows),
        matchedUnitsByUser: new Map<number, string[]>(),
      };
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

    const filteredRows = byBlockedFirst(
      rows.filter((r) => {
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
      }),
    );

    return { filteredRows, matchedUnitsByUser };
  }, [rows, search, unitSearchIndex]);

  const showAlert = (
    variant: "success" | "error" | "warning" | "info",
    title: string,
    message: string,
  ) => {
    setAlert({ show: true, variant, title, message });
    window.setTimeout(() => setAlert((p) => ({ ...p, show: false })), 4000);
  };

  const handleRefresh = async () => {
    if (loading || refreshing) return;
    const ok = await loadUsers(true);
    if (!ok) return;
    let purgedCount = 0;
    if (canEdit) {
      purgedCount = await purgeExpiredBlocked();
      if (purgedCount > 0) {
        await loadUsers(true);
      }
    }
    if (purgedCount > 0) {
      showAlert(
        "success",
        "Actualizado",
        `Sincronizado con Wialon. Se limpiaron ${purgedCount} cuenta(s) bloqueada(s) hace más de 35 días (unidades desactivadas y usuarios eliminados).`,
      );
    } else {
      showAlert("info", "Actualizado", "Usuarios e índice de unidades sincronizados con Wialon.");
    }
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalUser(null);
    setModalInitialTab("cuenta");
    setModalInitialUnitId(null);
  }, []);

  const openEditUser = useCallback(
    (row: WialonUserRow, opts?: { tab?: UserModalTab; unitId?: number | null }) => {
      if (!canEdit) return;
      setModalInitialTab(opts?.tab ?? "cuenta");
      setModalInitialUnitId(
        opts?.unitId != null && Number.isFinite(Number(opts.unitId)) ? Number(opts.unitId) : null,
      );
      setModalUser(row);
      setModalOpen(true);
    },
    [canEdit],
  );

  const openUnitEntry = useCallback(
    (entry: WialonUnitSearchEntry) => {
      if (!canEdit) return;
      const linkedOwners = entry.users ?? [];
      const ownerFromList =
        linkedOwners
          .map((u) => rows.find((r) => Number(r.wialon_id) === Number(u.wialon_id)))
          .find((row): row is WialonUserRow => Boolean(row)) ?? null;
      const fallbackOwner =
        linkedOwners[0] && Number.isFinite(Number(linkedOwners[0].wialon_id))
          ? ({
              wialon_id: Number(linkedOwners[0].wialon_id),
              user_id: linkedOwners[0].user_id || "",
              name: linkedOwners[0].name || "",
              creator: "—",
              parent_account: "—",
              dealer_rights: "No",
              assigned_units: 0,
              status: "Activo",
              blocked: "No",
            } satisfies WialonUserRow)
          : null;
      const owner = ownerFromList ?? fallbackOwner;
      if (!owner) {
        showAlert("warning", "Sin cuenta", "Esta unidad no tiene una cuenta Wialon asociada en el índice.");
        return;
      }
      openEditUser(owner, { tab: "unidades", unitId: entry.unit_id });
    },
    [canEdit, openEditUser, rows],
  );

  const handleUserSaved = useCallback((updated: WialonUserRow) => {
    const id = Number(updated.wialon_id);
    setRows((prev) =>
      prev.map((r) => (Number(r.wialon_id) === id ? { ...r, ...updated, wialon_id: id } : r)),
    );
    setModalUser((prev) =>
      prev && Number(prev.wialon_id) === id ? { ...prev, ...updated, wialon_id: id } : prev,
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
    <div className={cn(caaPageCanvasClass, "overflow-x-hidden")}>
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

        <nav className={caaBreadcrumbNavClass} aria-label="Migas de pan">
          <Link to="/" className={caaBreadcrumbLinkClass}>
            Inicio
          </Link>
          <span className={caaBreadcrumbSepClass} aria-hidden>/</span>
          <span className={caaBreadcrumbCurrentClass}>Ventas</span>
          <span className={caaBreadcrumbSepClass} aria-hidden>/</span>
          <span className={caaBreadcrumbCurrentClass}>Suscripción</span>
          <span className={caaBreadcrumbSepClass} aria-hidden>/</span>
          <span className={caaBreadcrumbCurrentClass}>Cuentas Antarix GPS</span>
        </nav>

        <header className={caaHeroBandClass}>
          <div className={caaHeroBlurClass} aria-hidden />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <div className="flex min-w-0 items-start gap-4">
              <span className={caaHeroIconWrapClass} aria-hidden>
                <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden>
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
              </span>
              <div className="min-w-0">
                <p className={caaHeroEyebrowClass}>Ventas · Suscripción</p>
                <h1 className={`mt-1 ${erpHeroHeadingClass}`}>Cuentas de Antarix GPS</h1>
                <p className={caaHeroBodyClass}>
                  Usuarios disponibles en tu cuenta{" "}
                  <span className={caaHeroLinkClass}>Wialon Hosting</span>. Los datos se obtienen en
                  tiempo real con el token configurado en el servidor.
                </p>
              </div>
            </div>

            <CuentasAntarixPageStats
              activeView={activeView}
              totalUsers={rows.length}
              activeUsers={activosCount}
              shownUsers={filteredRows.length}
              totalUnits={unitSearchIndex.length}
              activeUnits={activeUnitsCount}
              shownUnits={filteredUnits.length}
              loading={loading}
              unitIndexLoading={unitIndexLoading}
            />
          </div>
        </header>

        {/* Search + refresh row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:justify-between">
          <div className="relative w-full min-w-0 shrink-0 sm:min-w-[min(100%,18rem)] sm:flex-1 md:min-w-[min(100%,22rem)] lg:max-w-none">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E6E77] dark:text-[#64748b]"
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
              placeholder={
                activeView === "unidades"
                  ? "Buscar unidad, UID/IMEI, teléfono, cuenta…"
                  : "Buscar cuenta, nombre de unidad, UID/IMEI, campo personalizado…"
              }
              className={erpSearchInputClass}
              aria-label={
                activeView === "unidades"
                  ? "Buscar unidades Wialon"
                  : "Buscar usuarios o unidades Wialon"
              }
            />
          </div>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={loading || refreshing}
            aria-busy={loading || refreshing}
            aria-label="Actualizar datos desde Wialon"
            className={cn(erpPrimaryBtnClass, "w-full shrink-0 sm:w-auto")}
          >
            <svg
              className={cn(
                "h-4 w-4 shrink-0",
                (loading || refreshing) && "animate-spin motion-reduce:animate-none",
              )}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path
                d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0 0 14-2M19 5a9 9 0 0 0-14 2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {loading || refreshing ? "Actualizando…" : "Actualizar"}
          </button>
        </div>

        {activeView === "cuentas" && search.trim() && unitIndexLoading ? (
          <p className={cn("-mt-1", uiCaption)}>
            Cargando índice de unidades para búsqueda por IMEI…
          </p>
        ) : null}
        {activeView === "cuentas" && search.trim() && !unitIndexLoading && unitSearchIndex.length === 0 ? (
          <p className={cn("-mt-1 text-amber-800 dark:text-amber-300", uiCaption)}>
            El índice de unidades no está disponible. Pulsa Actualizar e intenta de nuevo.
          </p>
        ) : null}

        <ComponentCard
          title="Directorio"
          className={cn("min-w-0 [&>div:first-child]:hidden", erpCardShellClass)}
          compact
        >
          {/* Directory header + view tabs */}
          <div className="mb-4 flex flex-col gap-3 border-b border-[#E7E7EA] pb-4 dark:border-[#273244] sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className={caaEyebrowClass}>Directorio</p>
              <h2 className={cn("mt-1", erpSectionHeadingClass)}>
                {activeView === "unidades" ? "Unidades Wialon" : "Usuarios Wialon"}
              </h2>
              <p className={cn("mt-1", uiCaption)}>
                {activeView === "unidades"
                  ? "Todas las unidades de la flota. Abre una para editar ficha, SIM y accesos desde su cuenta."
                  : "Cada fila es una cuenta. Abre la ficha para editar datos, flota y accesos."}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
              {/* Tabs — full-width grid on mobile, auto on sm+ */}
              <div
                className={cn(caaViewTabTrackClass, "grid w-full grid-cols-2 sm:w-auto sm:flex")}
                role="tablist"
                aria-label="Vista del directorio"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeView === "cuentas"}
                  onClick={() => setActiveView("cuentas")}
                  className={cn(viewTabClass(activeView === "cuentas"), "min-h-[44px]")}
                >
                  Cuentas
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeView === "unidades"}
                  onClick={() => setActiveView("unidades")}
                  className={cn(viewTabClass(activeView === "unidades"), "min-h-[44px]")}
                >
                  Unidades
                </button>
              </div>
              {activeView === "cuentas" && !loading && !error ? (
                <p className={caaCountPillClass}>
                  {filteredRows.length} de {rows.length}
                </p>
              ) : null}
              {activeView === "unidades" && !unitIndexLoading ? (
                <p className={caaCountPillClass}>
                  {filteredUnits.length} de {unitSearchIndex.length}
                </p>
              ) : null}
            </div>
          </div>

          {/* Cuentas panel */}
          {activeView === "cuentas" ? (
            loading ? (
              <p className={cn("py-12 text-center", uiValueMuted)}>Cargando usuarios…</p>
            ) : error ? (
              <div className="rounded-[20px] border border-[#F6CFCF] bg-[#FEF2F2] px-6 py-10 text-center dark:border-[#7F1D1D] dark:bg-[#3F1518]">
                <p className={cn("text-sm font-medium text-[#C22B2B] dark:text-[#F87171]")}>
                  {error}
                </p>
                <p className={cn("mt-2", uiCaption)}>
                  Verifica{" "}
                  <span className="text-sm font-medium text-[#09090B] dark:text-[#F8FAFC]">
                    WIALON_ACCESS_TOKEN
                  </span>{" "}
                  en backend/.env y reinicia el servidor.
                </p>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className={caaEmptyPanelClass}>
                <p className={uiCardTitle}>Sin resultados</p>
                <p className={cn("mt-1", uiCaption)}>
                  No hay cuentas ni unidades que coincidan con la búsqueda.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile cards — visible below lg */}
                <div className="space-y-3 lg:hidden">
                  <CuentasAntarixUsersMobileList
                    rows={filteredRows}
                    canEdit={canEdit}
                    search={search}
                    matchedUnitsByUser={search.trim() ? matchedUnitsByUser : undefined}
                    onEdit={openEditUser}
                  />
                </div>
                {/* Desktop table — visible from lg */}
                <div className="hidden min-w-0 overflow-x-auto touch-pan-x lg:block">
                  <CuentasAntarixUsersTable
                    rows={filteredRows}
                    canEdit={canEdit}
                    matchedUnitsByUser={search.trim() ? matchedUnitsByUser : undefined}
                    onEdit={openEditUser}
                  />
                </div>
              </>
            )
          ) : /* Unidades panel */
          unitIndexLoading && unitSearchIndex.length === 0 ? (
            <p className={cn("py-12 text-center", uiValueMuted)}>Cargando unidades…</p>
          ) : unitSearchIndex.length === 0 ? (
            <div className={caaEmptyPanelClass}>
              <p className={uiCardTitle}>Sin unidades</p>
              <p className={cn("mt-1", uiCaption)}>
                El índice de unidades no está disponible. Pulsa Actualizar e intenta de nuevo.
              </p>
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className={caaEmptyPanelClass}>
              <p className={uiCardTitle}>Sin resultados</p>
              <p className={cn("mt-1", uiCaption)}>
                No hay unidades que coincidan con la búsqueda.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile cards — visible below lg */}
              <div className="space-y-3 lg:hidden">
                <CuentasAntarixUnitsMobileList
                  rows={filteredUnits}
                  canEdit={canEdit}
                  onOpen={openUnitEntry}
                />
              </div>
              {/* Desktop table — visible from lg */}
              <div className="hidden min-w-0 overflow-x-auto touch-pan-x lg:block">
                <CuentasAntarixUnitsTable
                  rows={filteredUnits}
                  canEdit={canEdit}
                  onOpen={openUnitEntry}
                />
              </div>
            </>
          )}
        </ComponentCard>

        <EditWialonUserModal
          user={modalUser}
          allUsers={rows}
          isOpen={modalOpen}
          initialTab={modalInitialTab}
          initialUnitId={modalInitialUnitId}
          canEdit={canEdit}
          onClose={closeModal}
          onSaved={handleUserSaved}
          onOpenUser={openEditUser}
        />
      </div>
    </div>
  );
}
