/**
 * Tabla de órdenes (tablet y escritorio) compartida por la vista admin y la del técnico.
 *
 * Mismo lenguaje visual que la tabla de Proyectos: filas compactas de una
 * lectura (folio sobre cliente, técnico con avatar, estado como pastilla que
 * abre «Status colocado por») y acciones a la derecha. Las columnas
 * secundarias aparecen según el ancho real de la tabla (container queries),
 * así se aprovecha una pantalla grande sin apretar una laptop.
 *
 * Movimiento: entrada escalonada `cot-rise` (solo transform/opacity) y
 * transiciones de color; todo se apaga con prefers-reduced-motion.
 */
import { memo, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowUp, ClipboardList, FileText, Mail, MapPin, MessageSquareText, Pencil, Trash2, Wrench } from "lucide-react";
import { resolveMediaUrl } from "@/config/api";
import "@/components/ui/modal-kit/motion.css";
import { LiquidarControl } from "../../../Proyectos/shared/ProyectoUi";
import { StatusChangedByChip } from "../../../shared/StatusChangedByChip";
import { resolveOrdenStatusFallbackName, resolveStatusChangedByName } from "../../../shared/statusChangedBy";
import { focusRing, folioText, iconBtn, iconBtnDanger } from "../../../Proyectos/shared/proyectoTokens";
import type { Orden, Usuario } from "../shared/ordenesPageTypes";
import { displayOrdenUserName, formatIsoDateTime, formatOrdenAbiertaDuracion, isGoogleMapsUrl, isOrdenStatusChangeRecent } from "../shared/ordenesPageUtils";
import { getOrdenPrioridadSectionStyles, ordenPrioridadListBadge } from "../shared/ordenPrioridadSections";
import type { OrdenPrioridadSectionKey } from "../shared/ordenPrioridadSections";
import type { OrdenStatusSection, OrdenStatusSectionKey } from "../shared/ordenStatusSections";
import { displayOrdenFolio, isOrdenCancelada, isOrdenResuelta, isOrdenServicioTecnico } from "../shared/useOrdenesShared";
import { OrdenArrastreBadge } from "./OrdenArrastreBadge";

/* --------------------------------------------------------------------------
   Estados
   -------------------------------------------------------------------------- */

type StatusTone = { label: string; dot: string; pill: string };

const STATUS_TONE: Record<"pendiente" | "pausado" | "resuelto" | "cancelada", StatusTone> = {
  pendiente: {
    label: "Pendiente",
    dot: "bg-[#D08A1E] dark:bg-[#E6A23C]",
    pill: "bg-[#FFF8EB] text-[#8A5D0F] ring-[#F0D7A3] dark:bg-[rgba(230,162,60,0.12)] dark:text-[#F2C27A] dark:ring-[rgba(230,162,60,0.3)]",
  },
  pausado: {
    label: "Pausado",
    dot: "bg-[#5B5BD6] dark:bg-[#A5A6F6]",
    pill: "bg-[#F1F1FE] text-[#3E3EA8] ring-[#D8D8FA] dark:bg-[#23244F] dark:text-[#C7C8FB] dark:ring-[#3B3D7A]",
  },
  resuelto: {
    label: "Resuelto",
    dot: "bg-[#0E8A5F] dark:bg-[#34D399]",
    pill: "bg-[#E9F8F0] text-[#04724D] ring-[#BFE6D4] dark:bg-[#0F2A1C] dark:text-[#86EFAC] dark:ring-[#1E5A42]",
  },
  cancelada: {
    label: "Cancelada",
    dot: "bg-[#C22B2B] dark:bg-[#F87171]",
    pill: "bg-[#FEF2F2] text-[#B42323] ring-[#F6CFCF] dark:bg-[#3F1518] dark:text-[#F87171] dark:ring-[#7F1D1D]",
  },
};

