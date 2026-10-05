import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import Alert from "@/components/ui/alert/Alert";
import { fetchApi } from "@/config/api";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import "@/components/ui/modal-kit/motion.css";
import "./cuentasAntarix.css";
import { useCuentasAntarixPermissions } from "./useCuentasAntarixPermissions";
import {
  caaEmptyPanelClass,
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
  erpCardShellClass,
  erpHeroHeadingClass,
  erpPrimaryBtnClass,
  erpSansStyle,
  erpSearchInputClass,
} from "./shared/cuentasAntarixStyles";
import type { UserModalTab, WialonUnitSearchEntry, WialonUserRow } from "./shared/wialonTypes";
import { unitEntryMatchesQuery } from "./shared/cuentasAntarixSearch";
import { guardarSnapshot, leerSnapshot } from "./shared/cuentasAntarixSnapshot";
import {
  CAA_FILTROS_DEFAULT,
  agruparCuentas,
  agruparUnidades,
  esBloqueada,
  filtrosActivos,
  pasaFiltros,
  unidadesDe,
  type CaaFiltros,
} from "./shared/cuentasAntarixFiltros";
import CuentasAntarixFiltersPopover, { type CaaFiltroConteos } from "./list/CuentasAntarixFiltersPopover";
import CuentasAntarixDirectoryHeader, { type CaaResumenItem } from "./list/CuentasAntarixDirectoryHeader";
import { SECCION_TONE, UNIDAD_SECCION_TONE } from "./shared/cuentasAntarixTonos";
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

type DirectoryView = "cuentas" | "unidades";

