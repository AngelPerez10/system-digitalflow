/**
 * Listado de trabajo del tablero Equipo (panel derecho).
 *
 * - Un técnico: dos bloques, «Órdenes de trabajo» y «Proyectos».
 * - «Todo el equipo»: un grupo colapsable por técnico.
 *
 * Cada fila se arrastra al riel de técnicos para reasignarla (o se usa
 * «Mover a…» en táctil/teclado). Movimiento: las filas entran y salen con
 * `opacity` + altura de la propia fila (solo la que cambia), el resaltado de
 * «recién movida» es un color de fondo que se desvanece. Todo respeta
 * `prefers-reduced-motion` vía `<MotionConfig reducedMotion="user">`.
 */
import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileText,
  FolderKanban,
  GripVertical,
  Lock,
  Package,
  Pencil,
  SearchX,
} from "lucide-react";
import { CotizacionVinculadaTrigger, type CotizacionRef } from "../shared/CotizacionVinculadaTrigger";
import type { Orden } from "../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import { getOrdenPrioridadSectionStyles, ordenPrioridadListBadge } from "../OrdenesTrabajo/OrdenServicio/shared/ordenPrioridadSections";
import { displayOrdenFolio } from "../OrdenesTrabajo/OrdenServicio/shared/useOrdenesShared";
import { formatYmdToDMY } from "../OrdenesTrabajo/OrdenServicio/shared/ordenesPageUtils";
import { displayProyectoFolio } from "../Proyectos/shared/proyectoFormUtils";
import { proyectoCotizacionesRefs, proyectoTiposLabels } from "../Proyectos/shared/proyectoListUtils";
import { EstadoPill, ProgressBar } from "../Proyectos/shared/ProyectoUi";
import { focusRing, toneForEstado } from "../Proyectos/shared/proyectoTokens";
import type { ProyectoRow } from "../Proyectos/shared/proyectoTypes";
import { columnKey, isEquipoDragData, itemKey, type EquipoDestino, type EquipoItemKind, type EquipoMoveRequest } from "./equipoDnd";
import { ordenAbierta, proyectoActivo, proyectoRolDe, type EquipoSeccion, type EquipoTecnicoId } from "./equipoGrouping";
import { ordenTone, rowActionBtn } from "./equipoTokens";
import { EquipoAvatar, MoverA, OrdenStatusPill } from "./EquipoUi";
import { useEquipoDraggable } from "./useEquipoDraggable";

export type EquipoRowHandlers = {
  onMove: (req: EquipoMoveRequest) => void;
  onEditOrden?: (orden: Orden) => void;
  onPdfOrden: (orden: Orden) => void;
  onEditProyecto?: (row: ProyectoRow) => void;
  onPdfProyecto: (row: ProyectoRow) => void;
};

const EASE = [0.22, 1, 0.36, 1] as const;

/* --------------------------------------------------------------------------
   Celdas
   -------------------------------------------------------------------------- */

function TypeTile({ kind, movable }: { kind: EquipoItemKind; movable: boolean }) {
  const orden = kind === "orden";
  return (
    <span
      className={`relative inline-flex size-10 shrink-0 items-center justify-center rounded-[11px] ${
        orden
          ? "bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63]/70 dark:text-[#9BB6FF]"
          : "bg-[#FFF4E5] text-[#B06F12] dark:bg-[rgba(230,162,60,0.14)] dark:text-[#F2C27A]"
      }`}
      aria-hidden
    >
      {orden ? <ClipboardList className="size-[18px]" /> : <FolderKanban className="size-[18px]" />}
      {!movable ? (
        <span className="absolute -bottom-1 -right-1 inline-flex size-4 items-center justify-center rounded-full bg-white ring-1 ring-[#E4E4E7] dark:bg-[#111827] dark:ring-[#273244]">
          <Lock className="size-2.5 text-[#A1A1AA]" />
        </span>
      ) : null}
    </span>
  );
}

