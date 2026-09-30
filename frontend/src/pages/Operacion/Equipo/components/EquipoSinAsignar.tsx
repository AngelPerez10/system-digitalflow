/**
 * «Sin asignar»: botón con contador que abre una mesa de despacho con todos los
 * trabajos abiertos del MES ACTUAL que aún no tienen técnico (sin importar la
 * semana que se esté viendo).
 *
 * Dos paneles: a la izquierda la cola (azul marino, agrupada por día); a la
 * derecha el detalle del trabajo elegido y, debajo, dos pasos: técnico y día.
 * Un solo botón asigna y pasa al siguiente, así que se puede despachar toda la
 * cola sin cerrar nada. Usa el mismo flujo de `onMove` que el arrastre: queda
 * en el Historial y se puede deshacer. En móvil se ve un panel a la vez.
 *
 * Diseño: paleta sobria (marino + neutros, un solo acento azul) y movimiento
 * discreto: solo `transform`/`opacity` y transiciones de color de 150 ms
 * (`eq-row-in` y `cot-*` ya respetan `prefers-reduced-motion`).
 */
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCheck, ChevronLeft, ChevronRight, ClipboardList, Clock, FolderKanban, Inbox, MapPin, Package, Wrench, X } from "lucide-react";
import { erpSansStyle } from "../../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import { focusRing } from "../../Proyectos/shared/proyectoTokens";
import type { EquipoDestino, EquipoMoveRequest } from "../shared/equipoDnd";
import { infoOrden, infoProyecto } from "../shared/equipoInfo";
import type { EquipoPendiente } from "../shared/equipoPendientes";
import { DIAS_CORTOS, DIAS_LARGOS, addDays, diaSemana, parseYmd, toYmd } from "../shared/equipoSemana";
import { TIPO_TONE, toolbarBadge, toolbarBtn } from "../shared/equipoTokens";
import { EquipoAvatar } from "./EquipoUi";

const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

type Filtro = "todo" | "orden" | "proyecto";
type Info = ReturnType<typeof infoOrden>;

const darkFocus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B93FF]/60";

function nombreMes(mes: string): string {
  const [y, m] = mes.split("-");
  return `${MESES_LARGOS[Number(m) - 1] ?? mes} ${y}`;
}

function infoDe(p: EquipoPendiente): Info {
  return p.kind === "orden" ? infoOrden(p.orden, true) : infoProyecto(p.row, null);
}

function diaCorto(ymd: string): string {
  const d = parseYmd(ymd);
  return d ? `${DIAS_CORTOS[diaSemana(ymd)]} ${d.getDate()} ${MESES_CORTOS[d.getMonth()]}` : ymd;
}

/* ─────────────── Cola (panel izquierdo, siempre marino) ─────────────── */