export default function CuentasAntarixPage() {
  const { canView, canEdit, isAuthenticated, authLoading } = useCuentasAntarixPermissions();
  const { user } = useAuth();
  const snapshotKey = user?.id ?? user?.username ?? null;

  const [rows, setRows] = useState<WialonUserRow[]>([]);
  const [unitSearchIndex, setUnitSearchIndex] = useState<WialonUnitSearchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  /** Refresco silencioso en curso (se ve la lista anterior mientras llega la nueva). */
  const [syncing, setSyncing] = useState(false);
  const staleRetryRef = useRef(0);
  const lastStaleRef = useRef(false);
  /** El servidor está trayendo datos nuevos de Wialon en segundo plano. */
  const [esperandoWialon, setEsperandoWialon] = useState(false);
  const [unitIndexLoading, setUnitIndexLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState<DirectoryView>("cuentas");
  const [filtros, setFiltros] = useState<CaaFiltros>(CAA_FILTROS_DEFAULT);
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

  /**
   * `silent`: ya hay datos en pantalla (caché de sesión o carga previa); se
   * refresca sin esqueletos ni bloquear la lista.
   */
  const loadUsers = async (forceRefresh = false, silent = false): Promise<boolean> => {
    const showFullPageLoader = !silent && rows.length === 0;
    if (showFullPageLoader) setLoading(true);
    if (forceRefresh && !showFullPageLoader) setRefreshing(true);
    if (silent) setSyncing(true);
    else setUnitIndexLoading(true);
    setError("");
    try {
      const url = forceRefresh ? "/api/wialon/usuarios/?refresh=1" : "/api/wialon/usuarios/";
      const res = await fetchApi(url, { method: "GET", cache: "no-store" as RequestCache });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        // En un refresco silencioso se conserva lo que ya se ve.
        if (silent) return false;
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
      // El servidor respondió con datos vencidos y los está refrescando: volver
      // a pedir en unos segundos, en silencio (máximo dos veces seguidas).
      // El servidor respondió con lo que tenía y está refrescando Wialon aparte
      // (vencido o «Actualizar»): volver a pedir en silencio hasta que llegue
      // lo nuevo (máximo 8 intentos, cada 6 s).
      lastStaleRef.current = data?.stale === true;
      if (data?.stale === true && staleRetryRef.current < 8) {
        staleRetryRef.current += 1;
        setEsperandoWialon(true);
        window.setTimeout(() => void loadUsersRef.current(false, true), 6000);
      } else {
        staleRetryRef.current = 0;
        setEsperandoWialon(false);
      }
      return true;
    } catch {
      if (silent) return false;
      setRows([]);
      setUnitSearchIndex([]);
      setError("No se pudo conectar con el servidor.");
      return false;
    } finally {
      setLoading(false);
      setRefreshing(false);
      setSyncing(false);
      setUnitIndexLoading(false);
    }
  };
  const loadUsersRef = useRef(loadUsers);
  loadUsersRef.current = loadUsers;

  // Al entrar: pinta al instante la última lista de esta sesión (si hay) y
  // refresca en segundo plano; sin caché, carga normal con esqueleto.
  useEffect(() => {
    if (authLoading || !isAuthenticated || !canView) return;
    const snap = leerSnapshot(snapshotKey);
    if (snap && snap.users.length > 0) {
      setRows(snap.users);
      setUnitSearchIndex(snap.units);
      setLoading(false);
      setUnitIndexLoading(false);
      void loadUsersRef.current(false, true);
      return;
    }
    void loadUsersRef.current();
  }, [authLoading, isAuthenticated, canView, snapshotKey]);

  // La lista de cuentas ya trae el índice de unidades; solo se pide aparte si
  // faltara (sin forzar a Wialon: eso invalidaba todas las cachés, ~13 s).
  useEffect(() => {
    if (authLoading || !isAuthenticated || !canView) return;
    if (activeView !== "unidades" || unitSearchIndex.length > 0 || loading) return;
    void loadUnitSearchIndex(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, authLoading, isAuthenticated, canView, loading]);

  // Guarda lo último que se ve (incluye ediciones hechas desde el modal).
  useEffect(() => {
    if (loading || rows.length === 0) return;
    guardarSnapshot(snapshotKey, rows, unitSearchIndex);
  }, [rows, unitSearchIndex, loading, snapshotKey]);

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

  // Cuentas que coinciden con la búsqueda (por datos de la cuenta o por sus unidades).
  const { buscadas, matchedUnitsByUser } = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return { buscadas: rows, matchedUnitsByUser: new Map<number, string[]>() };

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

    const buscadas = rows.filter((r) => {
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

    return { buscadas, matchedUnitsByUser };
  }, [rows, search, unitSearchIndex]);

  // Filtros del botón y secciones: Bloqueadas → Sin unidades → Con unidades.
  const filteredRows = useMemo(() => buscadas.filter((r) => pasaFiltros(r, filtros)), [buscadas, filtros]);
  const secciones = useMemo(() => agruparCuentas(filteredRows), [filteredRows]);
  const seccionesUnidades = useMemo(() => agruparUnidades(filteredUnits), [filteredUnits]);

  // Franja de resumen del encabezado (todas las secciones, aunque estén en cero).
  const resumen = useMemo<CaaResumenItem[]>(() => {
    if (activeView === "unidades") {
      const n = (k: string) => seccionesUnidades.find((x) => x.key === k)?.rows.length ?? 0;
      return [
        { key: "inactivas", label: "Inactivas", count: n("inactivas"), tone: UNIDAD_SECCION_TONE.inactivas },
        { key: "sin_cuenta", label: "Sin cuenta", count: n("sin_cuenta"), tone: UNIDAD_SECCION_TONE.sin_cuenta },
        { key: "activas", label: "Activas", count: n("activas"), tone: UNIDAD_SECCION_TONE.activas },
      ];
    }
    const n = (k: string) => secciones.find((x) => x.key === k)?.rows.length ?? 0;
    return [
      { key: "bloqueadas", label: "Bloqueadas", count: n("bloqueadas"), tone: SECCION_TONE.bloqueadas },
      { key: "sin_unidades", label: "Sin unidades", count: n("sin_unidades"), tone: SECCION_TONE.sin_unidades },
      { key: "con_unidades", label: "Con unidades", count: n("con_unidades"), tone: SECCION_TONE.con_unidades },
    ];
  }, [activeView, secciones, seccionesUnidades]);
  const nFiltros = filtrosActivos(filtros);

  // Conteos del panel de filtros (sobre lo que coincide con la búsqueda).
  const conteosFiltro = useMemo<CaaFiltroConteos>(() => {
    let bloqueadas = 0;
    let sin = 0;
    let distribuidores = 0;
    for (const r of buscadas) {
      if (esBloqueada(r)) bloqueadas += 1;
      if (unidadesDe(r) === 0) sin += 1;
      if (r.dealer_rights === "Sí") distribuidores += 1;
    }
    const total = buscadas.length;
    return {
      estado: { todas: total, activas: total - bloqueadas, bloqueadas },
      unidades: { todas: total, con: total - sin, sin },
      distribuidores,
    };
  }, [buscadas]);

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
    staleRetryRef.current = 0;
    const ok = await loadUsers(true);
    if (!ok) return;
    if (lastStaleRef.current) {
      showAlert("info", "Actualizando", "Se están trayendo los datos de Wialon; la lista se actualizará sola en unos segundos.");
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
          <span className={cn(caaBreadcrumbCurrentClass, "hidden sm:inline")}>Ventas</span>
          <span className={cn(caaBreadcrumbSepClass, "hidden sm:inline")} aria-hidden>/</span>
          <span className={cn(caaBreadcrumbCurrentClass, "hidden md:inline")}>Suscripción</span>
          <span className={cn(caaBreadcrumbSepClass, "hidden md:inline")} aria-hidden>/</span>
          <span className={caaBreadcrumbCurrentClass}>Cuentas Antarix GPS</span>
        </nav>

        <header className={caaHeroBandClass}>
          <div className={caaHeroBlurClass} aria-hidden />
          <div className="relative flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
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
                <p className={cn(caaHeroBodyClass, "hidden sm:block")}>
                  Usuarios disponibles en tu cuenta{" "}
                  <span className={caaHeroLinkClass}>Wialon Hosting</span>. Los datos se obtienen en
                  tiempo real con el token configurado en el servidor.
                </p>
                <p className={cn(caaHeroBodyClass, "sm:hidden")}>
                  Usuarios y unidades de <span className={caaHeroLinkClass}>Wialon Hosting</span>.
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

        {/* Search + filtros + actualizar */}
        <div className="flex flex-col gap-2.5 sm:gap-3">
          <div className="relative w-full min-w-0">
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
                  ? "Buscar unidad, IMEI, teléfono…"
                  : "Buscar cuenta, unidad, IMEI…"
              }
              className={erpSearchInputClass}
              aria-label={
                activeView === "unidades"
                  ? "Buscar unidades Wialon"
                  : "Buscar usuarios o unidades Wialon"
              }
            />
          </div>
          <div
            className={cn(
              "grid gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3",
              activeView === "cuentas" ? "grid-cols-2" : "grid-cols-1",
            )}
          >
            {activeView === "cuentas" ? (
              <CuentasAntarixFiltersPopover filtros={filtros} onChange={setFiltros} conteos={conteosFiltro} />
            ) : null}
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={loading || refreshing}
              aria-busy={loading || refreshing}
              aria-label="Actualizar datos desde Wialon"
              className={cn(erpPrimaryBtnClass, "w-full shrink-0 sm:ml-auto sm:w-auto")}
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
              <span className="truncate">{loading || refreshing ? "Actualizando…" : "Actualizar"}</span>
            </button>
          </div>
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
          <CuentasAntarixDirectoryHeader
            view={activeView}
            onViewChange={setActiveView}
            totales={{ cuentas: rows.length, unidades: unitSearchIndex.length }}
            mostrando={activeView === "unidades" ? filteredUnits.length : filteredRows.length}
            total={activeView === "unidades" ? unitSearchIndex.length : rows.length}
            resumen={resumen}
            cargando={activeView === "unidades" ? unitIndexLoading && unitSearchIndex.length === 0 : loading}
            syncing={syncing || esperandoWialon}
          />

          {/* Cuentas panel */}
          {activeView === "cuentas" ? (
            loading ? (
              <p className={cn("py-12 text-center", uiValueMuted)}>Cargando usuarios…</p>
            ) : error ? (
              <div className="rounded-4xl border border-[#F6CFCF] bg-[#FEF2F2] px-6 py-10 text-center dark:border-[#7F1D1D] dark:bg-[#3F1518]">
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
              <div className={cn(caaEmptyPanelClass, "cot-fade")}>
                <p className={uiCardTitle}>Sin resultados</p>
                <p className={cn("mt-1", uiCaption)}>
                  {nFiltros > 0
                    ? "Ninguna cuenta coincide con los filtros elegidos."
                    : "No hay cuentas ni unidades que coincidan con la búsqueda."}
                </p>
                {nFiltros > 0 ? (
                  <button
                    type="button"
                    onClick={() => setFiltros(CAA_FILTROS_DEFAULT)}
                    className="cot-press mt-4 inline-flex h-9 items-center rounded-[10px] border border-[#E7E7EA] bg-white px-4 text-[13px] font-semibold text-[#09090B] hover:border-[#D3D3D8] dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC]"
                  >
                    Restablecer filtros
                  </button>
                ) : null}
              </div>
            ) : (
              <>
                {/* Tarjetas — celular / tablet / laptops angostas */}
                <div className="xl:hidden">
                  <CuentasAntarixUsersMobileList
                    secciones={secciones}
                    canEdit={canEdit}
                    search={search}
                    matchedUnitsByUser={search.trim() ? matchedUnitsByUser : undefined}
                    onEdit={openEditUser}
                  />
                </div>
                {/* Tabla — pantallas anchas */}
                <div className="hidden min-w-0 overflow-x-auto touch-pan-x xl:block">
                  <CuentasAntarixUsersTable
                    secciones={secciones}
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
              {/* Tarjetas — celular / tablet / laptops angostas */}
              <div className="space-y-3 xl:hidden">
                <CuentasAntarixUnitsMobileList
                  secciones={seccionesUnidades}
                  canEdit={canEdit}
                  onOpen={openUnitEntry}
                />
              </div>
              {/* Tabla — pantallas anchas */}
              <div className="hidden min-w-0 overflow-x-auto touch-pan-x xl:block">
                <CuentasAntarixUnitsTable
                  secciones={seccionesUnidades}
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
