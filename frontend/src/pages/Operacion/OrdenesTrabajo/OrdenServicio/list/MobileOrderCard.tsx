import { OrdenViewModal } from "../../OrdenTrabajoModals";
import { useMemo, useState } from "react";
import { PencilIcon, TrashBinIcon, MailIcon } from "@/icons";
import { erpMobileCardClass } from "../ordenServicioStyles";
import {
  displayOrdenFolio,
  isOrdenCancelada,
  isOrdenResuelta,
  isOrdenServicioTecnico,
} from "../shared/useOrdenesShared";
import {
  isOrdenStatusChangeRecent,
  ORDEN_RECIEN_RESUELTA_BADGE_CLASS,
  ORDEN_RECIEN_RESUELTA_ROW_CLASS,
} from "../shared/ordenesPageUtils";
import { groupOrdenesByStatus } from "../shared/ordenStatusSections";
import {
  getOrdenPrioridadSectionStyles,
  ordenPrioridadEfectiva,
  ordenPrioridadEscalada,
  ordenPrioridadKey,
} from "../shared/ordenPrioridadSections";
import { OrdenStatusSectionHeader } from "./OrdenStatusSectionHeader";
import { OrdenArrastreBadge } from "./OrdenArrastreBadge";
import {
  StatusChangedByChip,
  resolveStatusChangedByName,
} from "../../../shared/StatusChangedByChip";

const isGoogleMapsUrl = (value: string | null | undefined): boolean => {
  if (!value) return false;
  const s = String(value).trim();
  if (!s) return false;
  if (!(s.startsWith("http://") || s.startsWith("https://"))) return false;
  try {
    const u = new URL(s);
    const host = (u.hostname || "").toLowerCase();
    const href = u.href.toLowerCase();
    if (host === "maps.app.goo.gl") return true;
    if (host.endsWith("google.com") && href.includes("/maps")) return true;
    return false;
  } catch {
    return false;
  }
};

/** 44×44 mínimo + gap ≥8px entre acciones (a11y táctil). */
const mobileActionBtnClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#E7E7EA] bg-white text-[#52525B] transition-colors active:bg-[#F4F4F5] hover:border-[#1B5CFF] hover:text-[#1B5CFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.3)] dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:hover:border-[#1B5CFF] dark:active:bg-[#1a2336]";