function RowFrame({
  refEl,
  accent,
  movable,
  dragging,
  justMoved,
  ariaLabel,
  children,
}: {
  refEl: React.RefObject<HTMLElement | null>;
  accent: string;
  movable: boolean;
  dragging: boolean;
  justMoved: boolean;
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <article
      ref={refEl as React.RefObject<HTMLElement>}
      aria-label={ariaLabel}
      className={`group/row relative grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-3 pl-2 pr-4 transition-[background-color,opacity] duration-700 ease-out motion-reduce:transition-none sm:pl-3 sm:pr-5 xl:grid-cols-[auto_auto_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,10rem)_auto] ${
        dragging
          ? "opacity-40"
          : justMoved
            ? "bg-[#ECFBF3] dark:bg-[#0F2A1C]/60"
            : "hover:bg-[#FAFAFB] hover:duration-150 dark:hover:bg-white/[0.025]"
      } ${movable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <span className={`absolute bottom-3 left-0 top-3 w-[3px] rounded-r-full ${accent}`} aria-hidden />
      {movable ? (
        <span
          className="inline-flex h-10 w-6 items-center justify-center rounded-md text-[#C4C4CC] transition-colors duration-150 group-hover/row:bg-[#F4F4F5] group-hover/row:text-[#71717A] dark:text-[#3A4661] dark:group-hover/row:bg-white/6 dark:group-hover/row:text-[#8EA0B8]"
          title="Arrastra para reasignar"
          aria-hidden
        >
          <GripVertical className="size-4" />
        </span>
      ) : (
        <span className="w-6" aria-hidden />
      )}
      {children}
    </article>
  );
}

function Actions({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 opacity-80 transition-opacity duration-150 group-hover/row:opacity-100 group-focus-within/row:opacity-100">
      {children}
    </div>
  );
}

function cotizacionesDeOrden(orden: Orden): CotizacionRef[] {
  const src = Array.isArray(orden.cotizaciones_resumen)
    ? orden.cotizaciones_resumen
    : Array.isArray(orden.cotizaciones_adjuntas)
      ? orden.cotizaciones_adjuntas
      : [];
  return src
    .filter((c) => c && (c.origen === "digitalflow" || c.origen === "sicar"))
    .map((c) => ({ id: String(c.id), origen: c.origen, folio: String(c.folio ?? "") }));
}

function CotizacionCell({ cotizaciones }: { cotizaciones: CotizacionRef[] }) {
  return cotizaciones.length > 0 ? (
    <CotizacionVinculadaTrigger cotizaciones={cotizaciones} />
  ) : (
    <span className="text-[12px] text-[#C4C4CC] dark:text-[#3A4661]">Sin cotización</span>
  );
}

/* --------------------------------------------------------------------------
   Filas
   -------------------------------------------------------------------------- */

type RowCommon = {
  columnId: EquipoTecnicoId;
  dragging: boolean;
  justMoved: boolean;
  destinos: EquipoDestino[];
  handlers: EquipoRowHandlers;
};

const OrdenRow = memo(function OrdenRow({ orden, columnId, dragging, justMoved, destinos, handlers }: RowCommon & { orden: Orden }) {
  const ref = useRef<HTMLElement | null>(null);
  const movable = ordenAbierta(orden);
  const folio = displayOrdenFolio(orden);
  const cliente = orden.cliente || "Sin cliente";
  const fromKey = columnKey(columnId);
  useEquipoDraggable(ref, { enabled: movable, kind: "orden", id: String(orden.id), fromKey, folio, cliente });

  const prio = ordenPrioridadListBadge(orden);
  const prioTone = getOrdenPrioridadSectionStyles(prio.assignedKey);
  const inicio = String(orden.fecha_inicio || orden.fecha_creacion || "").slice(0, 10);
  const servicio = Array.isArray(orden.servicios_realizados) ? orden.servicios_realizados[0] : "";
  const cotizaciones = cotizacionesDeOrden(orden);

  const meta = (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-[#71717A] dark:text-[#8EA0B8]">
      {inicio ? (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <CalendarDays className="size-3.5 text-[#A1A1AA]" aria-hidden />
          {formatYmdToDMY(inicio)}
        </span>
      ) : null}
      {movable ? (
        <span className="inline-flex items-center gap-1.5" title={prio.title}>
          <span className={`size-1.5 rounded-full ${prioTone.dot}`} aria-hidden />
          {prio.visibleLabel}
        </span>
      ) : null}
    </div>
  );

  return (
    <RowFrame refEl={ref} accent={ordenTone(orden.status).accent} movable={movable} dragging={dragging} justMoved={justMoved} ariaLabel={`Orden ${folio}, ${cliente}`}>
      <TypeTile kind="orden" movable={movable} />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-mono text-[12.5px] font-semibold tracking-tight text-[#1244D1] dark:text-[#9BB6FF]">{folio}</span>
          <OrdenStatusPill status={orden.status} />
          {orden.en_pool ? (
            <span className="hidden h-5 items-center rounded-full bg-[#F4F4F5] px-2 text-[11px] font-semibold text-[#52525B] dark:bg-white/6 dark:text-[#B7C1D1] sm:inline-flex">
              En bolsa
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]" title={cliente}>
          {cliente}
        </p>
        {servicio ? <p className="truncate text-[12.5px] text-[#71717A] dark:text-[#8EA0B8]">{servicio}</p> : null}
        <div className="mt-1.5 space-y-1.5 xl:hidden">
          {meta}
          <CotizacionCell cotizaciones={cotizaciones} />
        </div>
      </div>
      <div className="hidden min-w-0 xl:block">{meta}</div>
      <div className="hidden min-w-0 xl:block">
        <CotizacionCell cotizaciones={cotizaciones} />
      </div>
      <Actions>
        {movable ? (
          <MoverA
            label={`Mover orden ${folio} a otro técnico`}
            destinos={destinos}
            currentKey={fromKey}
            onPick={(to) => handlers.onMove({ kind: "orden", id: String(orden.id), fromId: columnId, toId: to.id })}
          />
        ) : null}
        <button type="button" className={rowActionBtn} onClick={() => handlers.onPdfOrden(orden)} aria-label={`PDF de ${folio}`} title="PDF">
          <FileText aria-hidden />
        </button>
        {handlers.onEditOrden ? (
          <button type="button" className={rowActionBtn} onClick={() => handlers.onEditOrden?.(orden)} aria-label={`Abrir ${folio}`} title="Abrir orden">
            <Pencil aria-hidden />
          </button>
        ) : null}
      </Actions>
    </RowFrame>
  );
});

const ROL_LABEL = { responsable: "Responsable", tecnico: "Técnico", auxiliar: "Auxiliar" } as const;

const ProyectoRowItem = memo(function ProyectoRowItem({
  row,
  columnId,
  dragging,
  justMoved,
  destinos,
  handlers,
}: RowCommon & { row: ProyectoRow }) {
  const ref = useRef<HTMLElement | null>(null);
  const movable = proyectoActivo(row);
  const folio = displayProyectoFolio(row.folio);
  const cliente = row.cliente || "Sin cliente";
  const fromKey = columnKey(columnId);
  useEquipoDraggable(ref, { enabled: movable, kind: "proyecto", id: String(row.id), fromKey, folio, cliente });

  const avance = Math.round(Number(row.draft?.porcentajeAvance) || 0);
  const tone = toneForEstado(row.estado);
  const rol = proyectoRolDe(row, columnId);
  const tipos = proyectoTiposLabels(row);
  const cotizaciones = proyectoCotizacionesRefs(row);

  const meta = (
    <div className="min-w-0 space-y-1.5">
      <div className="flex items-center gap-2">
        <ProgressBar value={avance} barClass={tone.bar} size="sm" className="min-w-16 flex-1" label={`Avance de ${folio}`} />
        <span className="w-9 text-right text-[12px] font-semibold tabular-nums text-[#52525B] dark:text-[#B7C1D1]">{avance}%</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
        {rol ? (
          <span
            className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold ${
              rol === "responsable"
                ? "bg-[#EEF3FF] text-[#1244D1] dark:bg-[#1B2A63]/70 dark:text-[#C9D7FF]"
                : "bg-[#F4F4F5] text-[#52525B] dark:bg-white/6 dark:text-[#B7C1D1]"
            }`}
          >
            {ROL_LABEL[rol]}
          </span>
        ) : null}
        {row.equiposTotal > 0 ? (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Package className="size-3.5 text-[#A1A1AA]" aria-hidden />
            {row.equiposEntregados}/{row.equiposTotal}
          </span>
        ) : null}
      </div>
    </div>
  );

  return (
    <RowFrame refEl={ref} accent={tone.bar} movable={movable} dragging={dragging} justMoved={justMoved} ariaLabel={`Proyecto ${folio}, ${cliente}`}>
      <TypeTile kind="proyecto" movable={movable} />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-mono text-[12.5px] font-semibold tracking-tight text-[#1244D1] dark:text-[#9BB6FF]">{folio}</span>
          <EstadoPill estado={row.estado} size="sm" />
        </div>
        <p className="mt-0.5 truncate text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]" title={cliente}>
          {cliente}
        </p>
        {tipos.length ? <p className="truncate text-[12.5px] text-[#71717A] dark:text-[#8EA0B8]">{tipos.join(" · ")}</p> : null}
        <div className="mt-1.5 space-y-1.5 xl:hidden">
          {meta}
          <CotizacionCell cotizaciones={cotizaciones} />
        </div>
      </div>
      <div className="hidden min-w-0 xl:block">{meta}</div>
      <div className="hidden min-w-0 xl:block">
        <CotizacionCell cotizaciones={cotizaciones} />
      </div>
      <Actions>
        {movable ? (
          <MoverA
            label={`Mover proyecto ${folio} a otro técnico`}
            destinos={destinos}
            currentKey={fromKey}
            onPick={(to) => handlers.onMove({ kind: "proyecto", id: String(row.id), fromId: columnId, toId: to.id })}
          />
        ) : null}
        <button type="button" className={rowActionBtn} onClick={() => handlers.onPdfProyecto(row)} aria-label={`PDF de ${folio}`} title="PDF">
          <FileText aria-hidden />
        </button>
        {handlers.onEditProyecto ? (
          <button type="button" className={rowActionBtn} onClick={() => handlers.onEditProyecto?.(row)} aria-label={`Abrir ${folio}`} title="Abrir proyecto">
            <Pencil aria-hidden />
          </button>
        ) : null}
      </Actions>
    </RowFrame>
  );
});

