/**
 * Piezas del paso «Origen» del reporte de mantenimiento:
 *
 * - `ProyectoVacio`: estado sin proyecto con buscador, conteo de disponibles y
 *   los proyectos libres más recientes.
 * - `ProyectoVinculadoCard`: tarjeta clara del proyecto elegido (identidad,
 *   acciones compactas, datos clave en columnas y qué se tomó del proyecto).
 * - `ProyectoVinculadoResumen`: versión compacta para el paso «Datos del
 *   servicio».
 *
 * Movimiento (mantenimientoForm.css): la tarjeta «aterriza» al vincular (se
 * re-monta con `key` al cambiar de proyecto), los datos entran escalonados y el
 * ícono del estado vacío emite un aro breve. Solo transform/opacity; nada con
 * prefers-reduced-motion.
 */
import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Check, ChevronRight, FileText, FolderKanban, Info, Lock, RefreshCw, Search, X } from "lucide-react";
import "../../form/mantenimientoForm.css";
import { displayProyectoFolio } from "../../../Proyectos/shared/proyectoFormUtils";
import { formatFechaCorta, proyectoTiposLabels } from "../../../Proyectos/shared/proyectoListUtils";
import { AvatarStack, EstadoPill } from "../../../Proyectos/shared/ProyectoUi";
import { btn, btnSm, focusRing, iconBtn, iconBtnDanger } from "../../../Proyectos/shared/proyectoTokens";
import type { ProyectoRow } from "../../../Proyectos/shared/proyectoTypes";
import { titleCase } from "../../shared/texto";

const tecnicosDe = (p: ProyectoRow | null) => (p?.draft?.tecnicos ?? []).map((t) => ({ id: t.id, nombre: t.nombre, avatar_url: t.avatar_url }));
const inicioDe = (p: ProyectoRow | null) => p?.draft?.fechasInicio?.[0] || p?.fecha || "";

/* --------------------------------------------------------------------------
   Estado vacío
   -------------------------------------------------------------------------- */

