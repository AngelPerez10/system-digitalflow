/**
 * Tarjeta de un trabajo (orden de trabajo o proyecto) en el tablero semanal.
 *
 * Muestra lo necesario para despachar sin abrir el trabajo: folio y estado,
 * cliente, sucursal/domicilio, horario, servicios, contacto, prioridad,
 * avance y equipos (proyectos) y el resto del equipo. La problemática y el
 * comentario del técnico se leen en el modal «Notas» (botón del pie).
 *
 * - Abierta: se arrastra a otra celda (técnico × día); en teclado/táctil se
 *   usan «Mover a…» y «Cambiar día».
 * - Cerrada (resuelta/cancelada, cerrado/cancelado): atenuada y fija.
 * - Clic en la tarjeta: no navega; la orden/proyecto solo se abre con el botón
 *   «Abrir» (si hay permiso). No hay un botón que cubra la tarjeta:
 *   en Firefox impide iniciar el arrastre.
 *
 * Variantes: `compact` (celda del tablero; acciones al pasar el cursor o con
 * foco) y `row` (vista angosta; acciones siempre visibles).
 * Movimiento: solo `transform`/`opacity`; sin reflow al arrastrar ni al recibirla.
 */
import { memo, useMemo, useRef } from "react";
import { AlertTriangle, ChevronRight, ClipboardList, Clock, FileText, FolderKanban, Lock, MapPin, MessageSquareText, Package, SquareArrowOutUpRight, User, Users } from "lucide-react";
import type { Orden } from "../../../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import { focusRing } from "../../../Proyectos/shared/proyectoTokens";
import type { ProyectoRow } from "../../../Proyectos/shared/proyectoTypes";
import { useEquipoDraggable } from "../../hooks/useEquipoDraggable";
import { columnKey, type EquipoDestino, type EquipoMoveRequest } from "../../shared/equipoDnd";
import { infoOrden, infoProyecto } from "../../shared/equipoInfo";
import type { EquipoTarjeta } from "../../shared/equipoSemana";
import { TIPO_TONE } from "../../shared/equipoTokens";
import { MoverDia } from "../EquipoCambiarDia";
import { MoverA } from "../EquipoUi";

export type EquipoJobHandlers = {
  onMove: (req: EquipoMoveRequest) => void;
  onEditOrden?: (orden: Orden) => void;
  onPdfOrden: (orden: Orden) => void;
  onEditProyecto?: (row: ProyectoRow) => void;
  onPdfProyecto: (row: ProyectoRow) => void;
  /** Abre el modal con la problemática y el comentario del técnico. */
  onNotas: (tarjeta: EquipoTarjeta) => void;
};

type Props = {
  tarjeta: EquipoTarjeta;
  variant: "compact" | "row";
  /** Los 7 días (`YYYY-MM-DD`) de la semana visible, para «Cambiar día». */
  semana: string[];
  dragging: boolean;
  justMoved: boolean;
  destinos: EquipoDestino[];
  handlers: EquipoJobHandlers;
};

const iconBtn = `cot-press inline-flex size-7 items-center justify-center rounded-[8px] text-[#52525B] hover:bg-[#F4F4F5] hover:text-[#09090B] dark:text-[#B7C1D1] dark:hover:bg-white/[0.08] dark:hover:text-white [&_svg]:size-3.5 ${focusRing}`;

/** Línea de detalle con ícono (dirección, horario, contacto…). */
function Dato({ icon, children, title, clamp = false }: { icon: React.ReactNode; children: React.ReactNode; title?: string; clamp?: boolean }) {
  return (
    <p className="flex min-w-0 items-start gap-1.5 text-[12px] leading-[1.35] text-[#52525B] dark:text-[#B7C1D1]" title={title}>
      <span className="mt-[1px] shrink-0 text-[#A1A1AA] dark:text-[#64748B] [&_svg]:size-3" aria-hidden>
        {icon}
      </span>
      <span className={`min-w-0 ${clamp ? "line-clamp-2" : "truncate"}`}>{children}</span>
    </p>
  );
}

