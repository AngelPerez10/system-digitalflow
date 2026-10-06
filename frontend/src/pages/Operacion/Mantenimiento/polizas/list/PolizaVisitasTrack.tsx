/**
 * Visitas de una póliza en una línea: puntos llenos (realizadas), anillo
 * (próxima) y huecos (pendientes), más «2 de 4 · próx. 12 oct · en 5 días».
 */
import { proximaVisita, todayIso, visitasRealizadas } from "../shared/polizaVisitas";
import { fechaRelativa, formatFechaCorta, formatPolizaFecha } from "./polizaEstado";

type Props = {
  visitas: string[];
  /** Compacto: sin la línea de detalle. */
  compact?: boolean;
};

export default function PolizaVisitasTrack({ visitas, compact = false }: Props) {
  const today = todayIso();
  const hechas = visitasRealizadas(visitas, today);
  const proxima = proximaVisita(visitas, today);
  const idxProxima = proxima ? visitas.indexOf(proxima) : -1;
  const resumen = visitas
    .map((v, i) => `Visita ${i + 1}: ${formatPolizaFecha(v)}${v < today ? " (realizada)" : ""}`)
    .join("; ");

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span role="img" className="flex items-center gap-1" aria-label={resumen}>
          {visitas.map((fecha, i) => {
            const hecha = fecha < today;
            const esProxima = i === idxProxima;
            return (
              <span
                key={`${fecha}-${i}`}
                title={`Visita ${i + 1} · ${formatPolizaFecha(fecha)}`}
                className={`size-2.5 rounded-full transition-colors ${
                  hecha
                    ? "bg-[#1B5CFF] dark:bg-[#4B7CFF]"
                    : esProxima
                      ? "bg-white ring-2 ring-[#1B5CFF] ring-offset-1 ring-offset-white dark:bg-[#111827] dark:ring-[#4B7CFF] dark:ring-offset-[#111827]"
                      : "bg-[#E4E4E7] dark:bg-[#2A3550]"
                }`}
              />
            );
          })}
        </span>
        <span className="text-[12.5px] font-medium tabular-nums text-[#52525B] dark:text-[#B7C1D1]">
          {hechas} de {visitas.length}
        </span>
      </div>
      {compact ? null : (
        <p className="mt-1 truncate text-[12.5px] text-[#6E6E77] dark:text-[#8EA0B8]">
          {proxima ? (
            <>
              Próx. <span className="font-medium text-[#09090B] dark:text-[#F8FAFC]">{formatFechaCorta(proxima, today)}</span>
              {" · "}
              {fechaRelativa(proxima, today)}
            </>
          ) : visitas.length ? (
            <>Última {formatFechaCorta(visitas[visitas.length - 1], today)}</>
          ) : (
            "Sin visitas"
          )}
        </p>
      )}
    </div>
  );
}