export function ProyectoVacio({
  loading,
  total,
  disponibles,
  sugeridos,
  error,
  errorId,
  onOpenPicker,
  onPick,
}: {
  loading: boolean;
  total: number;
  disponibles: number;
  sugeridos: ProyectoRow[];
  error: string;
  errorId: string;
  onOpenPicker: () => void;
  onPick: (p: ProyectoRow) => void;
}) {
  const conReporte = Math.max(0, total - disponibles);
  return (
    <div className="space-y-5">
      <div
        className={`mf-land relative overflow-hidden rounded-[18px] border bg-[linear-gradient(180deg,#FAFBFF_0%,#FFFFFF_100%)] px-5 py-7 text-center dark:bg-[linear-gradient(180deg,#111A33_0%,#0F172A_100%)] sm:px-8 ${
          error ? "border-[#F0B4B4] dark:border-[#7F1D1D]" : "border-dashed border-[#D7E3FF] dark:border-[#2C3F7A]"
        }`}
      >
        <span
          className="mf-ring mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-[#17235B] text-[#E6A23C] shadow-[0_12px_24px_-12px_rgba(23,35,91,0.6)] dark:bg-[#1B2A63]"
          aria-hidden
        >
          <FolderKanban className="size-6" strokeWidth={1.8} />
        </span>
        <p className="mt-4 text-[17px] font-semibold tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">Vincula el proyecto del reporte</p>
        <p className="mx-auto mt-1 max-w-md text-[13.5px] leading-relaxed text-[#6E6E77] dark:text-[#8EA0B8]">
          Se toman su cliente, fecha de inicio y técnicos. Cada proyecto tiene un solo reporte de mantenimiento.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2" aria-live="polite">
          {loading ? (
            <span className="h-6 w-40 rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" aria-hidden />
          ) : (
            <>
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 text-[12px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                <Check className="size-3" strokeWidth={3} aria-hidden />
                {disponibles} {disponibles === 1 ? "disponible" : "disponibles"}
              </span>
              {conReporte > 0 ? (
                <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[#F4F4F5] px-2.5 text-[12px] font-semibold tabular-nums text-[#52525B] dark:bg-white/6 dark:text-[#B7C1D1]">
                  <Lock className="size-3" aria-hidden />
                  {conReporte} con reporte
                </span>
              ) : null}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenPicker}
          aria-haspopup="dialog"
          aria-describedby={error ? errorId : undefined}
          className={`mf-lift group mx-auto mt-5 flex min-h-12 w-full max-w-lg items-center gap-3 rounded-[14px] border border-[#E4E4E7] bg-white px-3.5 text-left shadow-[0_1px_2px_rgba(9,9,11,0.04)] hover:border-[#BFD3FF] hover:shadow-[0_10px_24px_-14px_rgba(27,92,255,0.5)] dark:border-[#273244] dark:bg-[#0F172A] dark:hover:border-[#4B7CFF]/60 ${focusRing}`}
        >
          <Search className="size-4.5 shrink-0 text-[#A1A1AA] group-hover:text-[#1B5CFF]" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-[14.5px] text-[#71717A] dark:text-[#8EA0B8]">Buscar por folio o cliente…</span>
          <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[9px] bg-[#1B5CFF] px-3 text-[13px] font-semibold text-white group-hover:bg-[#1244D1] dark:bg-[#4B7CFF]">
            Elegir
            <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
          </span>
        </button>
        {error ? (
          <p id={errorId} className="cot-fade mt-3 text-[13px] font-medium text-[#C22B2B] dark:text-[#F87171]" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {sugeridos.length > 0 ? (
        <section aria-labelledby={`${errorId}-recientes`}>
          <div className="mb-2.5 flex items-center justify-between gap-2 px-0.5">
            <h4 id={`${errorId}-recientes`} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]">
              Recientes disponibles
            </h4>
            <button type="button" onClick={onOpenPicker} className={`rounded-md text-[12.5px] font-semibold text-[#1B5CFF] hover:underline dark:text-[#7EA0FF] ${focusRing}`}>
              Ver todos
            </button>
          </div>
          <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {sugeridos.map((p, i) => {
              const tecnicos = tecnicosDe(p);
              return (
                <li key={p.id} className="cot-rise" style={{ "--cot-i": i } as CSSProperties}>
                  <button
                    type="button"
                    onClick={() => onPick(p)}
                    className={`mf-lift group flex h-full w-full flex-col gap-2 rounded-[14px] border border-[#E7E7EA] bg-white p-3.5 text-left hover:border-[#BFD3FF] hover:shadow-[0_12px_24px_-16px_rgba(27,92,255,0.45)] dark:border-[#273244] dark:bg-[#0F172A] dark:hover:border-[#4B7CFF]/50 ${focusRing}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[12.5px] font-semibold text-[#1244D1] dark:text-[#9BB6FF]">{displayProyectoFolio(p.folio)}</span>
                      <EstadoPill estado={p.estado} size="sm" className="shrink-0 whitespace-nowrap" />
                    </span>
                    <span className="line-clamp-2 text-[14px] font-semibold leading-snug text-[#09090B] dark:text-[#F8FAFC]">{p.cliente || "Sin cliente"}</span>
                    <span className="mt-auto flex items-center justify-between gap-2 pt-1 text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" aria-hidden />
                        {inicioDe(p) ? formatFechaCorta(inicioDe(p)) : "Sin fecha"}
                      </span>
                      {tecnicos.length > 0 ? (
                        <AvatarStack people={tecnicos} max={3} />
                      ) : (
                        <ChevronRight className="size-4 text-[#A1A1AA] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#1B5CFF] motion-reduce:transition-none" aria-hidden />
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Tarjeta del proyecto vinculado
   -------------------------------------------------------------------------- */

function Campo({ label, index, children, className = "" }: { label: string; index: number; children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`} style={{ "--mf-i": index } as CSSProperties}>
      <dt className="text-[12px] font-medium text-[#71717A] dark:text-[#8EA0B8]">{label}</dt>
      <dd className="mt-1 text-[14px] font-medium text-[#18181B] dark:text-[#E5E7EB]">{children}</dd>
    </div>
  );
}

export function ProyectoVinculadoCard({
  proyecto,
  folio,
  cliente,
  proyectoId,
  onChange,
  onRemove,
  onEditServicio,
}: {
  proyecto: ProyectoRow | null;
  folio: string;
  cliente: string;
  proyectoId: string;
  onChange: () => void;
  onRemove: () => void;
  /** Ir a «Datos del servicio» para ajustar fecha / técnicos tomados del proyecto. */
  onEditServicio?: () => void;
}) {
  const tecnicos = tecnicosDe(proyecto);
  const tipos = proyecto ? proyectoTiposLabels(proyecto) : [];
  const inicio = inicioDe(proyecto);
  const nombreCliente = titleCase(cliente) || "Sin cliente";
  const nombresEquipo = tecnicos.map((t) => titleCase(t.nombre)).filter(Boolean);

  return (
    <article
      key={proyectoId}
      className="mf-land overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-[0_1px_2px_rgba(9,9,11,0.04),0_12px_32px_-24px_rgba(9,9,11,0.28)] dark:border-[#273244] dark:bg-[#0F172A] dark:shadow-none"
      aria-label={`Proyecto vinculado ${folio}`}
    >
      {/* Encabezado: identidad del proyecto + acciones */}
      <header className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
        <div className="flex min-w-0 flex-1 items-start gap-3.5">
          <span className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#17235B] text-[#E6A23C] dark:bg-[#1B2A63]" aria-hidden>
            <FolderKanban className="size-5" strokeWidth={1.8} />
            <span className="absolute -bottom-1 -right-1 inline-flex size-[18px] items-center justify-center rounded-full bg-[#04724D] text-white ring-2 ring-white dark:bg-[#22A06B] dark:ring-[#0F172A]">
              <Check key={proyectoId} className="cot-tick size-2.5" strokeWidth={3.5} />
            </span>
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono text-[12.5px] font-semibold text-[#1244D1] dark:text-[#9BB6FF]">{folio || "—"}</span>
              {proyecto ? <EstadoPill estado={proyecto.estado} size="sm" /> : null}
            </div>
            <h4 className="mt-1 truncate text-[17px] font-semibold leading-snug tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]" title={cliente}>
              {nombreCliente}
            </h4>
            <p className="mt-0.5 text-[12.5px] text-[#71717A] dark:text-[#8EA0B8]">Proyecto vinculado a este reporte</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" className={`${btn.secondary} ${btnSm}`} onClick={onChange} aria-haspopup="dialog">
            <RefreshCw aria-hidden />
            Cambiar
          </button>
          <Link
            to={`/proyectos/${proyectoId}/pdf`}
            target="_blank"
            rel="noreferrer"
            className={`${iconBtn}`}
            aria-label={`Ver PDF del proyecto ${folio}`}
            title="Ver PDF del proyecto"
          >
            <FileText aria-hidden />
          </Link>
          <button type="button" className={iconBtnDanger} onClick={onRemove} aria-label={`Quitar el proyecto ${folio}`} title="Quitar proyecto">
            <X aria-hidden />
          </button>
        </div>
      </header>

      {/* Datos clave del proyecto */}
      <dl className="mf-stagger grid gap-x-6 gap-y-4 border-t border-[#F0F0F2] px-4 py-4 dark:border-[#1F2A3C] sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)_minmax(0,1.3fr)] sm:px-5">
        <Campo label="Inicio" index={0}>
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <CalendarDays className="size-4 text-[#A1A1AA]" aria-hidden />
            {inicio ? formatFechaCorta(inicio) : "Sin fecha"}
          </span>
        </Campo>
        <Campo label="Equipo" index={1}>
          {tecnicos.length > 0 ? (
            <span className="flex min-w-0 items-center gap-2">
              <AvatarStack people={tecnicos} max={3} />
              <span className="truncate" title={nombresEquipo.join(", ")}>
                {nombresEquipo[0]}
                {nombresEquipo.length > 1 ? <span className="text-[#71717A] dark:text-[#8EA0B8]"> +{nombresEquipo.length - 1}</span> : null}
              </span>
            </span>
          ) : (
            <span className="text-[#A1A1AA] dark:text-[#64748B]">Sin asignar</span>
          )}
        </Campo>
        <Campo label="Servicio" index={2}>
          {tipos.length > 0 ? (
            <span className="flex flex-wrap gap-1.5">
              {tipos.map((t) => (
                <span key={t} className="inline-flex h-6 items-center rounded-md bg-[#F4F4F5] px-2 text-[12px] font-medium text-[#3F3F46] dark:bg-white/6 dark:text-[#D6DEEA]">
                  {t}
                </span>
              ))}
            </span>
          ) : (
            <span className="text-[#A1A1AA] dark:text-[#64748B]">Sin definir</span>
          )}
        </Campo>
      </dl>

      {/* Qué se tomó del proyecto */}
      <footer className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[#F0F0F2] bg-[#FAFAFB] px-4 py-2.5 text-[12.5px] text-[#52525B] dark:border-[#1F2A3C] dark:bg-[#111827]/60 dark:text-[#B7C1D1] sm:px-5">
        <span className="inline-flex items-center gap-1.5">
          <Info className="size-3.5 text-[#1B5CFF] dark:text-[#7EA0FF]" aria-hidden />
          Fecha de servicio y técnicos se tomaron de este proyecto.
        </span>
        {onEditServicio ? (
          <button type="button" onClick={onEditServicio} className={`ml-auto inline-flex items-center gap-1 rounded-md font-semibold text-[#1B5CFF] hover:underline dark:text-[#7EA0FF] ${focusRing}`}>
            Ajustar
            <ArrowRight className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </footer>
    </article>
  );
}

/* --------------------------------------------------------------------------
   Resumen compacto (paso «Datos del servicio») y reportes antiguos de orden
   -------------------------------------------------------------------------- */

export function ProyectoVinculadoResumen({
  esProyecto,
  proyecto,
  folio,
  cliente,
  pdfHref,
  onChange,
}: {
  esProyecto: boolean;
  proyecto: ProyectoRow | null;
  folio: string;
  cliente: string;
  pdfHref: string;
  /** Ir al paso del origen para cambiarlo. */
  onChange?: () => void;
}) {
  const tecnicos = tecnicosDe(proyecto);
  const inicio = inicioDe(proyecto);
  return (
    <section
      key={folio}
      className="cot-fade flex flex-col gap-3 rounded-2xl border border-[#E4E4E7] bg-white p-4 shadow-[0_1px_2px_rgba(9,9,11,0.04)] dark:border-[#273244] dark:bg-[#111827] sm:flex-row sm:items-center sm:p-5"
      aria-label={esProyecto ? "Proyecto vinculado" : "Orden vinculada"}
    >
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#17235B] text-[#E6A23C] dark:bg-[#1B2A63]" aria-hidden>
        <FolderKanban className="size-5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]">{esProyecto ? "Proyecto vinculado" : "Orden vinculada"}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[13px] font-semibold text-[#1244D1] dark:text-[#9BB6FF]">{folio || "—"}</span>
          {proyecto ? <EstadoPill estado={proyecto.estado} size="sm" /> : null}
        </div>
        <p className="mt-0.5 truncate text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]" title={cliente}>
          {cliente || "Sin cliente"}
        </p>
        {proyecto ? (
          <p className="mt-1 flex flex-wrap items-center gap-3 text-[12.5px] text-[#71717A] dark:text-[#8EA0B8]">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" aria-hidden />
              {inicio ? formatFechaCorta(inicio) : "Sin fecha"}
            </span>
            {tecnicos.length > 0 ? <AvatarStack people={tecnicos} max={4} /> : null}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {onChange ? (
          <button type="button" className={`${btn.ghost} ${btnSm}`} onClick={onChange}>
            <RefreshCw aria-hidden />
            Cambiar
          </button>
        ) : null}
        <Link to={pdfHref} target="_blank" rel="noreferrer" className={`${btn.secondary} ${btnSm}`}>
          <FileText aria-hidden />
          {esProyecto ? "Ver PDF" : "Ver orden PDF"}
        </Link>
      </div>
    </section>
  );
}