/* --------------------------------------------------------------------------
   Bloques y grupos
   -------------------------------------------------------------------------- */

type ListCommon = {
  draggingItemKey: string | null;
  justMovedKey: string | null;
  destinos: EquipoDestino[];
  handlers: EquipoRowHandlers;
};

/** Fila con entrada/salida (solo la que cambia anima su altura). */
function Animated({ children }: { children: ReactNode }) {
  return (
    <motion.li
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto", transition: { duration: 0.24, ease: EASE } }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.18, ease: "easeIn" } }}
      className="overflow-hidden"
    >
      {children}
    </motion.li>
  );
}

function SubHeader({ icon, label, count }: { icon: ReactNode; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 border-b border-[#F0F0F2] bg-[#FCFCFD] px-4 py-2 dark:border-[#1F2A3C] dark:bg-[#0F172A]/40 sm:px-5">
      <span className="text-[#A1A1AA] [&_svg]:size-3.5" aria-hidden>
        {icon}
      </span>
      <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#52525B] dark:text-[#B7C1D1]">{label}</h3>
      <span key={count} className="cot-flash rounded-full bg-[#F4F4F5] px-1.5 text-[11px] tabular-nums text-[#71717A] dark:bg-white/6 dark:text-[#8EA0B8]">
        {count}
      </span>
    </div>
  );
}

function SeccionRows({ seccion, split, ...common }: ListCommon & { seccion: EquipoSeccion; split: boolean }) {
  const colKey = columnKey(seccion.tecnico.id);
  const draggingIn = (kind: EquipoItemKind, id: string | number) => common.draggingItemKey === itemKey(kind, id, colKey);
  const moved = (kind: EquipoItemKind, id: string | number) => common.justMovedKey === itemKey(kind, id, colKey);

  const ordenes = (
    <ul className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]">
      <AnimatePresence initial={false}>
        {seccion.ordenes.map((orden) => (
          <Animated key={itemKey("orden", orden.id, colKey)}>
            <OrdenRow
              orden={orden}
              columnId={seccion.tecnico.id}
              dragging={draggingIn("orden", orden.id)}
              justMoved={moved("orden", orden.id)}
              destinos={common.destinos}
              handlers={common.handlers}
            />
          </Animated>
        ))}
      </AnimatePresence>
    </ul>
  );
  const proyectos = (
    <ul className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]">
      <AnimatePresence initial={false}>
        {seccion.proyectos.map((row) => (
          <Animated key={itemKey("proyecto", row.id, colKey)}>
            <ProyectoRowItem
              row={row}
              columnId={seccion.tecnico.id}
              dragging={draggingIn("proyecto", row.id)}
              justMoved={moved("proyecto", row.id)}
              destinos={common.destinos}
              handlers={common.handlers}
            />
          </Animated>
        ))}
      </AnimatePresence>
    </ul>
  );

  if (!split) {
    return (
      <>
        {ordenes}
        {seccion.ordenes.length > 0 && seccion.proyectos.length > 0 ? <div className="border-t border-[#F0F0F2] dark:border-[#1F2A3C]" /> : null}
        {proyectos}
      </>
    );
  }
  return (
    <>
      {seccion.ordenes.length > 0 ? (
        <section aria-label="Órdenes de trabajo">
          <SubHeader icon={<ClipboardList />} label="Órdenes de trabajo" count={seccion.ordenes.length} />
          {ordenes}
        </section>
      ) : null}
      {seccion.proyectos.length > 0 ? (
        <section aria-label="Proyectos" className={seccion.ordenes.length > 0 ? "border-t border-[#F0F0F2] dark:border-[#1F2A3C]" : ""}>
          <SubHeader icon={<FolderKanban />} label="Proyectos" count={seccion.proyectos.length} />
          {proyectos}
        </section>
      ) : null}
    </>
  );
}