const SECTION_DOT: Record<OrdenStatusSectionKey, string> = {
  PENDIENTE: STATUS_TONE.pendiente.dot,
  PAUSADO: STATUS_TONE.pausado.dot,
  RESUELTA: STATUS_TONE.resuelto.dot,
  CANCELADA: STATUS_TONE.cancelada.dot,
  OTROS: "bg-[#A1A1AA]",
};

function statusTone(status: string | null | undefined): StatusTone {
  const s = String(status || "").toLowerCase();
  if (isOrdenResuelta(s)) return STATUS_TONE.resuelto;
  if (isOrdenCancelada(s)) return STATUS_TONE.cancelada;
  if (s === "pausado") return STATUS_TONE.pausado;
  return STATUS_TONE.pendiente;
}

/* --------------------------------------------------------------------------
   Utilidades de celda
   -------------------------------------------------------------------------- */

function fechaIsoDay(raw: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(raw || ""));
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function fechaCorta(raw: string | null | undefined): string {
  const iso = fechaIsoDay(raw);
  if (!iso) return "—";
  const [y, mo, d] = iso.split("-").map(Number);
  const date = new Date(y, mo - 1, d);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date
    .toLocaleDateString("es-MX", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "2-digit" }) })
    .replace(/\./g, "");
}

function horaCorta(raw: string | null | undefined): string {
  const t = String(raw || "").trim();
  if (!t) return "";
  return t.slice(0, 5);
}

/** Celda Fechas: inicio (fecha + hora) como ancla, fin como renglón secundario. */
function FechasCell({
  inicio,
  hora,
  fin,
}: {
  inicio: string | null | undefined;
  hora: string | null | undefined;
  fin: string | null | undefined;
}) {
  const inicioLabel = fechaCorta(inicio);
  const finLabel = fin ? fechaCorta(fin) : null;
  const horaLabel = horaCorta(hora);
  const inicioIso = fechaIsoDay(inicio);
  const finIso = fechaIsoDay(fin);
  const summary = [
    inicioLabel !== "—" ? `Inicio ${inicioLabel}${horaLabel ? ` ${horaLabel}` : ""}` : "Sin inicio",
    finLabel ? `Fin ${finLabel}` : "Sin fin",
  ].join(". ");

  return (
    <div className="flex min-w-[7.5rem] flex-col gap-1" title={summary} aria-label={summary}>
      <div className="flex items-baseline gap-1.5">
        <span
          className="w-6 shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#A1A1AA] dark:text-[#64748B]"
          aria-hidden
        >
          Ini
        </span>
        {inicioIso ? (
          <time
            dateTime={inicioIso}
            className="text-[13px] font-medium tabular-nums text-[#09090B] dark:text-[#F8FAFC]"
          >
            {inicioLabel}
          </time>
        ) : (
          <span className="text-[13px] text-[#A1A1AA] dark:text-[#64748B]">—</span>
        )}
        {horaLabel ? (
          <span className="text-[12px] tabular-nums text-[#71717A] dark:text-[#8EA0B8]">{horaLabel}</span>
        ) : null}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className="w-6 shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#A1A1AA] dark:text-[#64748B]"
          aria-hidden
        >
          Fin
        </span>
        {finIso && finLabel ? (
          <time
            dateTime={finIso}
            className="text-[12.5px] tabular-nums text-[#52525B] dark:text-[#B7C1D1]"
          >
            {finLabel}
          </time>
        ) : (
          <span className="text-[12.5px] text-[#A1A1AA] dark:text-[#64748B]">Sin fin</span>
        )}
      </div>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts.length === 1 ? parts[0].slice(0, 2) : `${parts[0][0]}${parts[parts.length - 1][0]}`).toUpperCase();
}