export const EquipoJobCard = memo(function EquipoJobCard({ tarjeta: t, variant, semana, dragging, justMoved, destinos, handlers }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const esOrden = t.kind === "orden";
  const tipo = TIPO_TONE[t.kind];
  const d = useMemo(() => (t.kind === "orden" ? infoOrden(t.orden, t.abierta) : infoProyecto(t.row, t.tecnico.id, t.fecha)), [t]);
  const jornada = t.kind === "proyecto" && t.jornada ? `Día ${t.jornada.n}/${t.jornada.total}` : null;
  const fromKey = columnKey(t.tecnico.id);
  const id = esOrden ? String(t.orden.id) : String(t.row.id);
  useEquipoDraggable(ref, { enabled: t.abierta, kind: t.kind, id, fromKey, fecha: t.fecha, folio: d.folio, cliente: d.cliente });

  const onOpen = esOrden
    ? handlers.onEditOrden && (() => handlers.onEditOrden?.(t.orden))
    : handlers.onEditProyecto && (() => handlers.onEditProyecto?.(t.row));
  const onPdf = () => (t.kind === "orden" ? handlers.onPdfOrden(t.orden) : handlers.onPdfProyecto(t.row));
  const compact = variant === "compact";

  const acciones = (
    <>
      {t.abierta ? (
        <MoverA
          label={`Mover ${esOrden ? "orden" : "proyecto"} ${d.folio} a otro técnico`}
          destinos={destinos}
          currentKey={fromKey}
          onPick={(to) => handlers.onMove({ kind: t.kind, id, fromId: t.tecnico.id, toId: to.id })}
          compact
        />
      ) : null}
      {t.abierta ? (
        <MoverDia
          label={`Cambiar ${d.folio} de día`}
          actual={t.fecha}
          semana={semana}
          onPick={(toFecha) => handlers.onMove({ kind: t.kind, id, fromId: t.tecnico.id, toId: t.tecnico.id, fromFecha: t.fecha, toFecha })}
        />
      ) : null}
      <button type="button" className={iconBtn} onClick={onPdf} aria-label={`PDF de ${d.folio}`} title="PDF">
        <FileText aria-hidden />
      </button>
      {onOpen ? (
        <button type="button" className={iconBtn} onClick={onOpen} aria-label={`Abrir ${d.folio}`} title="Abrir">
          <SquareArrowOutUpRight aria-hidden />
        </button>
      ) : null}
    </>
  );

  const lugar = [d.sucursal, d.direccion].filter(Boolean).join(" · ");
  const serviciosVisibles = d.servicios.slice(0, compact ? 2 : 4);
  const serviciosResto = d.servicios.length - serviciosVisibles.length;
  const hayNotas = d.detalle !== "" || d.comentario !== "";
  const hayFichas = d.horario !== "" || jornada != null || d.prio != null;
  const hayPie = d.avance != null || d.equipos != null || d.equipoExtra > 0;

  return (
    <article
      ref={ref}
      aria-label={`${esOrden ? "Orden" : "Proyecto"} ${d.folio}, ${d.cliente}, ${d.estadoLabel}`}
      className={`eq-lift eq-card-in group/card relative overflow-hidden rounded-[14px] border bg-white text-left dark:bg-[#0F172A] ${justMoved ? "eq-moved" : ""} ${
        compact ? "p-3 pl-4" : "flex items-start gap-3 py-3 pl-4 pr-2"
      } ${
        dragging
          ? "border-dashed border-[#BFD3FF] opacity-40 dark:border-[#2C3F7A]"
          : justMoved
            ? "border-[#34C38F] shadow-[0_0_0_3px_rgba(52,195,143,0.2)] dark:border-[#34D399]"
            : "eq-card-shadow border-[#E7E7EA] hover:border-[#D4D4DB] dark:border-[#243044] dark:hover:border-[#3A4661]"
      } ${t.abierta ? "cursor-grab active:cursor-grabbing" : "opacity-55 saturate-[0.65] transition-[opacity,filter] duration-200 hover:opacity-90 hover:saturate-100 focus-within:opacity-90 focus-within:saturate-100"}`}
    >
      {/* Acento de tipo (TIPO_TONE), separado del borde: no comparte color con ningún status. */}
      <span className={`absolute bottom-3 left-[5px] top-3 w-[3px] rounded-full ${tipo.bar}`} aria-hidden />

      <div className="min-w-0 flex-1">
        {/* 1 · Tipo, folio y estado */}
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={`inline-flex size-5 shrink-0 items-center justify-center rounded-[6px] ring-1 ring-inset ${tipo.tile}`} title={tipo.label} aria-hidden>
            {esOrden ? <ClipboardList className="size-3" /> : <FolderKanban className="size-3" />}
          </span>
          <span className="truncate font-mono text-[11.5px] font-semibold tracking-tight text-[#1244D1] dark:text-[#9BB6FF]">{d.folio}</span>
          {!t.abierta ? <Lock className="size-3 shrink-0 text-[#A1A1AA]" aria-hidden /> : null}
          <span className={`ml-auto inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-1.5 text-[10.5px] font-semibold ring-1 ring-inset ${d.estadoPill}`}>
            <span className={`size-1.5 rounded-full ${d.estadoDot}`} aria-hidden />
            {d.estadoLabel}
          </span>
        </div>

        {/* 2 · Cliente */}
        <p
          className={`mt-2 font-semibold leading-snug tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC] ${compact ? "line-clamp-2 text-[14px]" : "truncate text-[14.5px]"}`}
          title={d.cliente}
        >
          {d.cliente}
        </p>

        {/* 3 · Cuándo: horario, jornada y prioridad como fichas */}
        {hayFichas ? (
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1">
            {d.horario ? (
              <span className="inline-flex h-[22px] items-center gap-1 rounded-[7px] bg-[#F4F4F5] px-1.5 text-[11.5px] font-semibold tabular-nums text-[#27272A] dark:bg-white/[0.06] dark:text-[#E2E8F0]">
                <Clock className="size-3 text-[#71717A] dark:text-[#8EA0B8]" aria-hidden />
                {d.horario}
              </span>
            ) : null}
            {jornada ? <span className={`inline-flex h-[22px] items-center rounded-[7px] px-1.5 text-[11px] font-semibold tabular-nums ${tipo.chip}`}>{jornada}</span> : null}
            {d.prio ? (
              <span
                className="inline-flex h-[22px] min-w-0 items-center gap-1 rounded-[7px] border border-[#EDEDF0] px-1.5 text-[11px] font-medium text-[#52525B] dark:border-white/[0.07] dark:text-[#B7C1D1]"
                title={d.prio.title}
              >
                <span className={`size-1.5 shrink-0 rounded-full ${d.prio.dot}`} aria-hidden />
                <span className="truncate">Prioridad {d.prio.label.toLowerCase()}</span>
              </span>
            ) : null}
          </div>
        ) : null}

        {/* 4 · Dónde y con quién */}
        {lugar || d.contacto ? (
          <div className="mt-2 space-y-1">
            {lugar ? (
              <Dato icon={<MapPin />} title={lugar} clamp={compact}>
                {lugar}
              </Dato>
            ) : null}
            {d.contacto ? (
              <Dato icon={<User />} title={d.telefono ? `${d.contacto} · ${d.telefono}` : d.contacto}>
                {d.contacto}
                {d.telefono ? <span className="tabular-nums text-[#A1A1AA] dark:text-[#64748B]"> · {d.telefono}</span> : null}
              </Dato>
            ) : null}
          </div>
        ) : null}

        {/* 5 · Qué: servicios */}
        {serviciosVisibles.length > 0 ? (
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1">
            {serviciosVisibles.map((s) => (
              <span
                key={s}
                className="max-w-full truncate rounded-full border border-[#EDEDF0] bg-white px-2 py-[3px] text-[11px] font-medium leading-none text-[#3F3F46] dark:border-white/[0.07] dark:bg-transparent dark:text-[#D6DEEA]"
                title={s}
              >
                {s}
              </span>
            ))}
            {serviciosResto > 0 ? (
              <span className="px-0.5 text-[11px] font-semibold text-[#71717A] dark:text-[#8EA0B8]" title={d.servicios.slice(serviciosVisibles.length).join(" · ")}>
                +{serviciosResto}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* 6 · Problemática y comentario del técnico: vista previa; el texto completo va en el modal. */}
        {hayNotas ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlers.onNotas(t);
            }}
            aria-haspopup="dialog"
            aria-label={`Ver ${[d.detalle && d.detalleLabel.toLowerCase(), d.comentario && (esOrden ? "comentario del técnico" : "bitácora del técnico")].filter(Boolean).join(" y ")} de ${d.folio}`}
            className={`eq-notes-btn group/notes mt-2.5 block w-full min-w-0 rounded-[10px] border border-[#EDEDF0] bg-[#FAFAFB] px-2.5 py-2 text-left hover:border-[#D7E3FF] hover:bg-[#F5F8FF] dark:border-[#1F2A3C] dark:bg-white/[0.025] dark:hover:border-[#2C3F7A] dark:hover:bg-[#1B2A63]/25 ${focusRing}`}
          >
            <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]">
              {d.detalle ? (
                <span className="inline-flex items-center gap-1 text-[#9A5B0B] dark:text-[#F2C27A]">
                  <AlertTriangle className="size-3" aria-hidden />
                  {d.detalleLabel}
                </span>
              ) : null}
              {d.detalle && d.comentario ? (
                <span className="text-[#D4D4DB] dark:text-[#3A4661]" aria-hidden>
                  ·
                </span>
              ) : null}
              {d.comentario ? (
                <span className="inline-flex items-center gap-1 text-[#1244D1] dark:text-[#9BB6FF]">
                  <MessageSquareText className="size-3" aria-hidden />
                  Técnico
                </span>
              ) : null}
              <ChevronRight className="eq-notes-chevron ml-auto size-3.5 shrink-0 text-[#A1A1AA] dark:text-[#64748B]" aria-hidden />
            </span>
            <span className="mt-1 line-clamp-2 break-words text-[12px] leading-[1.45] text-[#3F3F46] dark:text-[#D6DEEA]">{d.comentario || d.detalle}</span>
          </button>
        ) : null}

        {/* 7 · Avance y equipo */}
        {hayPie ? (
          <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px] text-[#71717A] dark:text-[#8EA0B8]">
            {d.avance != null ? (
              <span className="flex min-w-[6rem] flex-1 items-center gap-1.5" title={`Avance ${d.avance}%`}>
                <span className="relative block h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-[#EDEDF0] dark:bg-[#1F2A3C]" aria-hidden>
                  <span className={`cot-bar absolute inset-0 rounded-full ${d.avanceBar}`} style={{ transform: `scaleX(${d.avance / 100})` }} />
                </span>
                <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-[#3F3F46] dark:text-[#D6DEEA]">{d.avance}%</span>
              </span>
            ) : null}
            {d.equipos ? (
              <span className="inline-flex shrink-0 items-center gap-1 tabular-nums" title={`${d.equipos.instalados} de ${d.equipos.total} equipos instalados`}>
                <Package className="size-3" aria-hidden />
                {d.equipos.instalados}/{d.equipos.total}
              </span>
            ) : null}
            {d.equipoExtra > 0 ? (
              <span className="inline-flex shrink-0 items-center gap-0.5 tabular-nums" title={`También: ${d.equipoNombres}`}>
                <Users className="size-3" aria-hidden />+{d.equipoExtra}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {compact ? (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-1.5 top-9 z-[2] flex items-center gap-0.5 rounded-[9px] border border-[#E4E4E7] bg-white/95 p-0.5 opacity-0 shadow-[0_4px_12px_-6px_rgba(9,9,11,0.25)] transition-opacity duration-150 group-focus-within/card:opacity-100 group-hover/card:opacity-100 dark:border-[#273244] dark:bg-[#111827]/95"
        >
          {acciones}
        </div>
      ) : (
        <div onClick={(e) => e.stopPropagation()} className="relative z-[2] flex shrink-0 items-center gap-0.5">
          {acciones}
        </div>
      )}
    </article>
  );
});
