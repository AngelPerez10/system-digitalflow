/**
 * Tablero Equipo (solo administradores): órdenes de trabajo y proyectos del
 * mes por técnico, con diseño de consola de despacho.
 *
 * - Izquierda: riel de técnicos (fijo al hacer scroll). Clic = ver su
 *   listado; es también la zona donde se sueltan las filas arrastradas.
 * - Derecha: listado de trabajo con buscador y filtros.
 * - Reasignar (arrastrar o «Mover a…») es optimista: se ve al instante, se
 *   guarda en segundo plano, se puede deshacer y queda en el Historial.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MotionConfig, motion } from "motion/react";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { History, Inbox, Layers, UserRound } from "lucide-react";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { fetchApi } from "@/config/api";
import "@/components/ui/modal-kit/motion.css";
import {
  erpBreadcrumbLinkClass,
  erpBreadcrumbNavClass,
  erpPageCanvasClass,
  erpPageInnerClass,
  erpSansStyle,
} from "../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import { OrdenPdfLoadingModal } from "../OrdenesTrabajo/OrdenServicio/list/OrdenPdfLoadingModal";
import { fetchOrdenesMes } from "../OrdenesTrabajo/OrdenServicio/shared/ordenesFetch";
import {
  displayOrdenFolio,
  fetchTodosLosUsuariosApi,
  fetchUsuariosApi,
  handleOrdenPdfClick,
} from "../OrdenesTrabajo/OrdenServicio/shared/useOrdenesShared";
import { getCurrentYearMonth, type Orden, type Usuario } from "../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import { useOrdenesPagePermissions } from "../OrdenesTrabajo/OrdenServicio/useOrdenesPagePermissions";
import { MonthSwitcher } from "../Proyectos/list/ProyectosHero";
import { listProyectos, reasignarEquipoProyecto, type ProyectoApiError } from "../Proyectos/shared/proyectoApi";
import { displayProyectoFolio } from "../Proyectos/shared/proyectoFormUtils";
import { proyectoRowFecha, shiftYearMonth } from "../Proyectos/shared/proyectoListUtils";
import { focusRing } from "../Proyectos/shared/proyectoTokens";
import type { ProyectoRow } from "../Proyectos/shared/proyectoTypes";
import { useProyectosPagePermissions } from "../Proyectos/useProyectosPagePermissions";
import {
  RAIL_TODOS,
  columnKey,
  isEquipoDragData,
  itemKey,
  type EquipoDestino,
  type EquipoItemKind,
  type EquipoMoveRequest,
} from "./equipoDnd";
import { EQUIPO_FILTROS_DEFAULT, filtrarSeccionesEquipo, type EquipoFiltros } from "./equipoFiltros";
import {
  aplicarEquipoProyecto,
  buildEquipoSecciones,
  equipoActualProyecto,
  moverEquipoProyecto,
  ordenAbierta,
  ordenTecnicoId,
  proyectoActivo,
  type EquipoProyectoAsignacion,
  type EquipoSeccion,
  type EquipoTecnicoId,
} from "./equipoGrouping";
import { listEquipoHistorial, registrarEquipoHistorial, type EquipoHistorialEntry } from "./equipoHistorialApi";
import { EquipoHero } from "./EquipoHero";
import { EquipoHistorialDrawer } from "./EquipoHistorialDrawer";
import { EquipoRail } from "./EquipoRail";
import { EquipoStats } from "./EquipoStats";
import { EquipoToolbar } from "./EquipoToolbar";
import { EquipoAvatar } from "./EquipoUi";
import { EquipoUndoToast } from "./EquipoUndoToast";
import { EquipoWorkList, type EquipoRowHandlers } from "./EquipoWorkList";

type PageAlert = { show: boolean; variant: "success" | "warning" | "error" | "info"; title: string; message: string };

type UndoState = {
  token: number;
  message: string;
  kind: EquipoItemKind;
  id: string;
  fromId: EquipoTecnicoId;
  toId: EquipoTecnicoId;
  /** Fila antes del cambio (para restaurar y re-guardar). */
  prevOrden?: Orden;
  prevProyecto?: ProyectoRow;
};

