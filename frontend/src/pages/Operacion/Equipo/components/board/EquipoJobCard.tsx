/**
 * Tarjeta de un trabajo (orden de trabajo o proyecto) en el tablero semanal.
 *
 * - Abierta: se arrastra a otra celda (técnico × día) para reasignarla o
 *   cambiarla de día; en teclado/táctil se usan «Mover a…» y «Cambiar día».
 * - Cerrada (resuelta/cancelada, cerrado/cancelado): atenuada y fija.
 * - Clic en la tarjeta: abre la orden/proyecto (si hay permiso); el botón
 *   «Abrir» de las acciones es el equivalente accesible por teclado. No se
 *   usa un botón que cubra la tarjeta: en Firefox impide iniciar el arrastre.
 *
 * Variantes: `compact` (celda del tablero; acciones al pasar el cursor o con
 * foco) y `row` (vista angosta; acciones siempre visibles).
 * Estados sin reflow: opacidad al arrastrar, anillo verde al recibirla.
 */
import { memo, useRef } from "react";
import { ClipboardList, FileText, FolderKanban, Lock, SquareArrowOutUpRight, Users } from "lucide-react";
import type { Orden } from "../../../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import { getOrdenPrioridadSectionStyles, ordenPrioridadListBadge } from "../../../OrdenesTrabajo/OrdenServicio/shared/ordenPrioridadSections";
import { displayOrdenFolio } from "../../../OrdenesTrabajo/OrdenServicio/shared/useOrdenesShared";
import { displayProyectoFolio } from "../../../Proyectos/shared/proyectoFormUtils";
import { proyectoTeam, proyectoTiposLabels } from "../../../Proyectos/shared/proyectoListUtils";
import { focusRing, toneForEstado } from "../../../Proyectos/shared/proyectoTokens";
import type { ProyectoRow } from "../../../Proyectos/shared/proyectoTypes";
import { useEquipoDraggable } from "../../hooks/useEquipoDraggable";
import { columnKey, type EquipoDestino, type EquipoMoveRequest } from "../../shared/equipoDnd";
import { DIAS_CORTOS, parseYmd, type EquipoTarjeta } from "../../shared/equipoSemana";
import { ordenTone, TIPO_TONE } from "../../shared/equipoTokens";
import { MoverA, MoverDia } from "../EquipoUi";