function tecnicoNombre(orden: Orden, usuarios: Usuario[]): string {
  const u = usuarios.find((x) => x.id === orden.tecnico_asignado);
  if (u) {
    const full = `${u.first_name || ""} ${u.last_name || ""}`.trim();
    return full || u.username || u.email || "";
  }
  return (
    String(orden.tecnico_asignado_full_name || "").trim() ||
    String(orden.tecnico_asignado_username || "").trim() ||
    String(orden.nombre_encargado || "").trim()
  );
}

function TecnicoAvatar({ name, url }: { name: string; url?: string | null }) {
  const [broken, setBroken] = useState(false);
  const src = url && !broken ? resolveMediaUrl(url) : "";
  return (
    <span
      className="inline-flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EEF3FF] text-[10.5px] font-semibold text-[#17235B] ring-2 ring-white dark:bg-[#1B2A63] dark:text-[#C9D7FF] dark:ring-[#111827]"
      aria-hidden
    >
      {src ? (
        <img src={src} alt="" loading="lazy" decoding="async" className="size-full object-cover" onError={() => setBroken(true)} />
      ) : (
        initials(name)
      )}
    </span>
  );
}

/** «23 sep, 9:16 a.m.» (con año corto si no es el actual). */
function fechaHoraCorta(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  const fecha = d
    .toLocaleDateString("es-MX", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "2-digit" }) })
    .replace(/\./g, "");
  const hora = d.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });
  return `${fecha}, ${hora}`;
}

/** Una línea de auditoría: «Creó · Nombre · fecha». */
function RegistroLine({ label, verbo, name, at }: { label: string; verbo: string; name: string; at: string | null | undefined }) {
  const cuando = fechaHoraCorta(at);
  return (
    <div
      className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-baseline gap-x-2"
      title={`${label} ${name}${at ? ` · ${formatIsoDateTime(at)}` : ""}`}
    >
      <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#A1A1AA] dark:text-[#64748B]">
        {verbo}
        <span className="sr-only"> ({label})</span>
      </dt>
      <dd className="min-w-0">
        <span className="block truncate text-[12.5px] font-medium leading-tight text-[#27272A] dark:text-[#E2E8F0]">{name}</span>
        {cuando ? (
          <span className="block whitespace-nowrap text-[11.5px] leading-tight tabular-nums text-[#71717A] dark:text-[#8EA0B8]">{cuando}</span>
        ) : null}
      </dd>
    </div>
  );
}

/** Quién creó y quién editó por última vez (la edición solo si es posterior a la creación). */
function RegistroCell({ orden }: { orden: Orden }) {
  const creador = displayOrdenUserName(orden, "creado");
  const editor = displayOrdenUserName(orden, "actualizado");
  const created = orden.fecha_creacion ? new Date(orden.fecha_creacion).getTime() : NaN;
  const updated = orden.fecha_actualizacion ? new Date(orden.fecha_actualizacion).getTime() : NaN;
  const editada = Number.isFinite(updated) && (!Number.isFinite(created) || updated - created > 60_000);
  return (
    <dl className="space-y-1.5">
      <RegistroLine label="Creada por" verbo="Creó" name={creador} at={orden.fecha_creacion} />
      {editada ? (
        <RegistroLine label="Editada por" verbo="Editó" name={editor === "—" ? creador : editor} at={orden.fecha_actualizacion} />
      ) : null}
    </dl>
  );
}

/* --------------------------------------------------------------------------
   Detalle (problemática · servicios · comentario) como grupo de botones
   -------------------------------------------------------------------------- */

const segBase = `cot-press inline-flex h-[22px] items-center gap-1.5 rounded-[5px] px-1 -mx-1 text-[12px] font-medium tabular-nums transition-colors duration-150 [&_svg]:size-3.5 [&_svg]:shrink-0 ${focusRing}`;
const segOn =
  "text-[#3F3F46] hover:bg-[#F5F8FF] hover:text-[#1244D1] dark:text-[#D6DEEA] dark:hover:bg-[#1B2A63]/40 dark:hover:text-[#C9D7FF] [&_svg]:text-[#71717A] hover:[&_svg]:text-[#1244D1] dark:[&_svg]:text-[#8EA0B8]";
