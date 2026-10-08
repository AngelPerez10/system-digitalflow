import { formatEntero, formatMoneda } from "./dashboardMath";
import { useCountUp } from "./useCountUp";
import { eyebrowClass, panelCard } from "./ui";

export type HeroEstado = { label: string; value: number; hint: string; /** 0–1, barra dorada opcional. */ ratio?: number };

type Props = {
  nombre: string;
  fechaLarga: string;
  horaActualizacion: string;
  loading: boolean;
  year: number;
  montoAutorizadoAnio: number;
  autorizadas: number;
  tasaAutorizacion: number;
  estado: HeroEstado[];
};

function EstadoItem({ item, loading }: { item: HeroEstado; loading: boolean }) {
  const shown = useCountUp(loading ? 0 : item.value);
  return (
    <div className="min-w-0 bg-white px-4 py-3.5 dark:bg-[#111827] sm:px-5">
      <dt className={eyebrowClass}>{item.label}</dt>
      <dd className="mt-1.5 flex items-baseline gap-1.5">
        {loading ? (
          <span className="inline-block h-7 w-12 animate-pulse rounded-md bg-[#F4F4F5] dark:bg-white/6" />
        ) : (
          <span className="text-[22px] font-semibold leading-none tabular-nums tracking-[-0.4px] text-[#09090B] dark:text-[#F8FAFC]">
            <span aria-hidden>{formatEntero(shown)}</span>
            <span className="sr-only">{formatEntero(item.value)}</span>
          </span>
        )}
        <span className="truncate text-[12px] text-[#71717A] dark:text-[#8EA0B8]">{item.hint}</span>
      </dd>
      {item.ratio != null && (
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-[#E7E7EA] dark:bg-white/10" aria-hidden>
          <div
            className="cot-bar h-full w-full rounded-full bg-[#B7791F] dark:bg-[#E6A23C]"
            style={{ transform: `scaleX(${loading ? 0 : Math.max(0, Math.min(1, item.ratio))})` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Cabecera del panel: título, fecha y el monto autorizado del año.
 * Debajo, el estado de la operación en una franja, sin decoración de fondo.
 */
export function DashboardHero({
  nombre,
  fechaLarga,
  horaActualizacion,
  loading,
  year,
  montoAutorizadoAnio,
  autorizadas,
  tasaAutorizacion,
  estado,
}: Props) {
  const monto = useCountUp(loading ? 0 : montoAutorizadoAnio, 1100);
  return (
    <header className={`${panelCard} overflow-hidden`}>
      <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className={eyebrowClass}>{fechaLarga}</p>
          <h1
            tabIndex={-1}
            className="mt-1.5 text-[26px] font-semibold leading-tight tracking-[-0.5px] text-[#09090B] outline-none sm:text-[28px] dark:text-[#F8FAFC]"
          >
            Panel de control
          </h1>
          <p className="mt-1 text-[14px] leading-5 text-[#52525B] dark:text-[#B7C1D1]">
            {nombre ? `Hola, ${nombre}. ` : null}
            <span className="text-[#71717A] dark:text-[#8EA0B8]">Actualizado {horaActualizacion}</span>
          </p>
        </div>

        <div className="shrink-0 border-t border-[#E7E7EA] pt-4 dark:border-[#273244] lg:border-t-0 lg:pt-0 lg:text-right">
          <p className={eyebrowClass}>Autorizado en {year}</p>
          {loading ? (
            <span className="mt-2 inline-block h-8 w-40 animate-pulse rounded-md bg-[#F4F4F5] dark:bg-white/6" />
          ) : (
            <p className="mt-1 text-[28px] font-semibold leading-none tracking-[-0.7px] text-[#17235B] tabular-nums sm:text-[32px] dark:text-[#F8FAFC]">
              <span aria-hidden>{formatMoneda(monto, false)}</span>
              <span className="sr-only">{formatMoneda(montoAutorizadoAnio, false)}</span>
            </p>
          )}
          <p className="mt-1.5 text-[13px] text-[#52525B] dark:text-[#B7C1D1]">
            <span className="font-semibold tabular-nums text-[#B7791F] dark:text-[#E6A23C]">{formatEntero(autorizadas)}</span>
            {" "}cotizaciones autorizadas
            <span aria-hidden> · </span>
            <span className="font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">{Math.round(tasaAutorizacion)}%</span>
            {" "}de autorización
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-px border-t border-[#E7E7EA] bg-[#E7E7EA] dark:border-[#273244] dark:bg-[#273244] sm:grid-cols-4">
        {estado.map((item) => (
          <EstadoItem key={item.label} item={item} loading={loading} />
        ))}
      </dl>
    </header>
  );
}