type DropProps = {
  /** Algo se está arrastrando (los grupos que lo aceptan se marcan). */
  dragFromKey: string | null;
  overKey: string | null;
  onOverChange: (key: string, over: boolean) => void;
};

function GrupoTecnico({
  seccion,
  collapsed,
  onToggle,
  dragFromKey,
  overKey,
  onOverChange,
  ...common
}: ListCommon & DropProps & { seccion: EquipoSeccion; collapsed: boolean; onToggle: () => void }) {
  const ref = useRef<HTMLElement | null>(null);
  const { tecnico } = seccion;
  const key = columnKey(tecnico.id);
  const sinAsignar = tecnico.id == null;
  const bodyId = `equipo-grupo-${key}`;
  const accepts = dragFromKey != null && dragFromKey !== key;
  const isOver = overKey === key;

  // Cada grupo también es zona de soltar (además del riel de técnicos).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return dropTargetForElements({
      element: el,
      getData: () => ({ kind: "equipo-columna", key }),
      canDrop: ({ source }) => isEquipoDragData(source.data) && source.data.fromKey !== key,
      onDragEnter: () => onOverChange(key, true),
      onDragLeave: () => onOverChange(key, false),
      onDrop: () => onOverChange(key, false),
    });
  }, [key, onOverChange]);

  return (
    <section
      ref={ref}
      aria-labelledby={`${bodyId}-titulo`}
      className={`cot-rise relative overflow-hidden rounded-[16px] border bg-white transition-[border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none dark:bg-[#111827] ${
        isOver
          ? "border-[#1B5CFF] shadow-[0_0_0_4px_rgba(27,92,255,0.14)] dark:border-[#4B7CFF]"
          : accepts
            ? "border-dashed border-[#BFD3FF] dark:border-[#2C3F7A]"
            : "border-[#E4E4E7] shadow-[0_1px_2px_rgba(9,9,11,0.04)] dark:border-[#273244]"
      }`}
    >
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          className={`relative flex w-full items-center gap-3 border-b px-4 py-3.5 text-left transition-colors sm:px-5 ${
            collapsed ? "border-transparent" : "border-[#EDEDF0] dark:border-[#1F2A3C]"
          } ${
            sinAsignar
              ? "bg-gradient-to-r from-[#FFF8EB] to-white hover:from-[#FFF1D6] dark:from-[rgba(230,162,60,0.12)] dark:to-[#111827]"
              : "bg-gradient-to-r from-[#F2F6FF] to-white hover:from-[#E8EFFF] dark:from-[#1B2A63]/45 dark:to-[#111827]"
          } ${focusRing}`}
        >
          <span
            className={`absolute bottom-0 left-0 top-0 w-1 ${sinAsignar ? "bg-[#D08A1E] dark:bg-[#E6A23C]" : "bg-[#1B5CFF] dark:bg-[#7EA0FF]"}`}
            aria-hidden
          />
          <EquipoAvatar id={tecnico.id} nombre={tecnico.nombre} avatarUrl={tecnico.avatarUrl} size="md" />
          <span className="min-w-0 flex-1">
            <span id={`${bodyId}-titulo`} className="block truncate text-[15px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">
              {tecnico.nombre}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {seccion.ordenes.length > 0 ? (
                <span className="inline-flex h-5 items-center gap-1 rounded-full bg-white/80 px-2 text-[11.5px] font-medium text-[#1244D1] ring-1 ring-inset ring-[#D7E3FF] dark:bg-white/6 dark:text-[#C9D7FF] dark:ring-[#2C3F7A]">
                  <ClipboardList className="size-3" aria-hidden />
                  {seccion.ordenes.length} {seccion.ordenes.length === 1 ? "orden" : "órdenes"}
                </span>
              ) : null}
              {seccion.proyectos.length > 0 ? (
                <span className="inline-flex h-5 items-center gap-1 rounded-full bg-white/80 px-2 text-[11.5px] font-medium text-[#8A5D0F] ring-1 ring-inset ring-[#F0D7A3] dark:bg-white/6 dark:text-[#F2C27A] dark:ring-[rgba(230,162,60,0.3)]">
                  <FolderKanban className="size-3" aria-hidden />
                  {seccion.proyectos.length} {seccion.proyectos.length === 1 ? "proyecto" : "proyectos"}
                </span>
              ) : null}
            </span>
          </span>
          {seccion.pendientes > 0 ? (
            <span className="hidden shrink-0 text-[12px] font-semibold tabular-nums text-[#52525B] dark:text-[#B7C1D1] sm:inline">
              {seccion.pendientes} {seccion.pendientes === 1 ? "abierto" : "abiertos"}
            </span>
          ) : null}
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-white/70 text-[#71717A] ring-1 ring-inset ring-[#E4E4E7] dark:bg-white/6 dark:text-[#8EA0B8] dark:ring-[#273244]">
            <ChevronDown className={`size-4 transition-transform duration-200 motion-reduce:transition-none ${collapsed ? "-rotate-90" : ""}`} aria-hidden />
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {!collapsed ? (
          <motion.div
            id={bodyId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: { duration: 0.26, ease: EASE } }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.2, ease: "easeIn" } }}
            className="overflow-hidden"
          >
            <SeccionRows seccion={seccion} split={false} {...common} />
          </motion.div>
        ) : null}
      </AnimatePresence>
      {isOver ? (
        <p className="cot-pop pointer-events-none absolute inset-x-4 bottom-3 rounded-xl bg-[#1B5CFF] px-3 py-2 text-center text-[12.5px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(27,92,255,0.8)] dark:bg-[#4B7CFF]">
          {sinAsignar ? "Soltar para quitar el técnico" : `Asignar a ${tecnico.nombre}`}
        </p>
      ) : null}
    </section>
  );
}