const segOff = "cursor-default text-[#C4C4CC] dark:text-[#3A4661]";

function DetalleSegment({
  icon,
  label,
  count,
  on,
  onClick,
  ariaLabel,
}: {
  icon: ReactNode;
  label: string;
  count?: number;
  on: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={on ? onClick : undefined}
      aria-disabled={!on || undefined}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`${segBase} ${on ? segOn : segOff}`}
    >
      {icon}
      <span>{label}</span>
      {count != null && count > 0 ? (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#EEF3FF] px-1 text-[10.5px] font-semibold text-[#1244D1] dark:bg-[#1B2A63] dark:text-[#C9D7FF]">
          {count}
        </span>
      ) : null}
    </button>
  );
}

/* --------------------------------------------------------------------------
   Prioridad: barras + etiqueta (sin pastilla) + tiempo abierta debajo.
   -------------------------------------------------------------------------- */

const PRIO_LEVEL: Record<OrdenPrioridadSectionKey, number> = { ALTA: 3, MEDIA: 2, BAJA: 1, SIN: 0 };
const PRIO_TEXT: Record<OrdenPrioridadSectionKey, string> = {
  ALTA: "text-[#B42323] dark:text-[#F87171]",
  MEDIA: "text-[#8A5D0F] dark:text-[#F2C27A]",
  BAJA: "text-[#0B6A94] dark:text-[#7DD3FC]",
  SIN: "text-[#71717A] dark:text-[#8EA0B8]",
};

