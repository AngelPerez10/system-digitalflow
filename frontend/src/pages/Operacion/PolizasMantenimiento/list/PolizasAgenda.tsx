/**
 * Agenda: visitas de los próximos 30 días agrupadas por día. Un día con varias
 * visitas (misma póliza o distintas) se ve de un vistazo con su contador.
 */
import { memo, useMemo, type CSSProperties } from "react";
import { CalendarDays } from "lucide-react";
import { daysBetween, todayIso } from "../shared/polizaVisitas";
import { polCardClass } from "../shared/polizaStyles";
import { DIAS_PROXIMA_VISITA, diaSemanaCorto, fechaRelativa, mesCorto } from "./polizaEstado";
import type { PolizaRow } from "./polizaListTypes";

type Visita = { row: PolizaRow; numero: number };
type Dia = { fecha: string; visitas: Visita[] };

const MAX_DIAS = 6;

function agruparPorDia(rows: PolizaRow[], today: string): Dia[] {
  const porFecha = new Map<string, Visita[]>();
  for (const row of rows) {
    row.visitas.forEach((fecha, i) => {
      const delta = daysBetween(today, fecha);
      if (delta == null || delta < 0 || delta > DIAS_PROXIMA_VISITA) return;
      const lista = porFecha.get(fecha) ?? [];
      lista.push({ row, numero: i + 1 });
      porFecha.set(fecha, lista);
    });
  }
  return [...porFecha.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, visitas]) => ({ fecha, visitas }));
}

type Props = {
  rows: PolizaRow[];
  loading: boolean;
  onOpen: (row: PolizaRow) => void;
};

function PolizasAgenda({ rows, loading, onOpen }: Props) {
  const today = todayIso();
  const dias = useMemo(() => agruparPorDia(rows, today), [rows, today]);
  const visibles = dias.slice(0, MAX_DIAS);
  const totalVisitas = dias.reduce((acc, d) => acc + d.visitas.length, 0);

  return (
    <section className={`${polCardClass} overflow-hidden`} aria-labelledby="polizas-agenda-titulo">
      <header className="flex items-center justify-between gap-3 border-b border-[#E7E7EA] px-5 py-4 dark:border-[#273244]">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-8 items-center justify-center rounded-[10px] bg-[rgba(230,162,60,0.14)] text-[#9A6B15] dark:text-[#E6A23C]">
            <CalendarDays className="size-4" aria-hidden />
          </span>
          <div>
            <h2 id="polizas-agenda-titulo" className="text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
              Agenda
            </h2>
            <p className="text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">Próximos {DIAS_PROXIMA_VISITA} días</p>
          </div>
        </div>
        {!loading && totalVisitas > 0 ? (
          <span className="rounded-full bg-[#F4F4F5] px-2.5 py-1 text-[12px] font-semibold tabular-nums text-[#3F3F46] dark:bg-white/[0.06] dark:text-[#CBD5E1]">
            {totalVisitas} {totalVisitas === 1 ? "visita" : "visitas"}
          </span>
        ) : null}
      </header>

      {loading ? (
        <div className="space-y-3 p-5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <span className="h-12 w-11 animate-pulse rounded-[12px] bg-[#F4F4F5] dark:bg-[#1B2539]" />
              <span className="flex-1 space-y-2 pt-1">
                <span className="block h-3 w-3/4 animate-pulse rounded bg-[#F4F4F5] dark:bg-[#1B2539]" />
                <span className="block h-3 w-1/2 animate-pulse rounded bg-[#F4F4F5] dark:bg-[#1B2539]" />
              </span>
            </div>
          ))}
        </div>
      ) : visibles.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-[14px] font-medium text-[#3F3F46] dark:text-[#CBD5E1]">Sin visitas próximas</p>
          <p className="mt-1 text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">
            Aquí aparecerán los mantenimientos de los próximos {DIAS_PROXIMA_VISITA} días.
          </p>
        </div>
      ) : (
        <ol className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]">
          {visibles.map((dia, i) => {
            const esHoy = dia.fecha === today;
            const [, , d] = dia.fecha.split("-");
            return (
              <li
                key={dia.fecha}
                className="cot-rise flex gap-3.5 px-5 py-3.5"
                style={{ "--cot-i": Math.min(i, 6) } as CSSProperties}
              >
                <span
                  className={`flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-[12px] leading-none ${
                    esHoy
                      ? "bg-[#1B5CFF] text-white dark:bg-[#4B7CFF]"
                      : "bg-[#F4F4F5] text-[#09090B] dark:bg-[#1B2539] dark:text-[#F8FAFC]"
                  }`}
                  aria-hidden
                >
                  <span className={`text-[10px] font-semibold uppercase ${esHoy ? "text-white/80" : "text-[#6E6E77] dark:text-[#8EA0B8]"}`}>
                    {mesCorto(dia.fecha)}
                  </span>
                  <span className="mt-0.5 text-[18px] font-bold tabular-nums">{Number(d)}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[12px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]">
                    <span className="capitalize">
                      {diaSemanaCorto(dia.fecha)} · {fechaRelativa(dia.fecha, today)}
                    </span>
                    {dia.visitas.length > 1 ? (
                      <span className="rounded-full bg-[rgba(230,162,60,0.16)] px-2 py-0.5 text-[11px] font-semibold text-[#8A5D0F] dark:text-[#E6A23C]">
                        {dia.visitas.length} visitas
                      </span>
                    ) : null}
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {dia.visitas.map(({ row, numero }) => (
                      <li key={`${row.id}-${numero}`}>
                        <button
                          type="button"
                          onClick={() => onOpen(row)}
                          aria-label={`Abrir ${row.folio}, ${row.cliente}: visita ${numero} de ${row.visitas.length}`}
                          className="group -mx-1.5 flex w-[calc(100%+0.75rem)] min-w-0 items-baseline gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-[#F4F4F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:hover:bg-white/[0.05]"
                        >
                          <span className="shrink-0 font-mono text-[12px] font-semibold text-[#1244D1] dark:text-[#9BB6FF]">
                            {row.folio}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[13.5px] text-[#09090B] dark:text-[#F8FAFC]">
                            {row.cliente}
                          </span>
                          <span className="shrink-0 text-[11.5px] tabular-nums text-[#6E6E77] dark:text-[#8EA0B8]">
                            {numero}/{row.visitas.length}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {!loading && dias.length > MAX_DIAS ? (
        <p className="border-t border-[#E7E7EA] px-5 py-3 text-[12.5px] text-[#6E6E77] dark:border-[#273244] dark:text-[#8EA0B8]">
          +{dias.length - MAX_DIAS} {dias.length - MAX_DIAS === 1 ? "día más" : "días más"} con visitas. Filtra por
          «Próxima visita» para verlas todas.
        </p>
      ) : null}
    </section>
  );
}

export default memo(PolizasAgenda);
