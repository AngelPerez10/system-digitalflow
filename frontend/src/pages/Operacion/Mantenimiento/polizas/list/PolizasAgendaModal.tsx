/**
 * Agenda de visitas de pólizas en un modal.
 *
 * - Izquierda: calendario mensual (lunes primero) con puntos por visita; hoy
 *   con anillo; flechas para cambiar de mes y «Hoy» para volver.
 * - Derecha: sin día elegido, las próximas visitas en grupos (Hoy, Esta
 *   semana, Próxima semana, Más adelante); con un día elegido, solo ese día.
 * - Resumen arriba: visitas hoy, en 7 días y en 30 días.
 *
 * Movimiento: el mes entra desde el lado hacia donde se navega, el panel
 * derecho «aterriza» al cambiar de vista y las visitas entran escalonadas.
 * Solo transform/opacity; todo se apaga con prefers-reduced-motion.
 */
import { useMemo, useState, type CSSProperties } from "react";
import { CalendarCheck2, CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import "@/components/ui/modal-kit/motion.css";
import "../../form/mantenimientoForm.css";
import { erpModalSansStyle } from "../../../OrdenesTrabajo/ordenTrabajoStyles";
import { focusRing } from "../../../Proyectos/shared/proyectoTokens";
import { titleCase } from "../../shared/texto";
import { daysBetween, todayIso } from "../shared/polizaVisitas";
import { DIAS_PROXIMA_VISITA, fechaRelativa } from "./polizaEstado";
import { cuadriculaMes, gruposAgenda, shiftMes, urgencia, visitasEntre, visitasPorDia, type AgendaDia, type AgendaVisita } from "./polizaAgenda";
import type { PolizaRow } from "./polizaListTypes";

const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

const fechaLarga = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const s = new Date(y, m - 1, d).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const nombreMes = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const CHIP = {
  hoy: "bg-[#1B5CFF] text-white dark:bg-[#4B7CFF]",
  pronto: "bg-[rgba(230,162,60,0.16)] text-[#8A5D0F] dark:text-[#E6A23C]",
  normal: "bg-[#F4F4F5] text-[#52525B] dark:bg-white/6 dark:text-[#B7C1D1]",
  pasado: "bg-[#E9F8F0] text-[#04724D] dark:bg-[#0F2A1C] dark:text-[#4ADE80]",
} as const;
const DOT = {
  hoy: "bg-[#1B5CFF] dark:bg-[#4B7CFF]",
  pronto: "bg-[#E6A23C]",
  normal: "bg-[#E6A23C]",
  pasado: "bg-[#A1A1AA] dark:bg-[#64748B]",
} as const;

type Tono = keyof typeof CHIP;
const tonoDe = (fecha: string, today: string): Tono => (fecha < today ? "pasado" : urgencia(fecha, today));
const relativa = (fecha: string, today: string) => {
  const r = fechaRelativa(fecha, today);
  return r.charAt(0).toUpperCase() + r.slice(1);
};

/* --------------------------------------------------------------------------
   Visita (tarjeta)
   -------------------------------------------------------------------------- */

function VisitaCard({ v, tono, index, onOpen }: { v: AgendaVisita; tono: Tono; index: number; onOpen?: (row: PolizaRow) => void }) {
  const { row, numero, total } = v;
  return (
    <li className="cot-rise" style={{ "--cot-i": Math.min(index, 10) } as CSSProperties}>
      <button
        type="button"
        onClick={() => onOpen?.(row)}
        disabled={!onOpen}
        aria-label={`Abrir ${row.folio}, ${row.cliente}: visita ${numero} de ${total}`}
        className={`mf-lift group flex w-full min-w-0 items-center gap-3.5 rounded-[14px] border border-[#EDEDF0] bg-white px-4 py-3 text-left hover:border-[#BFD3FF] hover:shadow-[0_10px_24px_-16px_rgba(27,92,255,0.5)] disabled:cursor-default disabled:hover:border-[#EDEDF0] disabled:hover:shadow-none dark:border-[#1F2A3C] dark:bg-[#0F172A] dark:hover:border-[#4B7CFF]/50 ${focusRing}`}
      >
        <span className={`h-9 w-1 shrink-0 rounded-full ${DOT[tono]}`} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]" title={row.cliente}>
            {titleCase(row.cliente)}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-[#71717A] dark:text-[#8EA0B8]">
            <span className="font-mono font-semibold text-[#1244D1] dark:text-[#9BB6FF]">{row.folio}</span>
            {row.servicioTipo ? <span className="truncate">· {row.servicioTipo}</span> : null}
          </span>
        </span>
        <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
          <span className="text-[11.5px] font-medium tabular-nums text-[#71717A] dark:text-[#8EA0B8]">
            Visita {numero}/{total}
          </span>
          <span className="flex gap-0.5" aria-hidden>
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 w-3.5 rounded-full ${i < numero - 1 ? "bg-[#04724D] dark:bg-[#22A06B]" : i === numero - 1 ? DOT[tono] : "bg-[#E4E4E7] dark:bg-[#273244]"}`}
              />
            ))}
          </span>
        </span>
        {onOpen ? (
          <ChevronRight className="size-4 shrink-0 text-[#C4C4CA] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#1B5CFF] motion-reduce:transition-none" aria-hidden />
        ) : null}
      </button>
    </li>
  );
}

function DiaBloque({
  dia,
  today,
  startIndex,
  onOpen,
  conFecha = true,
}: {
  dia: AgendaDia;
  today: string;
  startIndex: number;
  onOpen?: (row: PolizaRow) => void;
  /** Con un día elegido la fecha ya está en el título: solo se muestra la cercanía. */
  conFecha?: boolean;
}) {
  const tono = tonoDe(dia.fecha, today);
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-2">
        {conFecha ? <span className="text-[13px] font-semibold text-[#27272A] dark:text-[#E5E7EB]">{fechaLarga(dia.fecha)}</span> : null}
        <span className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold ${CHIP[tono]}`}>{relativa(dia.fecha, today)}</span>
      </div>
      <ul className="space-y-2">
        {dia.visitas.map((v, i) => (
          <VisitaCard key={`${v.row.id}-${v.numero}`} v={v} tono={tono} index={startIndex + i} onOpen={onOpen} />
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Modal
   -------------------------------------------------------------------------- */

type Props = {
  open: boolean;
  onClose: () => void;
  rows: PolizaRow[];
  /** Sin permiso de edición no se pasa y las visitas quedan solo de lectura. */
  onOpen?: (row: PolizaRow) => void;
};

export default function PolizasAgendaModal({ open, onClose, rows, onOpen }: Props) {
  const today = todayIso();
  const mesHoy = today.slice(0, 7);
  const [mes, setMes] = useState(mesHoy);
  const [dir, setDir] = useState<"next" | "prev">("next");
  const [dia, setDia] = useState<string | null>(null);

  const grid = useMemo(() => cuadriculaMes(mes), [mes]);
  const porFecha = useMemo(() => visitasEntre(rows, grid[0], grid[41]), [rows, grid]);
  const proximas = useMemo(() => visitasPorDia(rows, today, DIAS_PROXIMA_VISITA), [rows, today]);
  const grupos = useMemo(() => gruposAgenda(proximas, today), [proximas, today]);

  const contar = (hasta: number) => proximas.filter((d) => (daysBetween(today, d.fecha) ?? 99) <= hasta).reduce((n, d) => n + d.visitas.length, 0);
  const stats = [
    { label: "Hoy", value: contar(0) },
    { label: "7 días", value: contar(7) },
    { label: `${DIAS_PROXIMA_VISITA} días`, value: contar(DIAS_PROXIMA_VISITA) },
  ];

  const irMes = (n: number) => {
    setDir(n > 0 ? "next" : "prev");
    setMes((m) => shiftMes(m, n));
  };
  const irHoy = () => {
    setDir(mes > mesHoy ? "prev" : "next");
    setMes(mesHoy);
    setDia(today);
  };
  const elegir = (fecha: string) => {
    if (fecha.slice(0, 7) !== mes) {
      setDir(fecha.slice(0, 7) > mes ? "next" : "prev");
      setMes(fecha.slice(0, 7));
    }
    setDia((d) => (d === fecha ? null : fecha));
  };
  const visitasDia = dia ? porFecha.get(dia) ?? visitasEntre(rows, dia, dia).get(dia) ?? [] : [];
  let idx = 0;

  return (
    <Modal
      mobileBottomSheet
      isOpen={open}
      onClose={onClose}
      closeOnEscape
      closeOnBackdropClick
      showCloseButton={false}
      ariaLabel="Agenda de visitas de pólizas"
      className="flex h-[min(92dvh,46rem)] w-full flex-col overflow-hidden rounded-t-[22px] border border-[#E7E7EA] bg-white! p-0 shadow-[0_32px_80px_-24px_rgba(9,9,11,0.45)] dark:border-[#273244] dark:bg-[#111827]! sm:w-[min(96vw,64rem)] sm:max-w-none sm:rounded-[22px]"
    >
      <div className="flex min-h-0 flex-1 flex-col" style={erpModalSansStyle}>
        {/* Encabezado */}
        <header className="relative flex shrink-0 flex-col gap-4 border-b border-[#F0F0F2] px-5 pb-4 pt-5 pr-16 dark:border-[#1F2A3C] sm:flex-row sm:items-center sm:justify-between sm:pl-6 sm:pr-[4.5rem]">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="cot-tick inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#17235B] text-[#E6A23C] dark:bg-[#1B2A63]" aria-hidden>
              <CalendarDays className="size-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]">Agenda de pólizas</p>
              <h2 className="text-[19px] font-semibold leading-tight tracking-[-0.4px] text-[#09090B] dark:text-[#F8FAFC]">Visitas de mantenimiento</h2>
            </div>
          </div>
          <dl className="flex shrink-0 gap-2">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="cot-rise min-w-[4.5rem] rounded-xl border border-[#EDEDF0] bg-[#FAFAFB] px-3 py-1.5 text-center dark:border-[#1F2A3C] dark:bg-[#0F172A]/60"
                style={{ "--cot-i": i } as CSSProperties}
              >
                <dt className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#71717A] dark:text-[#8EA0B8]">{s.label}</dt>
                <dd className="text-[17px] font-bold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">{s.value}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar agenda"
            className="cot-press absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-lg text-[#A1A1AA] hover:bg-[#F4F4F5] hover:text-[#3F3F46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:text-[#64748B] dark:hover:bg-[#1B2539] dark:hover:text-[#D6DEEA]"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Calendario */}
          <aside className="shrink-0 border-b border-[#F0F0F2] bg-[#FAFAFA] p-4 dark:border-[#1F2A3C] dark:bg-[#0B1220] lg:w-[22rem] lg:border-b-0 lg:border-r sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p key={mes} className="cot-fade text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]" aria-live="polite">
                {nombreMes(mes)}
              </p>
              <div className="flex items-center gap-1">
                <button type="button" onClick={irHoy} className={`h-8 rounded-lg px-2.5 text-[12.5px] font-semibold text-[#1B5CFF] hover:bg-[#EEF3FF] dark:text-[#7EA0FF] dark:hover:bg-[#1B2A63]/50 ${focusRing}`}>
                  Hoy
                </button>
                <button type="button" onClick={() => irMes(-1)} aria-label="Mes anterior" className={`cot-press inline-flex size-8 items-center justify-center rounded-lg text-[#52525B] hover:bg-white dark:text-[#B7C1D1] dark:hover:bg-white/6 ${focusRing}`}>
                  <ChevronLeft className="size-4" aria-hidden />
                </button>
                <button type="button" onClick={() => irMes(1)} aria-label="Mes siguiente" className={`cot-press inline-flex size-8 items-center justify-center rounded-lg text-[#52525B] hover:bg-white dark:text-[#B7C1D1] dark:hover:bg-white/6 ${focusRing}`}>
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center" aria-hidden>
              {DIAS_SEMANA.map((d) => (
                <span key={d} className="pb-1.5 text-[11px] font-semibold text-[#A1A1AA] dark:text-[#64748B]">
                  {d}
                </span>
              ))}
            </div>
            <div className="mf-panels overflow-hidden" data-dir={dir}>
              <div key={mes} className="mf-panel grid grid-cols-7 gap-y-1" role="grid" aria-label={nombreMes(mes)}>
                {grid.map((fecha) => {
                  const enMes = fecha.slice(0, 7) === mes;
                  const n = porFecha.get(fecha)?.length ?? 0;
                  const esHoy = fecha === today;
                  const activo = fecha === dia;
                  const tono = tonoDe(fecha, today);
                  return (
                    <button
                      key={fecha}
                      type="button"
                      role="gridcell"
                      aria-selected={activo}
                      aria-label={`${fechaLarga(fecha)}: ${n} ${n === 1 ? "visita" : "visitas"}`}
                      onClick={() => elegir(fecha)}
                      className={`cot-press mx-auto flex size-10 flex-col items-center justify-center rounded-xl text-[13px] tabular-nums ${focusRing} ${
                        activo
                          ? "bg-[#17235B] font-semibold text-white shadow-[0_8px_16px_-10px_rgba(23,35,91,0.8)] dark:bg-[#2A3D8F]"
                          : esHoy
                            ? "font-semibold text-[#1B5CFF] ring-2 ring-inset ring-[#1B5CFF] dark:text-[#7EA0FF] dark:ring-[#4B7CFF]"
                            : n > 0
                              ? "font-semibold text-[#09090B] hover:bg-white dark:text-[#F8FAFC] dark:hover:bg-white/6"
                              : enMes
                                ? "text-[#52525B] hover:bg-white dark:text-[#B7C1D1] dark:hover:bg-white/6"
                                : "text-[#C4C4CA] hover:bg-white/60 dark:text-[#3E4B63]"
                      }`}
                    >
                      {Number(fecha.slice(8, 10))}
                      <span className="mt-0.5 flex h-1.5 gap-0.5" aria-hidden>
                        {Array.from({ length: Math.min(n, 3) }, (_, k) => (
                          <span key={k} className={`size-1.5 rounded-full ${activo ? "bg-[#E6A23C]" : DOT[tono]}`} />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-[#ECECEF] pt-3 text-[11.5px] text-[#71717A] dark:border-[#1F2A3C] dark:text-[#8EA0B8]">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#1B5CFF] dark:bg-[#4B7CFF]" aria-hidden /> Hoy
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#E6A23C]" aria-hidden /> Programada
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#A1A1AA]" aria-hidden /> Realizada
              </span>
            </div>
          </aside>

          {/* Visitas */}
          <section className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#F7F7F8] px-4 py-5 dark:bg-[#0F172A]/60 sm:px-6" aria-live="polite">
            <div key={dia ?? "proximas"} className="mf-land">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]">{dia ? "Día elegido" : "Próximas visitas"}</p>
                  <h3 className="text-[17px] font-semibold tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">
                    {dia ? fechaLarga(dia) : `Siguientes ${DIAS_PROXIMA_VISITA} días`}
                  </h3>
                </div>
                {dia ? (
                  <button
                    type="button"
                    onClick={() => setDia(null)}
                    className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-white px-3 text-[12.5px] font-semibold text-[#3F3F46] ring-1 ring-[#E4E4E7] hover:bg-[#FAFAFA] dark:bg-[#111827] dark:text-[#D6DEEA] dark:ring-[#273244] ${focusRing}`}
                  >
                    <X className="size-3.5" aria-hidden />
                    Ver próximas
                  </button>
                ) : null}
              </div>

              {dia ? (
                visitasDia.length > 0 ? (
                  <DiaBloque dia={{ fecha: dia, visitas: visitasDia }} today={today} startIndex={0} onOpen={onOpen} conFecha={false} />
                ) : (
                  <Vacio titulo="Sin visitas este día" texto="Elige otro día con puntos en el calendario." />
                )
              ) : grupos.length === 0 ? (
                <Vacio titulo="Sin visitas próximas" texto={`No hay mantenimientos en los próximos ${DIAS_PROXIMA_VISITA} días. Navega el calendario para ver otros meses.`} />
              ) : (
                grupos.map((g) => (
                  <section key={g.id} aria-label={g.label} className="mb-2">
                    <h4 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]">
                      {g.label}
                      <span className="h-px flex-1 bg-[#E4E4E7] dark:bg-[#1F2A3C]" aria-hidden />
                    </h4>
                    {g.dias.map((d) => {
                      const start = idx;
                      idx += d.visitas.length;
                      return <DiaBloque key={d.fecha} dia={d} today={today} startIndex={start} onOpen={onOpen} />;
                    })}
                  </section>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </Modal>
  );
}

function Vacio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="cot-fade flex flex-col items-center px-4 py-12 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-[#E9F8F0] text-[#04724D] dark:bg-[#0F2A1C] dark:text-[#4ADE80]" aria-hidden>
        <CalendarCheck2 className="size-6" />
      </span>
      <p className="mt-3 text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{titulo}</p>
      <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-[#71717A] dark:text-[#8EA0B8]">{texto}</p>
    </div>
  );
}