function PrioridadIndicator({
  keyName,
  label,
  bar,
  escalada,
  title,
  ariaLabel,
  abiertaLabel,
  abiertaOver72,
}: {
  keyName: OrdenPrioridadSectionKey;
  label: string;
  bar: string;
  escalada: boolean;
  title: string;
  ariaLabel: string;
  abiertaLabel: string | null;
  abiertaOver72: boolean;
}) {
  const level = PRIO_LEVEL[keyName];
  const fullAria = abiertaLabel
    ? `${ariaLabel}. Lleva ${abiertaLabel.replace(/\s+/g, "")} sin completarse`
    : ariaLabel;
  const fullTitle = abiertaLabel
    ? `${title}. Lleva ${abiertaLabel} sin completarse`
    : title;
  return (
    <div className="inline-flex flex-col items-start gap-0.5" title={fullTitle} aria-label={fullAria}>
      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-semibold ${PRIO_TEXT[keyName]}`}>
        <span className="flex h-3.5 items-end gap-[2px]" aria-hidden>
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`w-[2.5px] rounded-[1px] ${n <= level ? bar : "bg-[#E4E4E7] dark:bg-[#273244]"}`}
              style={{ height: `${4 + n * 2.5}px` }}
            />
          ))}
        </span>
        {label}
        {escalada ? <ArrowUp className="size-3 shrink-0 opacity-80" strokeWidth={2.5} aria-hidden /> : null}
      </span>
      {abiertaLabel ? (
        <span
          className={`pl-[14px] text-[11px] font-medium tabular-nums ${
            abiertaOver72
              ? "text-[#B42323] dark:text-[#F87171]"
              : "text-[#71717A] dark:text-[#8EA0B8]"
          }`}
          aria-hidden
        >
          {abiertaLabel}
        </span>
      ) : null}
    </div>
  );
}

const muted = "text-[12px] text-[#71717A] dark:text-[#8EA0B8]";
const empty = "text-[13px] text-[#A1A1AA] dark:text-[#64748B]";

/* --------------------------------------------------------------------------
   Fila
   -------------------------------------------------------------------------- */

export type OrdenesTableHandlers = {
  onPdf: (orden: Orden) => void;
  onEnviarPdf: (orden: Orden) => void;
  onEdit?: (orden: Orden) => unknown;
  onDelete?: (orden: Orden) => void;
  onVerProblematica: (texto: string) => void;
  onVerServicios: (servicios: string[]) => void;
  onVerComentario: (texto: string) => void;
  /** Puede marcar/desmarcar "Liquidado" (solo en órdenes resueltas). */
  canLiquidar?: boolean;
  onToggleLiquidado?: (orden: Orden, next: boolean) => void;
};

type RowProps = {
  orden: Orden;
  folio: string;
  index: number;
  usuarios: Usuario[];
  selectedMonth: string;
  /** Vista admin: resalta las resueltas recientes. */
  admin: boolean;
} & OrdenesTableHandlers;

const td = "px-3 py-3 align-middle";
/* Columnas opcionales según el ancho de la tabla. */
const colFechas = "hidden @min-[50rem]:table-cell";
const colPrioridad = "hidden @min-[58rem]:table-cell";
const colDetalle = "hidden @min-[66rem]:table-cell";
const colRegistro = "hidden @min-[80rem]:table-cell";


const OrdenRow = memo(function OrdenRow({
  orden,
  folio,
  index,
  usuarios,
  selectedMonth,
  admin,
  onPdf,
  onEnviarPdf,
  onEdit,
  onDelete,
  onVerProblematica,
  onVerServicios,
  onVerComentario,
  canLiquidar,
  onToggleLiquidado,
}: RowProps) {
  const isResuelta = isOrdenResuelta(orden.status);
  const isCancelada = isOrdenCancelada(orden.status);
  const isTerminal = isResuelta || isCancelada;
  const tone = statusTone(orden.status);
  const prio = ordenPrioridadListBadge(orden);
  const prioTone = getOrdenPrioridadSectionStyles(prio.assignedKey);
  const recent = admin && isOrdenStatusChangeRecent(orden);
  const tecnico = tecnicoNombre(orden, usuarios);
  const servicios = Array.isArray(orden.servicios_realizados) ? orden.servicios_realizados : [];
  const problematica = String(orden.problematica || "").trim();
  const comentario = String(orden.comentario_tecnico || "").trim();
  const statusByName = resolveStatusChangedByName(orden.status_changed_by_full_name, orden.status_changed_by_username);
  const statusMotivo =
    orden.status === "pausado" && orden.motivo_pausa
      ? String(orden.motivo_pausa)
      : isCancelada && orden.motivo_cancelacion
        ? String(orden.motivo_cancelacion)
        : "";
  const inicio = orden.fecha_inicio || orden.fecha_creacion || "";
  const fin = orden.fecha_finalizacion || "";
  const levantamiento = String(orden.tipo_orden || "").toLowerCase() === "levantamiento";
  const hasAudit = Boolean(statusByName || orden.status_changed_at || orden.creado_por_username || orden.creado_por_full_name);

  const pill = (
    <span
      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-semibold ring-1 ring-inset ${tone.pill}`}
      title={statusMotivo || undefined}
    >
      <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden />
      {tone.label}
    </span>
  );

  const abierta = !isTerminal ? formatOrdenAbiertaDuracion(orden.fecha_creacion) : null;

  const prioridad = isTerminal ? null : (
    <PrioridadIndicator
      keyName={prio.assignedKey}
      label={prio.visibleLabel}
      bar={prioTone.dot}
      escalada={prio.escalada}
      title={prio.title}
      ariaLabel={prio.ariaLabel}
      abiertaLabel={abierta?.label ?? null}
      abiertaOver72={Boolean(abierta?.over72)}
    />
  );

  return (
    <tr
      className={`cot-rise group border-t border-[#F0F0F2] transition-colors duration-150 hover:bg-[#FAFAFB] dark:border-[#1F2A3C] dark:hover:bg-white/[0.02] ${
        recent ? "bg-[#F6FCF9] dark:bg-[#0F2A1C]/30" : ""
      }`}
      style={{ "--cot-i": Math.min(index, 10) } as CSSProperties}
    >
      {/* Orden: folio + cliente + ubicación */}
      <td className={`${td} pl-5`}>
        <div className="min-w-0 max-w-[18rem] @min-[80rem]:max-w-[20rem] @min-[104rem]:max-w-[30rem]">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className={folioText}>{folio}</span>
            {levantamiento ? (
              <span className="inline-flex h-[18px] items-center rounded-full bg-[#F4F4F5] px-1.5 text-[10.5px] font-semibold text-[#52525B] dark:bg-white/[0.06] dark:text-[#B7C1D1]">
                Levantamiento
              </span>
            ) : null}
            <OrdenArrastreBadge orden={orden} selectedMonth={selectedMonth} />
          </div>
          {onEdit ? (
            <button
              type="button"
              onClick={() => void onEdit(orden)}
              className={`mt-0.5 block max-w-full truncate rounded-[4px] text-left text-[14px] font-medium text-[#09090B] hover:text-[#1244D1] dark:text-[#F8FAFC] dark:hover:text-[#9BB6FF] ${focusRing}`}
              title={orden.cliente}
            >
              {orden.cliente || "Sin cliente"}
            </button>
          ) : (
            <p className="mt-0.5 truncate text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC]" title={orden.cliente}>
              {orden.cliente || "Sin cliente"}
            </p>
          )}
          <div className={`mt-0.5 flex min-w-0 items-center gap-2 ${muted}`}>
            {orden.cliente_direccion_etiqueta ? (
              <span className="min-w-0 truncate" title={orden.cliente_direccion_etiqueta}>
                {orden.cliente_direccion_etiqueta}
              </span>
            ) : null}
            {orden.direccion && isGoogleMapsUrl(orden.direccion) ? (
              <a
                href={orden.direccion}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex shrink-0 items-center gap-1 rounded-[4px] font-medium text-[#1B5CFF] hover:underline dark:text-[#7EA0FF] ${focusRing}`}
              >
                <MapPin className="size-3" aria-hidden />
                Ubicación
              </a>
            ) : orden.direccion && !orden.cliente_direccion_etiqueta ? (
              <span className="min-w-0 truncate" title={orden.direccion}>
                {orden.direccion}
              </span>
            ) : null}
          </div>
        </div>
      </td>

      {/* Técnico */}
      <td className={td}>
        {tecnico ? (
          <div className="flex min-w-0 max-w-[13rem] items-center gap-2">
            <TecnicoAvatar name={tecnico} url={orden.tecnico_asignado_avatar_url} />
            <span className="min-w-0 truncate text-[13px] text-[#3F3F46] dark:text-[#D6DEEA]" title={tecnico}>
              {tecnico}
            </span>
          </div>
        ) : (
          <span className={empty}>Sin asignar</span>
        )}
      </td>

      {/* Detalle: problemática, servicios y comentario se abren en su modal. */}
      <td className={`${td} ${colDetalle}`}>
        <div
          className="flex flex-col items-start"
          role="group"
          aria-label={`Detalle de ${folio}`}
        >
          <DetalleSegment
            icon={<ClipboardList aria-hidden />}
            label="Problemática"
            on={Boolean(problematica)}
            onClick={() => onVerProblematica(problematica)}
            ariaLabel={problematica ? "Ver problemática" : "Sin problemática registrada"}
          />
          <DetalleSegment
            icon={<Wrench aria-hidden />}
            label="Servicios"
            count={servicios.length}
            on={servicios.length > 0}
            onClick={() => onVerServicios(servicios)}
            ariaLabel={
              servicios.length
                ? `Ver ${servicios.length} ${servicios.length === 1 ? "servicio realizado" : "servicios realizados"}`
                : "Sin servicios realizados"
            }
          />
          <DetalleSegment
            icon={<MessageSquareText aria-hidden />}
            label="Comentario"
            on={Boolean(comentario)}
            onClick={() => onVerComentario(comentario)}
            ariaLabel={comentario ? "Ver comentario del técnico" : "Sin comentario del técnico"}
          />
        </div>
      </td>

      {/* Fechas */}
      <td className={`${td} ${colFechas}`}>
        <FechasCell inicio={inicio} hora={orden.hora_inicio} fin={fin} />
      </td>

      {/* Prioridad */}
      <td className={`${td} ${colPrioridad}`}>{prioridad ?? <span className={empty}>—</span>}</td>

      {/* Registro: quién creó y quién editó. */}
      <td className={`${td} ${colRegistro}`}>
        <div className="w-[11rem]">
          <RegistroCell orden={orden} />
        </div>
      </td>

      {/* Estado: la pastilla abre «Status colocado por». */}
      <td className={td}>
        <div className="flex flex-col items-start gap-1">
          {hasAudit ? (
            <StatusChangedByChip
              name={statusByName}
              at={orden.status_changed_at}
              avatarUrl={orden.status_changed_by_avatar_url}
              fallbackName={resolveOrdenStatusFallbackName(orden)}
              fallbackAt={orden.fecha_creacion}
              fallbackAvatarUrl={orden.creado_por_avatar_url}
            >
              {pill}
            </StatusChangedByChip>
          ) : (
            pill
          )}
          {isResuelta ? (
            <LiquidarControl
              liquidado={Boolean(orden.liquidado)}
              canLiquidar={Boolean(canLiquidar)}
              liquidadoPorNombre={orden.liquidado_por_full_name || orden.liquidado_por_username}
              liquidadoAt={orden.liquidado_at}
              onToggle={(next) => onToggleLiquidado?.(orden, next)}
            />
          ) : null}
          {recent ? (
            <span className="cot-pop text-[11.5px] font-semibold text-[#04724D] dark:text-[#86EFAC]">Resuelto recién</span>
          ) : prioridad ? (
            <span className="@min-[58rem]:hidden">{prioridad}</span>
          ) : null}
        </div>
      </td>

      {/* Acciones */}
      <td className={`${td} pr-5`}>
        <div className="flex items-center justify-end gap-1.5 opacity-80 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={() => onPdf(orden)}
            className={iconBtn}
            title={isResuelta ? "Descargar PDF" : "Ver PDF"}
            aria-label={`${isResuelta ? "Descargar" : "Ver"} PDF de ${folio}`}
          >
            <FileText aria-hidden />
          </button>
          {isResuelta && isOrdenServicioTecnico(orden.tipo_orden) ? (
            <button type="button" onClick={() => onEnviarPdf(orden)} className={iconBtn} title="Enviar por correo" aria-label={`Enviar PDF de ${folio} por correo`}>
              <Mail aria-hidden />
            </button>
          ) : null}
          {onEdit ? (
            <button type="button" onClick={() => void onEdit(orden)} className={iconBtn} title="Editar" aria-label={`Editar ${folio}`}>
              <Pencil aria-hidden />
            </button>
          ) : null}
          {onDelete ? (
            <button type="button" onClick={() => onDelete(orden)} className={iconBtnDanger} title="Eliminar" aria-label={`Eliminar ${folio}`}>
              <Trash2 aria-hidden />
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
});

/* --------------------------------------------------------------------------
   Tabla
   -------------------------------------------------------------------------- */

type Props = {
  sections: OrdenStatusSection<Orden>[];
  /** Posición de cada orden en el listado completo (folio de respaldo). */
  indexById: Map<number, number>;
  startIndex: number;
  usuarios: Usuario[];
  selectedMonth: string;
  admin: boolean;
  loading: boolean;
  empty: ReactNode;
} & OrdenesTableHandlers;

const th = "px-3 py-2.5 text-left text-[12px] font-medium text-[#71717A] dark:text-[#8EA0B8]";

/** Tabla agrupada por estado; va de borde a borde dentro de la tarjeta del listado. */
export function OrdenesTable({ sections, indexById, startIndex, usuarios, selectedMonth, admin, loading, empty: emptyState, ...handlers }: Props) {
  const colCount = 8;
  const total = sections.reduce((n, s) => n + s.ordenes.length, 0);
  let rowIndex = 0;

  return (
    <div className="@container overflow-x-auto overflow-y-hidden">
      <table className="w-full min-w-[44rem] table-auto border-collapse">
        <thead className="bg-[#FAFAFA] dark:bg-[#0F172A]">
          <tr>
            <th scope="col" className={`${th} min-w-[13rem] pl-5`}>Orden</th>
            <th scope="col" className={`${th} min-w-[9rem]`}>Técnico</th>
            <th scope="col" className={`${th} ${colDetalle} w-px whitespace-nowrap`}>Detalle</th>
            <th scope="col" className={`${th} ${colFechas} w-px whitespace-nowrap`}>Fechas</th>
            <th scope="col" className={`${th} ${colPrioridad} w-px whitespace-nowrap`}>Prioridad</th>
            <th scope="col" className={`${th} ${colRegistro} w-px whitespace-nowrap`}>Registro</th>
            <th scope="col" className={`${th} w-px whitespace-nowrap`}>Estado</th>
            <th scope="col" className={`${th} w-px pr-5 text-right`}>
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>

        {loading && total === 0 ? (
          <tbody aria-hidden>
            {Array.from({ length: 6 }, (_, i) => (
              <tr key={i} className="border-t border-[#F0F0F2] dark:border-[#1F2A3C]" style={{ opacity: 1 - i * 0.13 }}>
                <td colSpan={colCount} className="px-5 py-4">
                  <div className="flex items-center gap-6">
                    <div className="w-1/4 space-y-2">
                      <span className="block h-2.5 w-14 rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
                      <span className="block h-3.5 w-full rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
                    </div>
                    <span className="block size-7 rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
                    <span className="block h-3.5 w-1/6 rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
                    <span className="ml-auto block h-6 w-20 rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        ) : total === 0 ? (
          <tbody>
            <tr className="border-t border-[#F0F0F2] dark:border-[#1F2A3C]">
              <td colSpan={colCount} className="px-4">
                {emptyState}
              </td>
            </tr>
          </tbody>
        ) : (
          sections.map((section) => {
            const headingId = `ordenes-tabla-${section.key.toLowerCase()}`;
            return (
              <tbody key={section.key} aria-labelledby={headingId}>
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={colCount}
                    className="border-t border-[#F0F0F2] bg-white px-5 pb-1.5 pt-4 text-left dark:border-[#1F2A3C] dark:bg-[#111827]"
                  >
                    <span id={headingId} className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#52525B] dark:text-[#B7C1D1]">
                      <span className={`size-2 rounded-full ${SECTION_DOT[section.key]}`} aria-hidden />
                      {section.label}
                      <span className="rounded-full bg-[#F4F4F5] px-1.5 text-[11px] tabular-nums tracking-normal text-[#71717A] dark:bg-white/[0.06] dark:text-[#8EA0B8]">
                        {section.ordenes.length}
                      </span>
                    </span>
                  </th>
                </tr>
                {section.ordenes.map((orden, sectionIdx) => {
                  const idx = typeof orden.id === "number" && indexById.has(orden.id) ? (indexById.get(orden.id) as number) : sectionIdx;
                  return (
                    <OrdenRow
                      key={orden.id ?? `${section.key}-${sectionIdx}`}
                      orden={orden}
                      folio={displayOrdenFolio(orden, startIndex + idx + 1)}
                      index={rowIndex++}
                      usuarios={usuarios}
                      selectedMonth={selectedMonth}
                      admin={admin}
                      {...handlers}
                    />
                  );
                })}
              </tbody>
            );
          })
        )}
      </table>
    </div>
  );
}