interface MobileOrderCardProps {
  // Listados livianos / otras pantallas no siempre traen el shape completo de Orden.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orden: any;
  idx: number;
  startIndex: number;
  formatDate: (date: string) => string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPdf: (orden: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEnviarPdf?: (orden: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEdit?: (orden: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onDelete?: (orden: any) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  tecnicoNombre?: string;
  notaPdf?: string;
  onNotaChange?: (ordenId: number, value: string) => void;
  /** Solo admin: resalte visual si el status cambió en las últimas 48h. */
  highlightRecentStatus?: boolean;
  /** Mes del listado (YYYY-MM) para marcar órdenes arrastradas. */
  selectedMonth?: string;
}

export function MobileOrderCard({
  orden,
  idx,
  startIndex,
  formatDate,
  onPdf,
  onEnviarPdf,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  tecnicoNombre,
  notaPdf = "",
  onNotaChange,
  highlightRecentStatus = false,
  selectedMonth = "",
}: MobileOrderCardProps) {
  const [showProblematicaModal, setShowProblematicaModal] = useState(false);
  const fechaInicio = orden.fecha_inicio || orden.fecha_creacion || "";
  const fechaInicioFmt = fechaInicio ? formatDate(fechaInicio) : "—";
  const fechaFinFmt = orden.fecha_finalizacion ? formatDate(orden.fecha_finalizacion) : "—";
  const showRecentResolved = highlightRecentStatus && isOrdenStatusChangeRecent(orden);
  const isResuelta = isOrdenResuelta(orden.status);
  const isCancelada = isOrdenCancelada(orden.status);
  const isTerminal = isResuelta || isCancelada;
  const prioKey = ordenPrioridadKey(
    isTerminal ? orden.prioridad_pool : ordenPrioridadEfectiva(orden),
  );
  const prioEscalada = !isTerminal && ordenPrioridadEscalada(orden);
  const prioTone = getOrdenPrioridadSectionStyles(prioKey);
  const prioLabel =
    prioKey === "ALTA" ? "Alta" : prioKey === "MEDIA" ? "Media" : prioKey === "BAJA" ? "Baja" : "Sin prioridad";
  const statusLabel =
    orden.status === "resuelto"
      ? "Resuelto"
      : orden.status === "pausado"
        ? "Pausado"
        : orden.status === "cancelada"
          ? "Cancelada"
          : "Pendiente";
  const statusByName = resolveStatusChangedByName(
    orden.status_changed_by_full_name,
    orden.status_changed_by_username,
  );
  const folioDisplay = displayOrdenFolio(orden, startIndex + idx + 1);
  const mapsUrl = isGoogleMapsUrl(orden.direccion) ? String(orden.direccion).trim() : null;
  const direccionTexto = !mapsUrl && orden.direccion ? String(orden.direccion).trim() : "";

  return (
    <article
      className={`${erpMobileCardClass} !p-3.5 ${showRecentResolved ? ORDEN_RECIEN_RESUELTA_ROW_CLASS : isTerminal ? "" : prioTone.rowAccent}`}
      aria-label={`Orden ${folioDisplay}, ${statusLabel}${isTerminal ? "" : `, prioridad ${prioLabel.toLowerCase()}`}${showRecentResolved ? ", resuelta recientemente" : ""}`}
    >
      {/* Cabecera: folio + chips (sin acciones; jerarquía contenido primero) */}
      <header className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <p className="min-w-0 text-[15px] font-bold leading-tight tracking-tight text-[#1B5CFF] dark:text-[#4B7CFF]">
            {folioDisplay}
          </p>
          {selectedMonth ? (
            <OrdenArrastreBadge
              orden={orden}
              selectedMonth={selectedMonth}
              layout="inline"
              className="shrink-0"
            />
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
              orden.status === "resuelto"
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                : orden.status === "pausado"
                  ? "bg-indigo-50 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300"
                  : orden.status === "cancelada"
                    ? "bg-rose-50 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300"
                    : "bg-amber-50 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200"
            }`}
            title={
              orden.status === "pausado" && orden.motivo_pausa
                ? String(orden.motivo_pausa)
                : orden.status === "cancelada" && orden.motivo_cancelacion
                  ? String(orden.motivo_cancelacion)
                  : undefined
            }
          >
            {statusLabel}
          </span>
          {!isTerminal && (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${prioTone.badge}`}
              title={
                prioEscalada
                  ? `Prioridad ${prioLabel} — escalada automáticamente por antigüedad (+72 h sin resolver)`
                  : `Prioridad: ${prioLabel}`
              }
            >
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${prioTone.dot}`} aria-hidden />
              {prioLabel}
              {prioEscalada && (
                <span className="font-bold leading-none" aria-hidden>
                  ↑
                </span>
              )}
            </span>
          )}
          {showRecentResolved && (
            <span className={ORDEN_RECIEN_RESUELTA_BADGE_CLASS}>
              <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M3.5 8.5 6.5 11.5 12.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Resuelto recién
            </span>
          )}
          {(statusByName ||
            orden.status_changed_at ||
            orden.creado_por_username ||
            orden.creado_por_full_name) && (
            <StatusChangedByChip
              name={statusByName}
              at={orden.status_changed_at}
              fallbackName={resolveStatusChangedByName(
                orden.creado_por_full_name,
                orden.creado_por_username,
              )}
            />
          )}
        </div>
      </header>

      {/* Cuerpo: cliente y contacto */}
      <div className="mt-3 min-w-0 space-y-2">
        <h3 className="truncate text-[15px] font-semibold leading-snug text-[#09090B] dark:text-white">
          {orden.cliente || "Sin cliente"}
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          {orden.telefono_cliente ? (
            <a
              href={`tel:${orden.telefono_cliente}`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#F4F6FF] px-2.5 py-1.5 text-[13px] font-medium text-[#1B5CFF] dark:bg-[#1B5CFF]/15 dark:text-[#93B0FF]"
            >
              <svg
                className="h-3.5 w-3.5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              {orden.telefono_cliente}
            </a>
          ) : null}
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#E7E7EA] bg-white px-2.5 py-1.5 text-[13px] font-medium text-[#09090B] dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#e5e7eb]"
            >
              <svg
                className="h-3.5 w-3.5 shrink-0 text-[#1B5CFF]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Abrir mapa
            </a>
          ) : null}
        </div>

        {direccionTexto ? (
          <p className="line-clamp-2 text-[12px] leading-snug text-[#52525B] dark:text-[#B7C1D1]">
            {direccionTexto}
          </p>
        ) : null}
      </div>

      {/* Meta: rejilla legible */}
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl bg-[#FAFAFA] px-3 py-2.5 text-[12px] dark:bg-[#0f172a]/70">
        <div className="min-w-0">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-[#8E8B82] dark:text-[#8ea0b8]">
            Inicio
          </dt>
          <dd className="mt-0.5 font-medium tabular-nums text-[#09090B] dark:text-[#e5e7eb]">{fechaInicioFmt}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-[#8E8B82] dark:text-[#8ea0b8]">
            Fin
          </dt>
          <dd className="mt-0.5 font-medium tabular-nums text-[#09090B] dark:text-[#e5e7eb]">{fechaFinFmt}</dd>
        </div>
        {tecnicoNombre ? (
          <div className="col-span-2 min-w-0 border-t border-[#E7E7EA] pt-2 dark:border-[#273244]">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-[#8E8B82] dark:text-[#8ea0b8]">
              Técnico
            </dt>
            <dd className="mt-0.5 truncate font-medium text-[#09090B] dark:text-[#e5e7eb]">{tecnicoNombre}</dd>
          </div>
        ) : null}
      </dl>

      {onNotaChange && (
        <div className="mt-3">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[#6E6E77] dark:text-[#8ea0b8]">
            Comentarios
          </label>
          <textarea
            value={notaPdf}
            onChange={(e) => onNotaChange(orden.id, e.target.value)}
            rows={2}
            placeholder="Escriba sus notas…"
            className="w-full min-h-[40px] resize-y rounded-lg border border-[#E7E7EA] bg-white px-2.5 py-2 text-[13px] text-[#09090B] outline-none placeholder:text-[#A1A1AA] focus:border-[#1B5CFF] focus:ring-2 focus:ring-[rgba(27,92,255,0.2)] dark:border-[#273244] dark:bg-[#0f172a]/60 dark:text-[#e5e7eb]"
          />
        </div>
      )}

      {/* Acciones al pie: no compiten con el contenido */}
      <footer className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#E7E7EA] pt-3 dark:border-[#273244]">
        <button type="button" onClick={() => onPdf(orden)} className={mobileActionBtnClass} aria-label="Descargar PDF">
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
          </svg>
        </button>
        {isOrdenResuelta(orden.status) && isOrdenServicioTecnico(orden.tipo_orden) && onEnviarPdf && (
          <button
            type="button"
            onClick={() => onEnviarPdf(orden)}
            className={mobileActionBtnClass}
            aria-label="Enviar PDF por correo"
          >
            <MailIcon className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowProblematicaModal(true)}
          className={mobileActionBtnClass}
          aria-label="Ver problemática"
        >
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        {canEdit && onEdit && (
          <button type="button" onClick={() => onEdit(orden)} className={mobileActionBtnClass} aria-label="Editar orden">
            <PencilIcon className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        )}
        {canDelete && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(orden)}
            className={`${mobileActionBtnClass} hover:border-rose-400 hover:text-rose-600`}
            aria-label="Eliminar orden"
          >
            <TrashBinIcon className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        )}
      </footer>

      <OrdenViewModal
        open={showProblematicaModal}
        onClose={() => setShowProblematicaModal(false)}
        title="Problemática"
        subtitle="Detalle reportado por el cliente"
      >
        <pre className="whitespace-pre-wrap break-words leading-relaxed rounded-xl border border-[#E7E7EA] bg-[#FAFAFA] p-3 text-[13px] dark:border-[#273244] dark:bg-[#0f172a]/60">
          {orden.problematica || "—"}
        </pre>
      </OrdenViewModal>
    </article>
  );
}

interface MobileOrderListProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ordenes: any[];
  startIndex: number;
  loading: boolean;
  formatDate: (date: string) => string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPdf: (orden: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEnviarPdf?: (orden: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEdit?: (orden: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onDelete?: (orden: any) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  usuarios?: any[];
  notasMesPdf?: Record<number, string>;
  onNotaChange?: (ordenId: number, value: string) => void;
  /** Si true (admin), resalta órdenes con status_changed_at reciente. */
  highlightRecentStatus?: boolean;
  /** Agrupa cards por status técnico (Pendientes → Pausados → Canceladas → Resueltas). */
  groupByStatus?: boolean;
  /** Mes del listado (YYYY-MM) para badge de arrastre. */
  selectedMonth?: string;
}

export function MobileOrderList({
  ordenes,
  startIndex,
  loading,
  formatDate,
  onPdf,
  onEnviarPdf,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  usuarios = [],
  notasMesPdf = {},
  onNotaChange,
  highlightRecentStatus = false,
  groupByStatus = false,
  selectedMonth = "",
}: MobileOrderListProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getTecnicoNombre = (orden: any): string => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tecnico = usuarios.find((u: any) => u.id === orden.tecnico_asignado);
    if (tecnico) {
      return tecnico.first_name && tecnico.last_name
        ? `${tecnico.first_name} ${tecnico.last_name}`
        : tecnico.username || tecnico.email;
    }
    if (orden.tecnico_asignado_full_name) return orden.tecnico_asignado_full_name;
    if (orden.tecnico_asignado_username) return orden.tecnico_asignado_username;
    if (orden.nombre_encargado) return orden.nombre_encargado;
    return "";
  };

  const sections = useMemo(
    () => (groupByStatus ? groupOrdenesByStatus(ordenes) : null),
    [groupByStatus, ordenes],
  );

  const indexById = useMemo(() => {
    const map = new Map<number, number>();
    ordenes.forEach((orden, idx) => {
      if (typeof orden?.id === "number") map.set(orden.id, idx);
    });
    return map;
  }, [ordenes]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderCard = (orden: any, idx: number) => (
    <MobileOrderCard
      key={orden.id ?? idx}
      orden={orden}
      idx={idx}
      startIndex={startIndex}
      formatDate={formatDate}
      onPdf={onPdf}
      onEnviarPdf={onEnviarPdf}
      onEdit={onEdit}
      onDelete={onDelete}
      canEdit={canEdit}
      canDelete={canDelete}
      tecnicoNombre={getTecnicoNombre(orden)}
      selectedMonth={selectedMonth}
      notaPdf={notasMesPdf[orden.id] ?? ""}
      onNotaChange={onNotaChange}
      highlightRecentStatus={highlightRecentStatus}
    />
  );

  return (
    <div className="space-y-2.5 md:hidden">
      {sections
        ? sections.map((section) => {
            const headingId = `ordenes-mobile-${section.key.toLowerCase()}`;
            return (
              <section key={section.key} aria-labelledby={headingId} className="space-y-2.5">
                <OrdenStatusSectionHeader
                  statusKey={section.key}
                  label={section.label}
                  count={section.ordenes.length}
                  headingId={headingId}
                  as="h2"
                />
                {section.ordenes.map((orden, sectionIdx) => {
                  const idx =
                    typeof orden?.id === "number" && indexById.has(orden.id)
                      ? (indexById.get(orden.id) as number)
                      : sectionIdx;
                  return renderCard(orden, idx);
                })}
              </section>
            );
          })
        : ordenes.map((orden, idx) => renderCard(orden, idx))}
      {!loading && ordenes.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#E7E7EA] px-4 py-8 text-center text-sm font-medium text-[#52525B] dark:border-[#273244] dark:text-[#B7C1D1]">
          Sin órdenes
        </div>
      )}
      {loading && ordenes.length === 0 && (
        <div className="py-8 text-center text-sm text-[#6E6E77] dark:text-[#8ea0b8]" role="status" aria-live="polite">
          Cargando órdenes…
        </div>
      )}
    </div>
  );
}