type DragState = { kind: EquipoItemKind; id: string; fromKey: string } | null;

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err) {
    const m = String((err as ProyectoApiError).message || "").trim();
    if (m) return m;
  }
  return fallback;
}

async function patchOrdenTecnico(id: number, tecnicoId: number | null): Promise<Partial<Orden>> {
  const res = await fetchApi(`/api/ordenes/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tecnico_asignado: tecnicoId }),
  });
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    const detail = data && typeof data.detail === "string" ? data.detail : null;
    const campo = data && Array.isArray(data.tecnico_asignado) ? String(data.tecnico_asignado[0]) : null;
    throw { message: detail || campo || "No se pudo reasignar la orden." };
  }
  return (data ?? {}) as Partial<Orden>;
}

/** Cuenta órdenes y proyectos una sola vez aunque un proyecto esté en varias secciones. */
function contarUnicos(secciones: EquipoSeccion[]) {
  const ordenes = new Set<number>();
  const proyectos = new Set<string>();
  for (const s of secciones) {
    for (const o of s.ordenes) ordenes.add(o.id);
    for (const r of s.proyectos) proyectos.add(String(r.id));
  }
  return { ordenes: ordenes.size, proyectos: proyectos.size, total: ordenes.size + proyectos.size };
}

function ListSkeleton() {
  return (
    <ul className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="flex items-center gap-3 px-5 py-3.5" style={{ opacity: 1 - i * 0.12 }}>
          <span className="size-10 shrink-0 rounded-[11px] bg-[#EDEDF0] motion-safe:animate-pulse dark:bg-[#1B2539]" />
          <span className="flex-1 space-y-2">
            <span className="block h-2.5 w-24 rounded-full bg-[#EDEDF0] motion-safe:animate-pulse dark:bg-[#1B2539]" />
            <span className="block h-3.5 w-1/2 rounded-full bg-[#EDEDF0] motion-safe:animate-pulse dark:bg-[#1B2539]" />
          </span>
          <span className="hidden h-2 w-32 rounded-full bg-[#EDEDF0] motion-safe:animate-pulse dark:bg-[#1B2539] sm:block" />
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------------------------------------------------
   Página
   -------------------------------------------------------------------------- */

export default function EquipoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { canOrdenesEdit } = useOrdenesPagePermissions();
  const { canProyectosEdit } = useProyectosPagePermissions();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roster, setRoster] = useState<Usuario[]>([]);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [proyectos, setProyectos] = useState<ProyectoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentYearMonth());
  const [selectedKey, setSelectedKey] = useState<string>(RAIL_TODOS);
  const [filtros, setFiltros] = useState<EquipoFiltros>(EQUIPO_FILTROS_DEFAULT);
  const [ocultarSinCarga, setOcultarSinCarga] = useState(false);
  const [alert, setAlert] = useState<PageAlert>({ show: false, variant: "warning", title: "", message: "" });
  const [justMovedKey, setJustMovedKey] = useState<string | null>(null);
  const [undo, setUndo] = useState<UndoState | null>(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [drag, setDrag] = useState<DragState>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [historial, setHistorial] = useState<EquipoHistorialEntry[]>([]);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [historialError, setHistorialError] = useState("");

  const showAlert = useCallback((variant: PageAlert["variant"], title: string, message: string, ms = 4500) => {
    setAlert({ show: true, variant, title, message });
    window.setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), ms);
  }, []);

  /* ---------------- Carga ---------------- */

  // Catálogos (una vez): usuarios para nombres/avatares, técnicos para el riel.
  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchTodosLosUsuariosApi(), fetchUsuariosApi()]).then(([todos, tecnicos]) => {
      if (cancelled) return;
      setUsuarios(todos);
      setRoster(tecnicos);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Proyectos: el API devuelve todos; el mes se filtra en el cliente.
  useEffect(() => {
    let cancelled = false;
    listProyectos()
      .then((rows) => {
        if (!cancelled) setProyectos(rows);
      })
      .catch((err) => {
        if (!cancelled) showAlert("error", "Proyectos", apiErrorMessage(err, "No se pudieron cargar los proyectos."));
      });
    return () => {
      cancelled = true;
    };
  }, [showAlert]);

  // Órdenes del mes (con arrastre de abiertas en el mes actual, como en Órdenes).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchOrdenesMes(selectedMonth, { arrastreAbiertas: selectedMonth === getCurrentYearMonth() })
      .then((rows) => {
        if (!cancelled) setOrdenes(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setOrdenes([]);
          showAlert("error", "Órdenes", "No se pudieron cargar las órdenes del mes.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMonth, showAlert]);

  const cargarHistorial = useCallback(async () => {
    setHistorialLoading(true);
    setHistorialError("");
    try {
      setHistorial(await listEquipoHistorial(100));
    } catch (err) {
      setHistorialError(err instanceof Error ? err.message : "No se pudo cargar el historial.");
    } finally {
      setHistorialLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargarHistorial();
  }, [cargarHistorial]);

  /* ---------------- Derivados ---------------- */

  /** Proyectos del mes; en el mes actual también los activos de meses anteriores (arrastre). */
  const proyectosDelMes = useMemo(() => {
    const actual = selectedMonth === getCurrentYearMonth();
    return proyectos.filter((row) => {
      const fecha = proyectoRowFecha(row);
      if (fecha.startsWith(selectedMonth)) return true;
      return actual && proyectoActivo(row) && fecha.slice(0, 7) < selectedMonth;
    });
  }, [proyectos, selectedMonth]);

  const secciones = useMemo(
    () => buildEquipoSecciones(ordenes, proyectosDelMes, usuarios, roster),
    [ordenes, proyectosDelMes, usuarios, roster]
  );

  const destinos = useMemo<EquipoDestino[]>(
    () => secciones.map((s) => ({ key: columnKey(s.tecnico.id), id: s.tecnico.id, nombre: s.tecnico.nombre })),
    [secciones]
  );

  const stats = useMemo(() => {
    const sin = secciones[0];
    return {
      ordenes: ordenes.length,
      proyectos: proyectosDelMes.length,
      abiertos: ordenes.filter(ordenAbierta).length + proyectosDelMes.filter(proyectoActivo).length,
      sinAsignar: sin ? sin.pendientes : 0,
    };
  }, [ordenes, proyectosDelMes, secciones]);

  const tecnicosConCarga = useMemo(
    () => secciones.filter((s) => s.tecnico.id != null && s.pendientes > 0).length,
    [secciones]
  );

  const seleccion = useMemo(
    () => (selectedKey === RAIL_TODOS ? secciones : secciones.filter((s) => columnKey(s.tecnico.id) === selectedKey)),
    [secciones, selectedKey]
  );
  const seccionElegida = selectedKey === RAIL_TODOS ? null : seleccion[0] ?? null;

  const visibles = useMemo(() => filtrarSeccionesEquipo(seleccion, filtros), [seleccion, filtros]);

  const counts = useMemo(() => {
    const porTipo = contarUnicos(filtrarSeccionesEquipo(seleccion, { ...filtros, tipo: "todo" }));
    const abiertos = contarUnicos(filtrarSeccionesEquipo(seleccion, { ...filtros, estado: "abiertos" })).total;
    const todos = contarUnicos(filtrarSeccionesEquipo(seleccion, { ...filtros, estado: "todos" })).total;
    return { ordenes: porTipo.ordenes, proyectos: porTipo.proyectos, abiertos, todos };
  }, [seleccion, filtros]);

  const mostrando = useMemo(() => contarUnicos(visibles).total, [visibles]);
  const totalSeleccion = useMemo(() => contarUnicos(seleccion).total, [seleccion]);

  const historialHoy = useMemo(() => {
    const hoy = new Date().toDateString();
    return historial.filter((h) => new Date(h.creado_at).toDateString() === hoy).length;
  }, [historial]);

  /* ---------------- Reasignar (optimista + deshacer + historial) ---------------- */

  const usuariosRef = useRef<Map<number, Usuario>>(new Map());
  // Por id, prefiere la entrada con foto (el catálogo general puede venir sin ella).
  usuariosRef.current = new Map();
  for (const u of [...usuarios, ...roster]) {
    const prev = usuariosRef.current.get(u.id);
    if (!prev || (!prev.avatar_url && u.avatar_url)) usuariosRef.current.set(u.id, u);
  }
  const ordenesRef = useRef(ordenes);
  ordenesRef.current = ordenes;
  const proyectosRef = useRef(proyectos);
  proyectosRef.current = proyectos;
  const destinosRef = useRef(destinos);
  destinosRef.current = destinos;
  const nombreDe = useCallback((id: EquipoTecnicoId) => {
    if (id == null) return "Sin asignar";
    const s = destinosRef.current.find((d) => d.id === id);
    return s?.nombre ?? `Técnico #${id}`;
  }, []);
  const undoTokenRef = useRef(0);

  const flashMoved = useCallback((kind: EquipoItemKind, id: string, toId: EquipoTecnicoId) => {
    const k = itemKey(kind, id, columnKey(toId));
    setJustMovedKey(k);
    window.setTimeout(() => setJustMovedKey((prev) => (prev === k ? null : prev)), 1600);
  }, []);

  const registrar = useCallback(
    (entry: {
      kind: EquipoItemKind;
      id: string;
      folio: string;
      cliente: string;
      accion: "reasignar" | "deshacer";
      fromId: EquipoTecnicoId;
      toId: EquipoTecnicoId;
    }) => {
      void registrarEquipoHistorial({
        tipo: entry.kind,
        objeto_id: Number(entry.id),
        folio: entry.folio,
        cliente: entry.cliente,
        accion: entry.accion,
        desde_id: entry.fromId,
        desde_nombre: nombreDe(entry.fromId),
        hacia_id: entry.toId,
        hacia_nombre: nombreDe(entry.toId),
      })
        .then((saved) => setHistorial((list) => [saved, ...list]))
        .catch(() => {
          /* El cambio ya se guardó; el historial es best-effort. */
        });
    },
    [nombreDe]
  );

  const guardarOrden = useCallback(
    async (prev: Orden, toId: EquipoTecnicoId) => {
      const avatar = toId != null ? usuariosRef.current.get(toId)?.avatar_url ?? "" : "";
      setOrdenes((list) =>
        list.map((o) =>
          o.id === prev.id
            ? {
                ...o,
                tecnico_asignado: toId,
                tecnico_asignado_full_name: toId != null ? nombreDe(toId) : "",
                tecnico_asignado_avatar_url: avatar,
                en_pool: toId != null ? false : o.en_pool,
              }
            : o
        )
      );
      try {
        const saved = await patchOrdenTecnico(prev.id, toId);
        setOrdenes((list) => list.map((o) => (o.id === prev.id ? { ...o, ...saved } : o)));
        return true;
      } catch (err) {
        setOrdenes((list) => list.map((o) => (o.id === prev.id ? prev : o)));
        showAlert("error", "No se pudo reasignar", apiErrorMessage(err, "Ocurrió un error al reasignar la orden."));
        return false;
      }
    },
    [nombreDe, showAlert]
  );

  const guardarProyecto = useCallback(
    async (prev: ProyectoRow, equipo: EquipoProyectoAsignacion) => {
      const avatarDe = (id: number) => usuariosRef.current.get(id)?.avatar_url ?? "";
      setProyectos((list) => list.map((r) => (r.id === prev.id ? aplicarEquipoProyecto(r, equipo, avatarDe) : r)));
      try {
        const saved = await reasignarEquipoProyecto(prev.id, equipo);
        setProyectos((list) => list.map((r) => (r.id === saved.id ? saved : r)));
        return true;
      } catch (err) {
        setProyectos((list) => list.map((r) => (r.id === prev.id ? prev : r)));
        showAlert("error", "No se pudo reasignar", apiErrorMessage(err, "Ocurrió un error al reasignar el proyecto."));
        return false;
      }
    },
    [showAlert]
  );

  const onMove = useCallback(
    async ({ kind, id, fromId, toId }: EquipoMoveRequest) => {
      if (fromId === toId) return;
      const destino = toId == null ? "«Sin asignar»" : nombreDe(toId);

      if (kind === "orden") {
        const prev = ordenesRef.current.find((o) => String(o.id) === id);
        if (!prev || ordenTecnicoId(prev) === toId) return;
        const folio = displayOrdenFolio(prev);
        flashMoved(kind, id, toId);
        const token = ++undoTokenRef.current;
        setUndo({ token, kind, id, fromId, toId, prevOrden: prev, message: `${folio} → ${destino}` });
        const ok = await guardarOrden(prev, toId);
        if (ok) registrar({ kind, id, folio, cliente: prev.cliente || "", accion: "reasignar", fromId, toId });
        else setUndo((u) => (u?.token === token ? null : u));
        return;
      }

      const prev = proyectosRef.current.find((r) => String(r.id) === id);
      if (!prev) return;
      const folio = displayProyectoFolio(prev.folio);
      const equipo = moverEquipoProyecto(prev, fromId, toId != null ? { id: toId, nombre: nombreDe(toId) } : null);
      flashMoved(kind, id, toId);
      const token = ++undoTokenRef.current;
      setUndo({ token, kind, id, fromId, toId, prevProyecto: prev, message: `${folio} → ${destino}` });
      const ok = await guardarProyecto(prev, equipo);
      if (ok) registrar({ kind, id, folio, cliente: prev.cliente || "", accion: "reasignar", fromId, toId });
      else setUndo((u) => (u?.token === token ? null : u));
    },
    [flashMoved, guardarOrden, guardarProyecto, nombreDe, registrar]
  );

  const deshacer = useCallback(async () => {
    const u = undo;
    if (!u) return;
    setUndo(null);
    if (u.kind === "orden" && u.prevOrden) {
      const actual = ordenesRef.current.find((o) => o.id === u.prevOrden!.id) ?? u.prevOrden;
      const toId = ordenTecnicoId(u.prevOrden);
      flashMoved("orden", u.id, toId);
      const ok = await guardarOrden(actual, toId);
      if (ok)
        registrar({
          kind: "orden",
          id: u.id,
          folio: displayOrdenFolio(u.prevOrden),
          cliente: u.prevOrden.cliente || "",
          accion: "deshacer",
          fromId: u.toId,
          toId: u.fromId,
        });
    } else if (u.kind === "proyecto" && u.prevProyecto) {
      const actual = proyectosRef.current.find((r) => r.id === u.prevProyecto!.id) ?? u.prevProyecto;
      flashMoved("proyecto", u.id, u.fromId);
      const ok = await guardarProyecto(actual, equipoActualProyecto(u.prevProyecto));
      if (ok)
        registrar({
          kind: "proyecto",
          id: u.id,
          folio: displayProyectoFolio(u.prevProyecto.folio),
          cliente: u.prevProyecto.cliente || "",
          accion: "deshacer",
          fromId: u.toId,
          toId: u.fromId,
        });
    }
  }, [undo, flashMoved, guardarOrden, guardarProyecto, registrar]);

  // El aviso de «Deshacer» se va solo a los 6 s.
  useEffect(() => {
    if (!undo) return;
    const t = window.setTimeout(() => setUndo((cur) => (cur?.token === undo.token ? null : cur)), 6000);
    return () => window.clearTimeout(t);
  }, [undo]);

  /* ---------------- Arrastre: filas → riel ---------------- */

  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const keyToIdRef = useRef(new Map<string, EquipoTecnicoId>());
  keyToIdRef.current = new Map(secciones.map((s) => [columnKey(s.tecnico.id), s.tecnico.id]));

  useEffect(
    () =>
      monitorForElements({
        canMonitor: ({ source }) => isEquipoDragData(source.data),
        onDragStart: ({ source }) => {
          if (isEquipoDragData(source.data)) setDrag({ kind: source.data.kind, id: source.data.id, fromKey: source.data.fromKey });
        },
        onDrop: ({ source, location: loc }) => {
          setDrag(null);
          setOverKey(null);
          if (!isEquipoDragData(source.data)) return;
          const target = loc.current.dropTargets.find((t) => t.data.kind === "equipo-columna");
          if (!target) return;
          const toKey = String(target.data.key);
          const ids = keyToIdRef.current;
          if (toKey === source.data.fromKey || !ids.has(toKey) || !ids.has(source.data.fromKey)) return;
          void onMoveRef.current({
            kind: source.data.kind,
            id: source.data.id,
            fromId: ids.get(source.data.fromKey) ?? null,
            toId: ids.get(toKey) ?? null,
          });
        },
      }),
    []
  );

  /* ---------------- Cambio de sección (que se note) ---------------- */

  const panelRef = useRef<HTMLElement | null>(null);
  const [panelFlash, setPanelFlash] = useState(false);
  const flashTimerRef = useRef<number | undefined>(undefined);

  const handleSelect = useCallback((key: string) => {
    setSelectedKey(key);
    // Resalte breve del panel para que el cambio se vea.
    setPanelFlash(true);
    window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setPanelFlash(false), 900);
    // Si el panel quedó fuera de vista (celular o scroll largo), llevarlo arriba.
    const el = panelRef.current;
    if (el) {
      const top = el.getBoundingClientRect().top;
      if (top < 72 || top > window.innerHeight * 0.55) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      }
    }
  }, []);

  useEffect(() => () => window.clearTimeout(flashTimerRef.current), []);

  const onOverChange = useCallback((key: string, over: boolean) => {
    setOverKey((prev) => (over ? key : prev === key ? null : prev));
  }, []);

  /* ---------------- Acciones de fila ---------------- */

  const handlers = useMemo<EquipoRowHandlers>(
    () => ({
      onMove: (req) => void onMove(req),
      onEditOrden: canOrdenesEdit ? (orden) => navigate(`/ordenes?abrir=${orden.id}`) : undefined,
      onPdfOrden: (orden) =>
        handleOrdenPdfClick(orden, navigate, location.pathname, {
          onDownloading: (pdfId) => setPdfDownloading(pdfId != null),
          onError: (message) => showAlert("error", "PDF", message),
        }),
      onEditProyecto: canProyectosEdit ? (row) => navigate(`/proyectos?abrir=${row.id}`) : undefined,
      onPdfProyecto: (row) => navigate(`/proyectos/${row.id}/pdf`, { state: { from: "/equipo" } }),
    }),
    [onMove, canOrdenesEdit, canProyectosEdit, navigate, location.pathname, showAlert]
  );

  const openHistorial = () => {
    setHistorialOpen(true);
    void cargarHistorial();
  };

  const shiftMonth = (delta: number) => setSelectedMonth((prev) => shiftYearMonth(prev, delta));
  const draggingItemKey = drag ? itemKey(drag.kind, drag.id, drag.fromKey) : null;

  /* ---------------- Cabecera del panel ---------------- */

  const panelTitulo = seccionElegida ? seccionElegida.tecnico.nombre : "Todo el equipo";
  const panelSub = seccionElegida
    ? seccionElegida.tecnico.id == null
      ? "Arrastra una fila a un técnico del panel de la izquierda para asignarla."
      : `${seccionElegida.pendientes} ${seccionElegida.pendientes === 1 ? "abierto" : "abiertos"} · ${seccionElegida.ordenes.length} ${
          seccionElegida.ordenes.length === 1 ? "orden" : "órdenes"
        } · ${seccionElegida.proyectos.length} ${seccionElegida.proyectos.length === 1 ? "proyecto" : "proyectos"}`
    : `${stats.abiertos} abiertos · ${tecnicosConCarga} ${tecnicosConCarga === 1 ? "técnico con carga" : "técnicos con carga"}`;

  return (
    <MotionConfig reducedMotion="user">
      <div className={erpPageCanvasClass} style={erpSansStyle}>
        <div className={erpPageInnerClass}>
          <PageMeta title="Equipo | Sistema Grupo Intrax GPS" description="Órdenes de trabajo y proyectos del mes por técnico." />

          <nav className={erpBreadcrumbNavClass} aria-label="Migas de pan">
            <Link to="/" className={erpBreadcrumbLinkClass}>
              Inicio
            </Link>
            <span className="text-[#D3D3D8] dark:text-[#273244]" aria-hidden>
              /
            </span>
            <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]" aria-current="page">
              Equipo
            </span>
          </nav>

          <OrdenPdfLoadingModal open={pdfDownloading} downloading />

          {alert.show ? <Alert variant={alert.variant} title={alert.title} message={alert.message} showLink={false} /> : null}

          <EquipoHero selectedMonth={selectedMonth} onShiftMonth={shiftMonth} tecnicosConCarga={tecnicosConCarga} />

          {/* En celular la banda no se muestra: título y mes aquí. */}
          <div className="flex flex-col gap-3 sm:hidden">
            <h1 className="text-[24px] font-bold tracking-[-0.8px] text-[#09090B] dark:text-[#F8FAFC]">Equipo</h1>
            <MonthSwitcher selectedMonth={selectedMonth} onShiftMonth={shiftMonth} tone="light" />
          </div>

          <EquipoStats stats={stats} />

          <div className="grid items-start gap-4 lg:grid-cols-[17.5rem_minmax(0,1fr)] xl:gap-5">
            <EquipoRail
              secciones={secciones}
              selectedKey={selectedKey}
              onSelect={handleSelect}
              dragging={drag != null}
              dragFromKey={drag?.fromKey ?? null}
              overKey={overKey}
              onOverChange={onOverChange}
              ocultarSinCarga={ocultarSinCarga}
            />

            <section
              ref={panelRef}
              aria-labelledby="equipo-panel-titulo"
              className={`min-w-0 scroll-mt-24 overflow-hidden rounded-[20px] border bg-white transition-[border-color,box-shadow] duration-500 ease-out motion-reduce:transition-none dark:bg-[#111827] ${
                panelFlash
                  ? "border-[#1B5CFF]/50 shadow-[0_0_0_4px_rgba(27,92,255,0.12),0_6px_20px_-12px_rgba(9,9,11,0.12)] dark:border-[#4B7CFF]/60"
                  : "border-[#E7E7EA] shadow-[0_6px_20px_-12px_rgba(9,9,11,0.12)] dark:border-[#273244]"
              }`}
            >
              <header
                className={`relative flex flex-wrap items-center gap-3 border-b border-[#EDEDF0] px-4 pb-4 pt-5 transition-colors duration-300 dark:border-[#1F2A3C] sm:px-5 ${
                  !seccionElegida
                    ? "bg-gradient-to-br from-[#EEF1FB] via-white to-white dark:from-[#17235B]/50 dark:via-[#111827] dark:to-[#111827]"
                    : seccionElegida.tecnico.id == null
                      ? "bg-gradient-to-br from-[#FFF6E6] via-white to-white dark:from-[rgba(230,162,60,0.14)] dark:via-[#111827] dark:to-[#111827]"
                      : "bg-gradient-to-br from-[#EAF0FF] via-white to-white dark:from-[#1B2A63]/55 dark:via-[#111827] dark:to-[#111827]"
                }`}
              >
                {/* Franja de color: identifica la sección de un vistazo. */}
                <motion.span
                  key={`band-${selectedKey}`}
                  className={`absolute inset-x-0 top-0 h-1 origin-left ${
                    !seccionElegida
                      ? "bg-gradient-to-r from-[#17235B] via-[#1B5CFF] to-[#7EA0FF]"
                      : seccionElegida.tecnico.id == null
                        ? "bg-gradient-to-r from-[#D08A1E] to-[#F2C27A]"
                        : "bg-gradient-to-r from-[#1B5CFF] to-[#7EA0FF]"
                  }`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
                  aria-hidden
                />
                <motion.div
                  key={`head-${selectedKey}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }}
                >
                  {seccionElegida ? (
                    <span className="rounded-full p-0.5 shadow-[0_6px_16px_-8px_rgba(27,92,255,0.6)] ring-2 ring-[#1B5CFF]/30 dark:ring-[#4B7CFF]/40">
                      <EquipoAvatar id={seccionElegida.tecnico.id} nombre={seccionElegida.tecnico.nombre} avatarUrl={seccionElegida.tecnico.avatarUrl} size="lg" />
                    </span>
                  ) : (
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[#17235B] text-white dark:bg-[#1B2A63]" aria-hidden>
                      <Layers className="size-5" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                        !seccionElegida
                          ? "text-[#17235B] dark:text-[#9BB6FF]"
                          : seccionElegida.tecnico.id == null
                            ? "text-[#8A5D0F] dark:text-[#F2C27A]"
                            : "text-[#1B5CFF] dark:text-[#7EA0FF]"
                      }`}
                    >
                      {!seccionElegida ? (
                        <Layers className="size-3" aria-hidden />
                      ) : seccionElegida.tecnico.id == null ? (
                        <Inbox className="size-3" aria-hidden />
                      ) : (
                        <UserRound className="size-3" aria-hidden />
                      )}
                      {!seccionElegida ? "Vista general" : seccionElegida.tecnico.id == null ? "Bandeja" : "Técnico"}
                    </p>
                    <h2 id="equipo-panel-titulo" className="truncate text-[19px] font-semibold tracking-[-0.4px] text-[#09090B] dark:text-[#F8FAFC]">
                      {panelTitulo}
                    </h2>
                    <p className="truncate text-[13px] text-[#71717A] dark:text-[#8EA0B8]">{panelSub}</p>
                  </div>
                </motion.div>
                <button
                  type="button"
                  onClick={openHistorial}
                  aria-haspopup="dialog"
                  className={`cot-press inline-flex h-10 shrink-0 items-center gap-2 rounded-[12px] border border-[#E4E4E7] bg-white px-3.5 text-[13px] font-semibold text-[#3F3F46] hover:border-[#D3D3D8] hover:bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#0F172A] dark:text-[#D6DEEA] dark:hover:border-[#3A4661] ${focusRing}`}
                >
                  <History className="size-4" aria-hidden />
                  Historial
                  {historialHoy > 0 ? (
                    <span
                      key={historialHoy}
                      className="cot-flash inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1B5CFF] px-1.5 text-[11px] font-semibold tabular-nums text-white dark:bg-[#4B7CFF]"
                      title={`${historialHoy} movimientos hoy`}
                    >
                      {historialHoy}
                      <span className="sr-only"> movimientos hoy</span>
                    </span>
                  ) : null}
                </button>
              </header>

              <div className="border-b border-[#F0F0F2] px-4 py-3.5 dark:border-[#1F2A3C] sm:px-5">
                <EquipoToolbar
                  filtros={filtros}
                  onChange={setFiltros}
                  counts={counts}
                  ocultarSinCarga={ocultarSinCarga}
                  onOcultarSinCarga={setOcultarSinCarga}
                />
              </div>

              <div className={`transition-opacity duration-200 ${loading && ordenes.length > 0 ? "opacity-60" : ""}`} aria-busy={loading || undefined}>
                {loading && ordenes.length === 0 ? (
                  <ListSkeleton />
                ) : (
                  <motion.div
                    key={selectedKey}
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
                  >
                    <EquipoWorkList
                      mode={selectedKey === RAIL_TODOS ? "todos" : "single"}
                      secciones={visibles}
                      draggingItemKey={draggingItemKey}
                      dragFromKey={drag?.fromKey ?? null}
                      overKey={overKey}
                      onOverChange={onOverChange}
                      justMovedKey={justMovedKey}
                      destinos={destinos}
                      handlers={handlers}
                      emptyTitle={totalSeleccion === 0 ? (seccionElegida?.tecnico.id == null && seccionElegida ? "Todo está asignado" : "Sin trabajo este mes") : "Sin coincidencias"}
                      emptyHint={
                        totalSeleccion === 0
                          ? seccionElegida?.tecnico.id != null
                            ? "Arrastra una orden o proyecto a este técnico desde otro listado."
                            : "No hay órdenes ni proyectos en el mes seleccionado."
                          : "Ajusta la búsqueda o los filtros."
                      }
                    />
                  </motion.div>
                )}
              </div>

              <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F0F0F2] px-4 py-3 text-[12px] text-[#71717A] dark:border-[#1F2A3C] dark:text-[#8EA0B8] sm:px-5">
                <p aria-live="polite">
                  Mostrando <span className="font-semibold tabular-nums text-[#09090B] dark:text-white">{mostrando}</span> de{" "}
                  <span className="tabular-nums">{totalSeleccion}</span>
                </p>
                <p className="hidden sm:block">Arrastra una fila al riel de técnicos o usa «Mover a…».</p>
              </footer>
            </section>
          </div>

          {undo ? (
            <EquipoUndoToast key={undo.token} token={undo.token} message={undo.message} onUndo={() => void deshacer()} onClose={() => setUndo(null)} />
          ) : null}

          <EquipoHistorialDrawer
            open={historialOpen}
            onClose={() => setHistorialOpen(false)}
            entries={historial}
            loading={historialLoading}
            error={historialError}
            onRefresh={() => void cargarHistorial()}
            onOpenItem={(tipo, id) => navigate(tipo === "orden" ? `/ordenes?abrir=${id}` : `/proyectos?abrir=${id}`)}
          />
        </div>
      </div>
    </MotionConfig>
  );
}