const FilaCola = memo(function FilaCola({ p, i, activo, onSelect }: { p: EquipoPendiente; i: number; activo: boolean; onSelect: (key: string) => void }) {
  const d = useMemo(() => infoDe(p), [p]);
  const sub = d.horario || d.servicios[0] || [d.sucursal, d.direccion].filter(Boolean).join(" · ");
  const Icono = p.kind === "orden" ? ClipboardList : FolderKanban;
  return (
    <button
      type="button"
      role="option"
      aria-selected={activo}
      data-key={p.key}
      tabIndex={activo ? 0 : -1}
      onClick={() => onSelect(p.key)}
      style={{ "--eq-i": Math.min(i, 10) } as CSSProperties}
      className={`eq-row-in relative flex w-full items-start gap-3 rounded-[10px] px-3.5 py-3 text-left transition-colors duration-150 hover:bg-white/[0.05] ${darkFocus} ${activo ? "bg-white/[0.09]" : ""}`}
    >
      <span
        className={`absolute bottom-3 left-0 top-3 w-[3px] origin-center rounded-full bg-[#6B93FF] transition-transform duration-200 ease-out ${activo ? "scale-y-100" : "scale-y-0"}`}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[#8E9BB8]">
          <Icono className="size-3.5" aria-label={TIPO_TONE[p.kind].label} />
          <span className="truncate font-mono text-[11.5px] font-medium">{d.folio}</span>
        </span>
        <span className="mt-1 block truncate text-[14px] font-semibold tracking-[-0.005em] text-[#F5F7FB]">{d.cliente}</span>
        {sub ? <span className="mt-0.5 block truncate text-[12px] text-[#7F8DAB]">{sub}</span> : null}
      </span>
      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${d.estadoDot}`} title={d.estadoLabel} aria-hidden />
      <ChevronRight className="mt-0.5 size-4 shrink-0 text-[#51608A] md:hidden" aria-hidden />
    </button>
  );
});

/* ─────────────── Detalle (panel derecho) ─────────────── */

function Dato({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 border-t border-[#E8EBF0] pt-3 dark:border-[#1F2A3C]">
      <dt className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#8A93A6] dark:text-[#7F8DAB]">
        <span className="[&>svg]:size-3.5" aria-hidden>
          {icon}
        </span>
        {label}
      </dt>
      <dd className="mt-1.5 text-[13.5px] leading-[1.5] text-[#0B1530] dark:text-[#E2E8F0]">{children}</dd>
    </div>
  );
}

function Paso({ n, titulo, nota, children }: { n: number; titulo: string; nota?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="inline-flex size-5 items-center justify-center rounded-full border border-[#CBD2DF] text-[11px] font-semibold tabular-nums text-[#5B6478] dark:border-[#3A4661] dark:text-[#9AA7C2]" aria-hidden>
          {n}
        </span>
        <h3 className="text-[13px] font-semibold tracking-[-0.005em] text-[#0B1530] dark:text-[#F8FAFC]">{titulo}</h3>
        {nota ? <span className="ml-auto truncate text-[12px] text-[#8A93A6] dark:text-[#7F8DAB]">{nota}</span> : null}
      </div>
      {children}
    </section>
  );
}

/** Calendario mensual para elegir el día de trabajo (cualquier día del mes, y de meses vecinos). */
function CalendarioDia({ value, original, hoy, onChange }: { value: string; original: string; hoy: string; onChange: (ymd: string) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [vista, setVista] = useState(() => (value || original).slice(0, 7));

  // Si el día elegido cae en otro mes (otro trabajo, flechas del teclado), la vista lo sigue.
  useEffect(() => {
    if (value) setVista(value.slice(0, 7));
  }, [value]);

  const [y, m] = vista.split("-").map(Number);
  const celdas = useMemo(() => {
    const primero = new Date(y, m - 1, 1);
    const offset = (primero.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => toYmd(new Date(y, m - 1, 1 - offset + i)));
  }, [y, m]);

  const irMes = (delta: number) => setVista(toYmd(new Date(y, m - 1 + delta, 1)).slice(0, 7));

  const mover = (e: React.KeyboardEvent) => {
    const paso = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" ? -7 : e.key === "ArrowDown" ? 7 : 0;
    if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      irMes(e.key === "PageUp" ? -1 : 1);
      return;
    }
    if (!paso) return;
    e.preventDefault();
    const next = addDays(value, paso);
    onChange(next);
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>(`[data-ymd="${next}"]`)?.focus());
  };

  const enVista = celdas.includes(value);
  const flecha = `inline-flex size-9 items-center justify-center rounded-full text-[#5B6478] transition-colors duration-150 hover:bg-[#F1F3F7] hover:text-[#0B1530] dark:text-[#9AA7C2] dark:hover:bg-white/6 dark:hover:text-white ${focusRing}`;

  return (
    <div className="rounded-[14px] border border-[#E4E7EC] p-3 dark:border-[#273244]">
      <div className="flex items-center gap-1 pb-2">
        <p className="min-w-0 flex-1 pl-1 text-[14px] font-semibold capitalize tracking-[-0.01em] text-[#0B1530] dark:text-[#F8FAFC]" aria-live="polite">
          {MESES_LARGOS[m - 1]} {y}
        </p>
        <button type="button" onClick={() => irMes(-1)} aria-label="Mes anterior" className={flecha}>
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <button type="button" onClick={() => irMes(1)} aria-label="Mes siguiente" className={flecha}>
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-7 pb-1" aria-hidden>
        {DIAS_CORTOS.map((d) => (
          <span key={d} className="py-1 text-center text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#8A93A6] dark:text-[#7F8DAB]">
            {d.slice(0, 2)}
          </span>
        ))}
      </div>

      <div ref={ref} role="grid" aria-label="Día de trabajo" onKeyDown={mover} className="grid grid-cols-7 gap-y-1">
        {celdas.map((ymd, i) => {
          const d = parseYmd(ymd);
          const fuera = d?.getMonth() !== m - 1;
          const activo = ymd === value;
          const esHoy = ymd === hoy;
          const esOriginal = ymd === original;
          const finde = i % 7 >= 5;
          return (
            <button
              key={ymd}
              type="button"
              role="gridcell"
              data-ymd={ymd}
              aria-selected={activo}
              aria-current={esHoy ? "date" : undefined}
              tabIndex={activo || (!enVista && ymd === `${vista}-01`) ? 0 : -1}
              aria-label={d ? `${DIAS_LARGOS[diaSemana(ymd)]} ${d.getDate()} de ${MESES_LARGOS[d.getMonth()]}${esHoy ? ", hoy" : ""}${esOriginal ? ", fecha original" : ""}` : ymd}
              onClick={() => onChange(ymd)}
              className={`relative mx-auto inline-flex size-10 items-center justify-center rounded-[11px] text-[13.5px] tabular-nums transition-[background-color,color,box-shadow] duration-150 sm:size-11 ${
                activo
                  ? "bg-[#0B1530] font-semibold text-white dark:bg-[#4B7CFF]"
                  : `${esOriginal ? "shadow-[inset_0_0_0_1.5px_#9AA7C2] dark:shadow-[inset_0_0_0_1.5px_#4B5A7A] " : ""}hover:bg-[#F1F3F7] dark:hover:bg-white/6 ${
                      fuera
                        ? "text-[#C3C9D6] dark:text-[#475569]"
                        : finde
                          ? "font-medium text-[#8A93A6] dark:text-[#8EA0B8]"
                          : "font-medium text-[#0B1530] dark:text-[#E2E8F0]"
                    }`
              } ${focusRing}`}
            >
              {d?.getDate()}
              {esHoy ? <span className={`absolute bottom-1 size-1 rounded-full ${activo ? "bg-white" : "bg-[#1B5CFF] dark:bg-[#6B93FF]"}`} aria-hidden /> : null}
            </button>
          );
        })}
      </div>

      <p className="mt-3 flex items-center gap-4 border-t border-[#EDEFF3] pt-2.5 text-[11.5px] text-[#8A93A6] dark:border-[#1F2A3C] dark:text-[#7F8DAB]">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-[#1B5CFF] dark:bg-[#6B93FF]" aria-hidden />
          Hoy
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3.5 rounded-[5px] shadow-[inset_0_0_0_1.5px_#9AA7C2] dark:shadow-[inset_0_0_0_1.5px_#4B5A7A]" aria-hidden />
          Fecha original
        </span>
        <button
          type="button"
          onClick={() => onChange(original)}
          disabled={value === original}
          className={`ml-auto rounded-md px-1.5 py-0.5 font-semibold text-[#1244D1] transition-opacity hover:underline disabled:pointer-events-none disabled:opacity-0 dark:text-[#9BB6FF] ${focusRing}`}
        >
          Restablecer
        </button>
      </p>
    </div>
  );
}

/* ─────────────── Componente principal ─────────────── */

export function EquipoSinAsignar({
  pendientes,
  mes,
  destinos,
  onAssign,
}: {
  pendientes: EquipoPendiente[];
  /** Mes mostrado (`YYYY-MM`): el actual. */
  mes: string;
  destinos: EquipoDestino[];
  onAssign: (req: EquipoMoveRequest) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("todo");
  const [selKey, setSelKey] = useState<string | null>(null);
  const [tecnico, setTecnico] = useState("");
  const [fecha, setFecha] = useState("");
  const [detalleMovil, setDetalleMovil] = useState(false);
  const listaRef = useRef<HTMLDivElement | null>(null);

  const tecnicos = useMemo(() => destinos.filter((d) => d.id != null), [destinos]);
  const n = pendientes.length;
  const hoy = useMemo(() => toYmd(new Date()), []);
  const atrasados = useMemo(() => pendientes.filter((p) => p.fecha < hoy).length, [pendientes, hoy]);
  const ordenes = useMemo(() => pendientes.filter((p) => p.kind === "orden").length, [pendientes]);

  const visibles = useMemo(() => pendientes.filter((p) => filtro === "todo" || p.kind === filtro), [pendientes, filtro]);
  const indice = useMemo(() => new Map(visibles.map((p, i) => [p.key, i])), [visibles]);
  const dias = useMemo(() => {
    const map = new Map<string, EquipoPendiente[]>();
    for (const p of visibles) {
      const list = map.get(p.fecha);
      if (list) list.push(p);
      else map.set(p.fecha, [p]);
    }
    return [...map.entries()];
  }, [visibles]);

  const sel = visibles.find((p) => p.key === selKey) ?? visibles[0] ?? null;
  const selInfo = useMemo(() => (sel ? infoDe(sel) : null), [sel]);
  const dest = tecnicos.find((t) => t.key === tecnico);
  const selClave = sel?.key ?? null;
  const fechaSel = fecha || sel?.fecha || "";

  // Al cambiar de trabajo, el día vuelve al suyo; el técnico se conserva para despachar en serie.
  useEffect(() => {
    if (sel) setFecha(sel.fecha);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selClave]);

  useEffect(() => {
    if (!open) return;
    setDetalleMovil(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const elegirTrabajo = (key: string) => {
    setSelKey(key);
    setDetalleMovil(true);
  };

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const i = visibles.findIndex((p) => p.key === sel?.key);
    const next = visibles[Math.min(visibles.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))];
    if (!next) return;
    setSelKey(next.key);
    requestAnimationFrame(() => listaRef.current?.querySelector<HTMLElement>(`[data-key="${next.key}"]`)?.focus());
  };

  const asignar = () => {
    if (!sel || !dest) return;
    const i = visibles.findIndex((p) => p.key === sel.key);
    const siguiente = visibles[i + 1] ?? visibles[i - 1] ?? null;
    onAssign({ kind: sel.kind, id: sel.id, fromId: null, toId: dest.id, fromFecha: sel.fecha, toFecha: fechaSel });
    setSelKey(siguiente?.key ?? null);
    setDetalleMovil(false);
  };

  const tabs: { key: Filtro; label: string; count: number }[] = [
    { key: "todo", label: "Todos", count: n },
    { key: "orden", label: "Órdenes", count: ordenes },
    { key: "proyecto", label: "Proyectos", count: n - ordenes },
  ];

  const cerrarBtn = (cls: string) => (
    <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className={`cot-press inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ${cls}`}>
      <X className="size-[18px]" aria-hidden />
    </button>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Sin asignar en ${nombreMes(mes)}: ${n} ${n === 1 ? "trabajo" : "trabajos"}`}
        title={`Sin asignar · ${nombreMes(mes)}`}
        className={`${toolbarBtn(open, "amber")} min-w-0 flex-1 sm:flex-none`}
      >
        <Inbox className={n > 0 ? "text-[#B7791F] dark:text-[#F2C27A]" : ""} aria-hidden />
        <span className="hidden sm:inline">Sin asignar</span>
        {n > 0 ? (
          <span key={n} className={toolbarBadge.amber} aria-hidden>
            {n}
          </span>
        ) : null}
      </button>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-[100000] flex items-stretch justify-center md:items-center md:p-6" style={erpSansStyle}>
              <div className="cot-fade absolute inset-0 bg-[#050A18]/60 dark:bg-black/70" onClick={() => setOpen(false)} aria-hidden />
              <div
                role="dialog"
                aria-modal="true"
                aria-label={`Trabajos sin asignar de ${nombreMes(mes)}`}
                className="cot-pop relative flex h-full w-full flex-col overflow-hidden bg-white shadow-[0_40px_90px_-24px_rgba(5,10,24,0.65)] md:h-[min(47rem,calc(100dvh-3rem))] md:max-w-[64rem] md:flex-row md:rounded-[20px] dark:bg-[#111827] md:dark:ring-1 md:dark:ring-[#273244]"
              >
                {/* ───── Cola ───── */}
                <div className={`${detalleMovil ? "hidden md:flex" : "flex"} min-h-0 flex-1 flex-col bg-[#0B1530] md:w-[22rem] md:flex-none dark:bg-[#0A1020]`}>
                  <div className="px-5 pt-5">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7F8DAB]">Sin asignar</p>
                        <p className="mt-1.5 flex items-baseline gap-2">
                          <span className="text-[34px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-white">{n}</span>
                          <span className="text-[13px] text-[#9AA7C2]">{n === 1 ? "trabajo" : "trabajos"} sin técnico</span>
                        </p>
                        <p className="mt-2 truncate text-[12px] text-[#7F8DAB]">
                          <span className="capitalize">{nombreMes(mes)}</span>
                          {atrasados > 0 ? <span className="font-semibold text-[#FF9C93]"> · {atrasados} atrasados</span> : null}
                        </p>
                      </div>
                      {cerrarBtn(`text-[#9AA7C2] hover:bg-white/8 hover:text-white md:hidden ${darkFocus}`)}
                    </div>

                    <div className="mt-5 flex gap-5 border-b border-white/10" role="tablist" aria-label="Tipo de trabajo">
                      {tabs.map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          role="tab"
                          aria-selected={filtro === t.key}
                          onClick={() => setFiltro(t.key)}
                          className={`relative -mb-px inline-flex h-10 items-center gap-1.5 border-b-2 text-[12.5px] font-semibold transition-colors duration-150 ${
                            filtro === t.key ? "border-[#6B93FF] text-white" : "border-transparent text-[#7F8DAB] hover:text-[#C9D2E6]"
                          } ${darkFocus}`}
                        >
                          {t.label}
                          <span className="text-[11px] tabular-nums opacity-60">{t.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div ref={listaRef} role="listbox" aria-label="Trabajos sin asignar" onKeyDown={onListKey} className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-2.5 pb-4">
                    {dias.length === 0 ? (
                      <p className="px-4 py-14 text-center text-[13px] text-[#7F8DAB]">Nada en esta vista.</p>
                    ) : (
                      dias.map(([f, lista]) => (
                        <div key={f} role="group" aria-label={diaCorto(f)} className="pt-3">
                          <p className="sticky top-0 z-[1] flex items-center gap-2 bg-[#0B1530]/95 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#7F8DAB] dark:bg-[#0A1020]/95">
                            <span className={f === hoy ? "text-[#9DB8FF]" : ""}>{f === hoy ? `Hoy · ${diaCorto(f)}` : diaCorto(f)}</span>
                            {f < hoy ? <span className="text-[#FF9C93]">· Atrasado</span> : null}
                            <span className="ml-auto tabular-nums">{lista.length}</span>
                          </p>
                          <div className="space-y-0.5">
                            {lista.map((p) => (
                              <FilaCola key={p.key} p={p} i={indice.get(p.key) ?? 0} activo={p.key === sel?.key} onSelect={elegirTrabajo} />
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* ───── Detalle + asignación ───── */}
                <div className={`${detalleMovil ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-1 flex-col overflow-hidden`}>
                  {sel && selInfo ? (
                    <>
                      <div className="flex items-center gap-2.5 border-b border-[#E8EBF0] px-4 py-3 md:px-7 dark:border-[#1F2A3C]">
                        <button
                          type="button"
                          onClick={() => setDetalleMovil(false)}
                          aria-label="Volver a la lista"
                          className={`cot-press inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[#5B6478] hover:bg-[#F1F3F7] md:hidden dark:text-[#B7C1D1] dark:hover:bg-white/6 ${focusRing}`}
                        >
                          <ArrowLeft className="size-[18px]" aria-hidden />
                        </button>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8A93A6] dark:text-[#7F8DAB]">
                          {sel.kind === "orden" ? <ClipboardList className="size-3.5" aria-hidden /> : <FolderKanban className="size-3.5" aria-hidden />}
                          {TIPO_TONE[sel.kind].label}
                        </span>
                        <span className="truncate font-mono text-[12.5px] font-medium text-[#0B1530] dark:text-[#E2E8F0]">{selInfo.folio}</span>
                        <span className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold ring-1 ring-inset ${selInfo.estadoPill}`}>
                          <span className={`size-1.5 rounded-full ${selInfo.estadoDot}`} aria-hidden />
                          {selInfo.estadoLabel}
                        </span>
                        <span className="ml-auto" />
                        {cerrarBtn(`text-[#8A93A6] hover:bg-[#F1F3F7] hover:text-[#0B1530] dark:text-[#8EA0B8] dark:hover:bg-white/6 dark:hover:text-white ${focusRing}`)}
                      </div>

                      <div key={sel.key} className="eq-row-in custom-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-8 pt-6 md:px-7">
                        <h3 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.025em] text-[#0B1530] dark:text-[#F8FAFC]">{selInfo.cliente}</h3>
                        <p className="mt-1.5 text-[13px] text-[#5B6478] dark:text-[#9AA7C2]">
                          Programado para <span className="font-semibold text-[#0B1530] dark:text-[#E2E8F0]">{diaCorto(sel.fecha)}</span>
                          {sel.fecha < hoy ? <span className="font-semibold text-[#C0362C] dark:text-[#FF9C93]"> · atrasado</span> : null}
                        </p>

                        <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                          {selInfo.sucursal || selInfo.direccion ? (
                            <Dato icon={<MapPin />} label="Lugar">
                              {selInfo.sucursal ? <span className="block font-semibold">{selInfo.sucursal}</span> : null}
                              {selInfo.direccion ? <span className="line-clamp-2 text-[#5B6478] dark:text-[#9AA7C2]">{selInfo.direccion}</span> : null}
                            </Dato>
                          ) : null}
                          {selInfo.horario ? (
                            <Dato icon={<Clock />} label="Horario">
                              {selInfo.horario}
                            </Dato>
                          ) : null}
                          {selInfo.servicios.length > 0 ? (
                            <Dato icon={<Wrench />} label="Servicios">
                              {selInfo.servicios.join(" · ")}
                            </Dato>
                          ) : null}
                          {selInfo.equipos ? (
                            <Dato icon={<Package />} label="Equipos">
                              <span className="tabular-nums">
                                {selInfo.equipos.instalados} de {selInfo.equipos.total} instalados
                              </span>
                            </Dato>
                          ) : null}
                        </dl>

                        {selInfo.detalle ? (
                          <div className="mt-5 border-l-2 border-[#C9A24A] bg-[#F7F8FA] py-2.5 pl-3.5 pr-3 dark:bg-white/[0.03]">
                            <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#8A6A1F] dark:text-[#E2C27A]">
                              <AlertTriangle className="size-3.5" aria-hidden />
                              {selInfo.detalleLabel}
                            </p>
                            <p className="mt-1 text-[13px] leading-[1.55] text-[#3B4459] dark:text-[#D6DEEA]">{selInfo.detalle}</p>
                          </div>
                        ) : null}

                        <Paso n={1} titulo="Técnico responsable" nota={tecnicos.length === 0 ? "No hay técnicos disponibles" : undefined}>
                          <div role="radiogroup" aria-label="Técnico" className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 lg:grid-cols-3">
                            {tecnicos.map((t) => {
                              const activo = t.key === tecnico;
                              return (
                                <button
                                  key={t.key}
                                  type="button"
                                  role="radio"
                                  aria-checked={activo}
                                  onClick={() => setTecnico(activo ? "" : t.key)}
                                  className={`flex min-h-[3.5rem] items-center gap-3 rounded-[12px] border px-3 py-2 text-left transition-[background-color,border-color,box-shadow] duration-150 ${
                                    activo
                                      ? "border-[#1B5CFF] bg-[#F4F7FF] shadow-[0_0_0_1px_#1B5CFF] dark:border-[#4B7CFF] dark:bg-[#4B7CFF]/10 dark:shadow-[0_0_0_1px_#4B7CFF]"
                                      : "border-[#E4E7EC] bg-white hover:border-[#9AA7C2] dark:border-[#273244] dark:bg-transparent dark:hover:border-[#4B5A7A]"
                                  } ${focusRing}`}
                                >
                                  <EquipoAvatar id={t.id} nombre={t.nombre} avatarUrl={t.avatarUrl} size="lg" />
                                  <span className="min-w-0 flex-1 text-[13px] font-semibold leading-tight text-[#0B1530] dark:text-[#E2E8F0]">
                                    <span className="line-clamp-2">{t.nombre}</span>
                                  </span>
                                  <span
                                    className={`inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color] duration-150 ${
                                      activo ? "border-[#1B5CFF] bg-[#1B5CFF] dark:border-[#4B7CFF] dark:bg-[#4B7CFF]" : "border-[#CBD2DF] dark:border-[#3A4661]"
                                    }`}
                                    aria-hidden
                                  >
                                    <Check className={`size-3 text-white transition-[opacity,transform] duration-150 ${activo ? "scale-100 opacity-100" : "scale-50 opacity-0"}`} strokeWidth={3} />
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </Paso>

                        <Paso n={2} titulo="Día de trabajo" nota={diaCorto(fechaSel)}>
                          <CalendarioDia value={fechaSel} original={sel.fecha} hoy={hoy} onChange={setFecha} />
                        </Paso>
                      </div>

                      <div className="flex items-center gap-4 border-t border-[#E8EBF0] bg-[#FAFBFC] px-4 py-3.5 md:px-7 dark:border-[#1F2A3C] dark:bg-[#0F172A]">
                        <div key={dest?.key ?? "none"} className="eq-row-in flex min-w-0 flex-1 items-center gap-3">
                          {dest ? <EquipoAvatar id={dest.id} nombre={dest.nombre} avatarUrl={dest.avatarUrl} size="md" /> : null}
                          <p className="min-w-0 text-[12.5px] leading-tight text-[#5B6478] dark:text-[#9AA7C2]">
                            {dest ? (
                              <>
                                <span className="block truncate text-[13px] font-semibold text-[#0B1530] dark:text-[#F8FAFC]">{dest.nombre}</span>
                                <span className="mt-0.5 block truncate">{diaCorto(fechaSel)}</span>
                              </>
                            ) : (
                              "Elige un técnico para continuar"
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={!dest}
                          onClick={asignar}
                          className={`cot-press group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[12px] bg-[#0B1530] px-6 text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-[#16244D] disabled:cursor-not-allowed disabled:bg-[#E4E7EC] disabled:text-[#A7AFBF] dark:bg-[#4B7CFF] dark:hover:bg-[#3B6BEE] dark:disabled:bg-[#1B2539] dark:disabled:text-[#64748B] ${focusRing}`}
                        >
                          Asignar
                          <ArrowRight className="size-4 transition-transform duration-150 group-enabled:group-hover:translate-x-0.5" aria-hidden />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-end px-4 py-3">{cerrarBtn(`text-[#8A93A6] hover:bg-[#F1F3F7] hover:text-[#0B1530] dark:text-[#8EA0B8] dark:hover:bg-white/6 dark:hover:text-white ${focusRing}`)}</div>
                      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 pb-16 text-center">
                        <span className="inline-flex size-14 items-center justify-center rounded-full border border-[#E4E7EC] text-[#0B1530] dark:border-[#273244] dark:text-[#E2E8F0]" aria-hidden>
                          <CheckCheck className="size-6" />
                        </span>
                        <p className="mt-2 text-[18px] font-semibold tracking-[-0.015em] text-[#0B1530] dark:text-[#F8FAFC]">Todo asignado</p>
                        <p className="max-w-xs text-[13px] text-[#5B6478] dark:text-[#9AA7C2]">No quedan trabajos sin técnico en {nombreMes(mes)}.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
