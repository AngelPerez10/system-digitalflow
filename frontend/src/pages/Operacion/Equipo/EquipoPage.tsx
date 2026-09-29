/**
 * Equipo (solo administradores): tablero semanal de despacho.
 *
 * - Muestra solo los trabajos de la semana elegida (lunes → domingo),
 *   divididos por técnico; «Sin asignar» arriba.
 * - Arrastrar una orden o un proyecto a otra celda la cambia de técnico y/o
 *   de día: se ve al instante, se guarda en segundo plano, se puede deshacer
 *   y queda en el Historial (compartido entre administradores).
 * - En pantallas angostas cada técnico es una tarjeta y se reasigna con
 *   «Mover a…».
 *
 * Organización del módulo:
 * - `components/`       encabezado, filtros, historial, aviso de deshacer.
 * - `components/board/` tablero (escritorio y angosto) y tarjetas.
 * - `hooks/`            datos de la semana, reasignar, arrastre, historial.
 * - `shared/`           lógica pura, API y tokens (con sus pruebas).
 */
import { useCallback, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { CalendarX2, SearchX } from "lucide-react";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import "@/components/ui/modal-kit/motion.css";
import "./equipo.css";
import {
  erpBreadcrumbLinkClass,
  erpBreadcrumbNavClass,
  erpPageInnerClass,
  erpSansStyle,
} from "../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import { OrdenPdfLoadingModal } from "../OrdenesTrabajo/OrdenServicio/list/OrdenPdfLoadingModal";
import { handleOrdenPdfClick } from "../OrdenesTrabajo/OrdenServicio/shared/useOrdenesShared";
import { useOrdenesPagePermissions } from "../OrdenesTrabajo/OrdenServicio/useOrdenesPagePermissions";
import { useProyectosPagePermissions } from "../Proyectos/useProyectosPagePermissions";
import { EquipoBoard } from "./components/board/EquipoBoard";
import { EquipoBoardSkeleton } from "./components/board/EquipoBoardSkeleton";
import { EquipoBoardStack } from "./components/board/EquipoBoardStack";
import type { EquipoJobHandlers } from "./components/board/EquipoJobCard";
import { EquipoFilterBar } from "./components/EquipoFilterBar";
import { EquipoHero, WeekSwitcher } from "./components/EquipoHero";
import { EquipoHistorialDrawer } from "./components/EquipoHistorialDrawer";
import { EquipoStats } from "./components/EquipoStats";
import { EquipoUndoToast } from "./components/EquipoUndoToast";
import { useEquipoDragMonitor } from "./hooks/useEquipoDragMonitor";
import { useEquipoHistorial } from "./hooks/useEquipoHistorial";
import { useEquipoReasignar } from "./hooks/useEquipoReasignar";
import { useEquipoSemanaData } from "./hooks/useEquipoSemanaData";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { EQUIPO_FILTROS_DEFAULT, filtrarSeccionesEquipo, type EquipoFiltros } from "./shared/equipoFiltros";
import { addDays, lunesDe, resumenSemana, toYmd } from "./shared/equipoSemana";

type PageAlert = { show: boolean; variant: "success" | "warning" | "error" | "info"; title: string; message: string };

/** En el tablero semanal también interesa lo ya cerrado (se ve atenuado). */
const FILTROS_INICIALES: EquipoFiltros = { ...EQUIPO_FILTROS_DEFAULT, estado: "todos" };

/** Igual que `erpPageCanvasClass` pero con `overflow-x-clip`: no rompe la fila de días fija. */
const PAGE_CANVAS = "min-h-[calc(100dvh-5rem)] overflow-x-clip";

function EmptyState({ icon, title, hint }: { icon: "search" | "week"; title: string; hint: string }) {
  return (
    <div className="cot-fade flex flex-col items-center gap-2 rounded-[18px] border border-dashed border-[#D4D4D8] bg-white px-6 py-16 text-center dark:border-[#273244] dark:bg-[#111827]">
      <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-[#F4F4F5] text-[#A1A1AA] dark:bg-white/[0.06] dark:text-[#64748B]">
        {icon === "search" ? <SearchX className="size-5" aria-hidden /> : <CalendarX2 className="size-5" aria-hidden />}
      </span>
      <p className="text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{title}</p>
      <p className="max-w-sm text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">{hint}</p>
    </div>
  );
}

export default function EquipoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { canOrdenesEdit } = useOrdenesPagePermissions();
  const { canProyectosEdit } = useProyectosPagePermissions();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const hoy = useMemo(() => toYmd(new Date()), []);
  const lunesActual = lunesDe(hoy);
  const [lunes, setLunes] = useState<string>(lunesActual);
  // Dirección del último cambio de semana (para que el tablero entre desde ese lado).
  const [direccion, setDireccion] = useState<"next" | "prev" | null>(null);
  const [filtros, setFiltros] = useState<EquipoFiltros>(FILTROS_INICIALES);
  const [ocultarSinTrabajo, setOcultarSinTrabajo] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [alert, setAlert] = useState<PageAlert>({ show: false, variant: "warning", title: "", message: "" });

  const showAlert = useCallback((variant: PageAlert["variant"], title: string, message: string, ms = 4500) => {
    setAlert({ show: true, variant, title, message });
    window.setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), ms);
  }, []);
  const showError = useCallback((title: string, message: string) => showAlert("error", title, message), [showAlert]);

  /* ---------------- Estado del tablero ---------------- */

  const data = useEquipoSemanaData(lunes, showError);
  const { secciones, destinos, loading } = data;
  const historial = useEquipoHistorial();
  const { mover, deshacer, undo, descartarUndo, justMovedKey } = useEquipoReasignar({
    data,
    onError: showError,
    onHistorial: historial.prepend,
  });
  const drag = useEquipoDragMonitor(secciones, (req) => void mover(req));

  /* ---------------- Derivados ---------------- */

  const resumen = useMemo(() => resumenSemana(secciones, lunes), [secciones, lunes]);
  const visibles = useMemo(() => filtrarSeccionesEquipo(secciones, filtros), [secciones, filtros]);
  const resumenVisible = useMemo(() => resumenSemana(visibles, lunes), [visibles, lunes]);
  const counts = useMemo(() => {
    const r = resumenSemana(filtrarSeccionesEquipo(secciones, { ...filtros, tipo: "todo" }), lunes);
    return { todo: r.trabajos, ordenes: r.ordenes, proyectos: r.proyectos };
  }, [secciones, filtros, lunes]);

  // Filas: con búsqueda u «ocultar sin trabajo» se esconden las vacías, salvo
  // mientras se arrastra (todas son destino posible).
  const filas = useMemo(() => {
    const ocultar = (ocultarSinTrabajo || filtros.q.trim() !== "") && !drag.dragging;
    return ocultar ? visibles.filter((s) => s.ordenes.length + s.proyectos.length > 0) : visibles;
  }, [visibles, ocultarSinTrabajo, filtros.q, drag.dragging]);

  /* ---------------- Acciones ---------------- */

  const handlers = useMemo<EquipoJobHandlers>(
    () => ({
      onMove: (req) => void mover(req),
      onEditOrden: canOrdenesEdit ? (orden) => navigate(`/ordenes?abrir=${orden.id}`) : undefined,
      onPdfOrden: (orden) =>
        handleOrdenPdfClick(orden, navigate, location.pathname, {
          onDownloading: (pdfId) => setPdfDownloading(pdfId != null),
          onError: (message) => showAlert("error", "PDF", message),
        }),
      onEditProyecto: canProyectosEdit ? (row) => navigate(`/proyectos?abrir=${row.id}`) : undefined,
      onPdfProyecto: (row) => navigate(`/proyectos/${row.id}/pdf`, { state: { from: "/equipo" } }),
    }),
    [mover, canOrdenesEdit, canProyectosEdit, navigate, location.pathname, showAlert]
  );

  const shiftWeek = (delta: number) => {
    setDireccion(delta > 0 ? "next" : "prev");
    setLunes((prev) => addDays(prev, delta * 7));
  };
  const irAHoy = () => {
    setDireccion(lunesActual > lunes ? "next" : "prev");
    setLunes(lunesActual);
  };

  const boardProps = {
    secciones: filas,
    porDia: resumenVisible.porDia,
    lunes,
    hoy,
    draggingItemKey: drag.draggingItemKey,
    dragFromKey: drag.dragFromKey,
    overKey: drag.overKey,
    onOverChange: drag.onOverChange,
    justMovedKey,
    destinos,
    handlers,
  };

  // Esqueleto en la primera carga y cuando la semana nueva aún no tiene datos
  // (evita un «Semana sin trabajos» momentáneo al cambiar de mes).
  const primeraCarga = loading && ((data.ordenes.length === 0 && data.proyectos.length === 0) || resumen.trabajos === 0);
  const filtrando = filtros.q.trim() !== "" || filtros.tipo !== "todo" || filtros.estado !== "todos";

  let contenido;
  if (primeraCarga) contenido = <EquipoBoardSkeleton desktop={isDesktop} />;
  else if (filas.length === 0 || (filtrando && resumenVisible.trabajos === 0))
    contenido = filtrando ? (
      <EmptyState icon="search" title="Sin coincidencias" hint="Ningún trabajo de esta semana coincide con la búsqueda o los filtros." />
    ) : (
      <EmptyState icon="week" title="Semana sin trabajos" hint="No hay órdenes ni proyectos programados de lunes a domingo." />
    );
  else contenido = isDesktop ? <EquipoBoard {...boardProps} /> : <EquipoBoardStack {...boardProps} />;

  return (
    <MotionConfig reducedMotion="user">
      <div className={PAGE_CANVAS} style={erpSansStyle}>
        <div className={erpPageInnerClass}>
          <PageMeta title="Equipo | Sistema Grupo Intrax GPS" description="Tablero semanal de trabajos por técnico." />

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

          <EquipoHero
            lunes={lunes}
            esSemanaActual={lunes === lunesActual}
            onShiftWeek={shiftWeek}
            onToday={irAHoy}
            tecnicosConTrabajo={resumen.tecnicosConTrabajo}
          />

          {/* En celular la banda no se muestra: título y semana aquí. */}
          <div className="flex flex-col gap-3 sm:hidden">
            <h1 className="text-[24px] font-bold tracking-[-0.8px] text-[#09090B] dark:text-[#F8FAFC]">Equipo</h1>
            <WeekSwitcher lunes={lunes} esSemanaActual={lunes === lunesActual} onShiftWeek={shiftWeek} onToday={irAHoy} tone="light" />
          </div>

          <EquipoStats stats={{ ordenes: resumen.ordenes, proyectos: resumen.proyectos, abiertos: resumen.abiertos, sinAsignar: resumen.sinAsignar }} />

          <EquipoFilterBar
            defaults={FILTROS_INICIALES}
            historialHoy={historial.hoy}
            onOpenHistorial={historial.abrir}
            filtros={filtros}
            onChange={setFiltros}
            counts={counts}
            ocultarSinTrabajo={ocultarSinTrabajo}
            onOcultarSinTrabajo={setOcultarSinTrabajo}
          />

          {/* Se re-monta al cambiar de semana: entrada breve con opacidad/transform. */}
          <div
            key={lunes}
            className={`${direccion === "next" ? "eq-slide-next" : direccion === "prev" ? "eq-slide-prev" : "cot-fade"} transition-opacity duration-200 ${
              loading && !primeraCarga ? "opacity-60" : ""
            }`}
            aria-busy={loading || undefined}
          >
            {contenido}
          </div>

          {/* Pie: leyenda y ayuda de uso. */}
          <div className="hidden flex-wrap items-center justify-between gap-3 px-1 text-[12px] text-[#71717A] dark:text-[#8EA0B8] lg:flex">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-[3px] rounded-full bg-[#1B5CFF] dark:bg-[#4B7CFF]" aria-hidden />
                Orden de trabajo
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-[3px] rounded-full bg-[#D08A1E] dark:bg-[#E6A23C]" aria-hidden />
                Proyecto
              </span>
            </div>
            <p className="text-[#A1A1AA] dark:text-[#64748B]">
              Arrastra una tarjeta a otra celda para cambiarla de técnico o de día · sobre el nombre del técnico cambia solo el técnico
            </p>
          </div>

          {undo ? (
            <EquipoUndoToast key={undo.token} token={undo.token} message={undo.message} onUndo={() => void deshacer()} onClose={descartarUndo} />
          ) : null}

          <EquipoHistorialDrawer
            open={historial.open}
            onClose={historial.cerrar}
            entries={historial.entries}
            loading={historial.loading}
            error={historial.error}
            onRefresh={() => void historial.cargar()}
            onOpenItem={(tipo, id) => navigate(tipo === "orden" ? `/ordenes?abrir=${id}` : `/proyectos?abrir=${id}`)}
          />
        </div>
      </div>
    </MotionConfig>
  );
}