/* --------------------------------------------------------------------------
   Export
   -------------------------------------------------------------------------- */

export function EquipoWorkList({
  mode,
  secciones,
  emptyTitle,
  emptyHint,
  dragFromKey,
  overKey,
  onOverChange,
  ...common
}: ListCommon &
  DropProps & {
    mode: "single" | "todos";
    secciones: EquipoSeccion[];
    emptyTitle: string;
    emptyHint: string;
  }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const conFilas = secciones.filter((s) => s.ordenes.length + s.proyectos.length > 0);

  if (conFilas.length === 0) {
    return (
      <div className="cot-fade flex flex-col items-center gap-2 px-6 py-16 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-[#F4F4F5] text-[#A1A1AA] dark:bg-white/6 dark:text-[#64748B]">
          <SearchX className="size-5" aria-hidden />
        </span>
        <p className="text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{emptyTitle}</p>
        <p className="max-w-sm text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">{emptyHint}</p>
      </div>
    );
  }

  if (mode === "single") return <SeccionRows seccion={conFilas[0]} split {...common} />;

  return (
    <div className="space-y-3 bg-[#F7F7F9] p-3 dark:bg-[#0B1220] sm:p-4">
      {conFilas.map((s) => {
        const key = columnKey(s.tecnico.id);
        return (
          <GrupoTecnico
            key={key}
            seccion={s}
            collapsed={collapsed.has(key)}
            onToggle={() =>
              setCollapsed((prev) => {
                const next = new Set(prev);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
              })
            }
            dragFromKey={dragFromKey}
            overKey={overKey}
            onOverChange={onOverChange}
            {...common}
          />
        );
      })}
    </div>
  );
}