export type EquipoJobHandlers = {
  onMove: (req: EquipoMoveRequest) => void;
  onEditOrden?: (orden: Orden) => void;
  onPdfOrden: (orden: Orden) => void;
  onEditProyecto?: (row: ProyectoRow) => void;
  onPdfProyecto: (row: ProyectoRow) => void;
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

/** Datos de presentación comunes a orden y proyecto. */
function describir(t: EquipoTarjeta) {
  if (t.kind === "orden") {
    const { orden } = t;
    const tone = ordenTone(orden.status);
    const prio = ordenPrioridadListBadge(orden);
    const servicio = Array.isArray(orden.servicios_realizados) ? orden.servicios_realizados[0] : "";
    return {
      folio: displayOrdenFolio(orden),
      sub: servicio || "",
      estadoLabel: tone.label,
      estadoDot: tone.dot,
      prio: t.abierta ? { label: prio.visibleLabel, title: prio.title, dot: getOrdenPrioridadSectionStyles(prio.assignedKey).dot } : null,
      avance: null as number | null,
      avanceBar: "",
      equipoExtra: 0,
      equipoNombres: "",
      jornada: null as string | null,
    };
  }
  const { row } = t;
  const tone = toneForEstado(row.estado);
  const team = proyectoTeam(row).todos.filter((m) => m.id != null && m.id !== t.tecnico.id);
  return {
    folio: displayProyectoFolio(row.folio),
    sub: proyectoTiposLabels(row).join(" · "),
    estadoLabel: tone.label,
    estadoDot: tone.dot,
    prio: null,
    avance: Math.max(0, Math.min(100, Math.round(Number(row.draft?.porcentajeAvance) || 0))),
    avanceBar: tone.bar,
    equipoExtra: team.length,
    equipoNombres: team.map((m) => m.nombre).join(", "),
    jornada: t.jornada ? `Día ${t.jornada.n}/${t.jornada.total}` : null,
  };
}

export const EquipoJobCard = memo(function EquipoJobCard({ tarjeta: t, variant, semana, dragging, justMoved, destinos, handlers }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const esOrden = t.kind === "orden";
  const tipo = TIPO_TONE[t.kind];
  const d = describir(t);
  const cliente = t.cliente || "Sin cliente";
  const fromKey = columnKey(t.tecnico.id);
  const id = esOrden ? String(t.orden.id) : String(t.row.id);
  useEquipoDraggable(ref, { enabled: t.abierta, kind: t.kind, id, fromKey, fecha: t.fecha, folio: d.folio, cliente });

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
          dias={semana.map((ymd, i) => ({ ymd, label: `${DIAS_CORTOS[i]} ${parseYmd(ymd)?.getDate() ?? ""}` }))}
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

  return (
    <article
      ref={ref}
      onClick={onOpen}
      aria-label={`${esOrden ? "Orden" : "Proyecto"} ${d.folio}, ${cliente}, ${d.estadoLabel}`}
      className={`eq-lift eq-card-in group/card relative overflow-hidden rounded-[10px] border bg-white text-left dark:bg-[#0F172A] ${justMoved ? "eq-moved" : ""} ${
        compact ? "py-2 pl-3 pr-2" : "flex items-start gap-3 py-2.5 pl-3.5 pr-2"
      } ${
        dragging
          ? "border-dashed border-[#BFD3FF] opacity-40 dark:border-[#2C3F7A]"
          : justMoved
            ? "border-[#34C38F] shadow-[0_0_0_3px_rgba(52,195,143,0.22)] dark:border-[#34D399]"
            : "border-[#E4E4E7] shadow-[0_1px_2px_rgba(9,9,11,0.05)] hover:border-[#D3D3D8] hover:shadow-[0_6px_16px_-10px_rgba(9,9,11,0.3)] dark:border-[#273244] dark:hover:border-[#3A4661]"
      } ${t.abierta ? "cursor-grab active:cursor-grabbing" : "opacity-65"}`}
    >
      {/* Acento de tipo (TIPO_TONE): no comparte color con ningún status. */}
      <span className={`absolute inset-y-0 left-0 w-[3px] origin-left transition-transform duration-200 ease-out group-hover/card:scale-x-[1.7] motion-reduce:transition-none ${tipo.bar}`} aria-hidden />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={`inline-flex size-[18px] shrink-0 items-center justify-center rounded-[6px] ring-1 ring-inset transition-transform duration-200 ease-out group-hover/card:scale-110 motion-reduce:transition-none ${tipo.tile}`} title={tipo.label} aria-hidden>
            {esOrden ? <ClipboardList className="size-3" /> : <FolderKanban className="size-3" />}
          </span>
          <span className="truncate font-mono text-[11px] font-semibold tracking-tight text-[#1244D1] dark:text-[#9BB6FF]">{d.folio}</span>
          {!t.abierta ? <Lock className="size-3 shrink-0 text-[#A1A1AA]" aria-hidden /> : null}
          <span className={`ml-auto size-2 shrink-0 rounded-full ${d.estadoDot}`} title={d.estadoLabel} aria-hidden />
        </div>

        <p className={`mt-1 font-semibold leading-snug text-[#09090B] dark:text-[#F8FAFC] ${compact ? "line-clamp-2 text-[12.5px]" : "truncate text-[13.5px]"}`} title={cliente}>
          {cliente}
        </p>
        {d.sub ? (
          <p className="truncate text-[11.5px] text-[#71717A] dark:text-[#8EA0B8]" title={d.sub}>
            {d.sub}
          </p>
        ) : null}

        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#71717A] dark:text-[#8EA0B8]">
          {d.avance != null ? (
            <span className="flex min-w-[5.75rem] flex-1 items-center gap-1.5" title={`Avance ${d.avance}%`}>
              <span className="relative block h-1 min-w-6 flex-1 overflow-hidden rounded-full bg-[#EDEDF0] dark:bg-[#1F2A3C]" aria-hidden>
                <span className={`cot-bar absolute inset-0 rounded-full ${d.avanceBar}`} style={{ transform: `scaleX(${d.avance / 100})` }} />
              </span>
              <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-[#52525B] dark:text-[#B7C1D1]">{d.avance}%</span>
            </span>
          ) : d.prio ? (
            <span className="inline-flex min-w-0 items-center gap-1" title={d.prio.title}>
              <span className={`size-1.5 shrink-0 rounded-full ${d.prio.dot}`} aria-hidden />
              <span className="truncate">{d.prio.label}</span>
            </span>
          ) : (
            <span className="truncate">{d.estadoLabel}</span>
          )}
          {d.jornada ? (
            <span className={`shrink-0 rounded-[5px] px-1 text-[10px] font-semibold tabular-nums ${tipo.chip}`} title="Jornada del proyecto">
              {d.jornada}
            </span>
          ) : null}
          {d.equipoExtra > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 tabular-nums" title={`También: ${d.equipoNombres}`}>
              <Users className="size-3" aria-hidden />+{d.equipoExtra}
            </span>
          ) : null}
        </div>
      </div>

      {compact ? (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-1 top-1 z-[2] flex items-center gap-0.5 rounded-[9px] border border-[#E4E4E7] bg-white/95 p-0.5 opacity-0 shadow-[0_4px_12px_-6px_rgba(9,9,11,0.25)] transition-opacity duration-150 group-focus-within/card:opacity-100 group-hover/card:opacity-100 dark:border-[#273244] dark:bg-[#111827]/95">
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
