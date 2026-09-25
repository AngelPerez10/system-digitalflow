/**
 * Planificación de la póliza, en dos pasos claros:
 *
 *  1. «¿Cuántas visitas al año?» — tarjetas 1 · 2 · 3 · 4 visitas o Libre.
 *  2. Con un número: solo se elige el primer mantenimiento y el calendario del
 *     año se genera solo (visitas parejas). Con Libre: cada fecha a mano, hasta
 *     4, y se permite repetir el mismo día.
 *
 * Fechas en dd/mm/aaaa (flatpickr «d/m/Y»); por dentro se manejan en ISO.
 * Movimiento: el contenido del paso 2 entra con `cot-fade` al cambiar de plan y
 * las visitas generadas con `cot-rise` escalonado (solo transform/opacity).
 */
import { useId, useRef, useState, type CSSProperties } from "react";
import {
  CalendarCheck2,
  CalendarDays,
  CalendarPlus,
  PencilLine,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import DatePicker from "@/components/form/date-picker";
import {
  detectarPlan,
  MAX_VISITAS,
  mesesEntreVisitas,
  visitasProgramadas,
  type PlanVisitas,
} from "../shared/polizaVisitas";
import { polErrorClass } from "../shared/polizaStyles";
import { diaSemanaCorto, formatPolizaFecha } from "../list/polizaEstado";

type Props = {
  initial: string[];
  onChange: (visitas: string[]) => void;
  error?: string;
  /** id del contenedor, para llevar el foco aquí cuando hay errores. */
  id?: string;
};

type Item = { uid: number; fecha: string };

const PLANES: { id: PlanVisitas; titulo: string; detalle: string; icon?: LucideIcon }[] = [
  { id: 1, titulo: "1 visita", detalle: "Una al año" },
  { id: 2, titulo: "2 visitas", detalle: "Cada 6 meses" },
  { id: 3, titulo: "3 visitas", detalle: "Cada 4 meses" },
  { id: 4, titulo: "4 visitas", detalle: "Cada 3 meses" },
  { id: "libre", titulo: "Libre", detalle: "Tú eliges las fechas", icon: PencilLine },
];

/** Date de flatpickr → YYYY-MM-DD (hora local). */
function toIso(d: Date | undefined): string {
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const labelClass = "mb-2 flex items-center gap-2 text-[13.5px] font-semibold text-[#09090B] dark:text-[#F8FAFC]";

export default function PolizaPlanificacion({ initial, onChange, error, id }: Props) {
  const baseId = useId().replace(/:/g, "");
  const inicial = initial.filter(Boolean);
  const [plan, setPlan] = useState<PlanVisitas>(() => (inicial.length ? detectarPlan(inicial) : 3));
  const [inicio, setInicio] = useState(inicial[0] || "");
  const [items, setItems] = useState<Item[]>(() =>
    (initial.length ? initial : [""]).map((fecha, uid) => ({ uid, fecha })),
  );
  const nextUid = useRef(MAX_VISITAS);
  const pickerId = (key: string | number) => `poliza-plan-${baseId}-${key}`;

  const programadas = plan === "libre" ? [] : visitasProgramadas(inicio, plan);

  const elegirPlan = (next: PlanVisitas) => {
    setPlan(next);
    if (next === "libre") {
      // Arranca con lo que ya había (las fechas generadas o la de inicio).
      const base = programadas.length ? programadas : inicio ? [inicio] : [""];
      const nuevos = base.map((fecha, i) => ({ uid: nextUid.current + i, fecha }));
      nextUid.current += base.length;
      setItems(nuevos);
      onChange(nuevos.map((i) => i.fecha));
    } else {
      const inicioPlan = inicio || items.find((i) => i.fecha)?.fecha || "";
      setInicio(inicioPlan);
      onChange(inicioPlan ? visitasProgramadas(inicioPlan, next) : [""]);
    }
  };

  const cambiarInicio = (fecha: string) => {
    setInicio(fecha);
    if (plan !== "libre") onChange(fecha ? visitasProgramadas(fecha, plan) : [""]);
  };

  const commitItems = (next: Item[]) => {
    setItems(next);
    onChange(next.map((i) => i.fecha));
  };

  const agregar = () => {
    if (items.length >= MAX_VISITAS) return;
    const item: Item = { uid: nextUid.current++, fecha: "" };
    commitItems([...items, item]);
    window.requestAnimationFrame(() => document.getElementById(pickerId(item.uid))?.click());
  };

  const quitar = (uid: number) => {
    if (items.length === 1) commitItems([{ ...items[0], fecha: "" }]);
    else commitItems(items.filter((i) => i.uid !== uid));
  };

  const errorVisible = error && plan !== "libre" && !inicio ? "Elige la fecha del primer mantenimiento." : error;

  return (
    <div id={id} className="scroll-mt-6 space-y-6">
      {/* 1 · Cuántas visitas */}
      <fieldset>
        <legend className={labelClass}>
          <CalendarDays className="size-4 text-[#1B5CFF] dark:text-[#4B7CFF]" aria-hidden />
          ¿Cuántas visitas al año?
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {PLANES.map((p) => {
            const on = plan === p.id;
            const Icon = p.icon;
            return (
              <label key={p.id} className={`block cursor-pointer ${p.id === "libre" ? "col-span-2 sm:col-span-1" : ""}`}>
                <input
                  type="radio"
                  name={`${baseId}-plan`}
                  className="peer sr-only"
                  checked={on}
                  onChange={() => elegirPlan(p.id)}
                />
                <span
                  className={`cot-press flex h-full min-h-[5.5rem] flex-col justify-between rounded-[14px] border p-3 peer-focus-visible:ring-4 peer-focus-visible:ring-[rgba(27,92,255,0.22)] ${
                    on
                      ? "border-[#1B5CFF] bg-[rgba(27,92,255,0.05)] shadow-[0_0_0_1px_#1B5CFF] dark:border-[#4B7CFF] dark:bg-[rgba(75,124,255,0.1)] dark:shadow-[0_0_0_1px_#4B7CFF]"
                      : "border-[#E7E7EA] bg-white hover:border-[#C9CEDA] dark:border-[#273244] dark:bg-[#111827] dark:hover:border-[#3A4661]"
                  }`}
                >
                  {Icon ? (
                    <Icon
                      className={`size-[18px] ${on ? "text-[#1B5CFF] dark:text-[#9BB6FF]" : "text-[#6E6E77] dark:text-[#8EA0B8]"}`}
                      aria-hidden
                    />
                  ) : (
                    // Pastillas: cuántas visitas de 4 posibles.
                    <span className="flex gap-1" aria-hidden>
                      {Array.from({ length: MAX_VISITAS }, (_, i) => (
                        <span
                          key={i}
                          className={`h-1.5 w-3.5 rounded-full transition-colors duration-200 ${
                            i < (p.id as number)
                              ? on
                                ? "bg-[#1B5CFF] dark:bg-[#4B7CFF]"
                                : "bg-[#A1A1AA] dark:bg-[#64748B]"
                              : "bg-[#E4E4E7] dark:bg-[#273244]"
                          }`}
                        />
                      ))}
                    </span>
                  )}
                  <span className="mt-3 block">
                    <span
                      className={`block text-[14px] font-semibold leading-tight ${
                        on ? "text-[#1244D1] dark:text-[#C7D5FF]" : "text-[#09090B] dark:text-[#F8FAFC]"
                      }`}
                    >
                      {p.titulo}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-tight text-[#6E6E77] dark:text-[#8EA0B8]">
                      {p.detalle}
                    </span>
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* 2 · Fechas */}
      <div key={plan === "libre" ? "libre" : "fijo"} className="cot-fade">
        {plan !== "libre" ? (
          <div className="space-y-4">
            <div>
              <p className={labelClass}>
                <CalendarCheck2 className="size-4 text-[#1B5CFF] dark:text-[#4B7CFF]" aria-hidden />
                <label htmlFor={pickerId("inicio")}>Fecha del primer mantenimiento</label>
              </p>
              <div className="max-w-[16rem]">
                <DatePicker
                  id={pickerId("inicio")}
                  dateFormat="d/m/Y"
                  placeholder="dd/mm/aaaa"
                  defaultDate={inicio ? formatPolizaFecha(inicio) : undefined}
                  onChange={(dates) => cambiarInicio(toIso(dates[0]))}
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-[14px] border border-[#E7E7EA] dark:border-[#273244]">
              <div className="flex items-center justify-between gap-3 border-b border-[#E7E7EA] bg-[#FAFAFA] px-4 py-2.5 dark:border-[#273244] dark:bg-[#0F172A]/60">
                <p className="text-[13px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">Calendario del año</p>
                <p className="text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">
                  {plan === 1 ? "Una visita" : `Cada ${mesesEntreVisitas(plan)} meses`}
                </p>
              </div>
              {programadas.length ? (
                <ol className="divide-y divide-[#EFEFF1] dark:divide-[#1F2A3C]">
                  {programadas.map((fecha, i) => (
                    <li
                      key={`${i}-${fecha}`}
                      className="cot-rise flex items-center gap-3 px-4 py-3"
                      style={{ "--cot-i": i } as CSSProperties}
                    >
                      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[rgba(27,92,255,0.08)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.14)] dark:text-[#9BB6FF]">
                        <CalendarDays className="size-[18px]" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC]">Visita {i + 1}</span>
                        <span className="block text-[12.5px] text-[#6E6E77] dark:text-[#8EA0B8]">
                          {i === 0 ? "Primer mantenimiento" : `${mesesEntreVisitas(plan) * i} meses después del primero`}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block font-mono text-[14px] font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
                          {formatPolizaFecha(fecha)}
                        </span>
                        <span className="block text-[12px] capitalize text-[#6E6E77] dark:text-[#8EA0B8]">
                          {diaSemanaCorto(fecha)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="flex items-center gap-3 px-4 py-5 text-[13.5px] text-[#6E6E77] dark:text-[#8EA0B8]">
                  <CalendarPlus className="size-5 shrink-0 text-[#A1A1AA]" aria-hidden />
                  Elige la fecha del primer mantenimiento y aquí verás las {plan === 1 ? "fecha" : `${plan} fechas`} del año.
                </div>
              )}
            </div>

            {programadas.length ? (
              <button
                type="button"
                onClick={() => elegirPlan("libre")}
                className="cot-press inline-flex h-10 items-center gap-2 rounded-[10px] px-3 text-[13.5px] font-semibold text-[#1244D1] hover:bg-[rgba(27,92,255,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:text-[#9BB6FF] dark:hover:bg-[rgba(75,124,255,0.1)]"
              >
                <PencilLine className="size-4" aria-hidden />
                Ajustar fechas a mano
              </button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <p className={labelClass}>
              <PencilLine className="size-4 text-[#1B5CFF] dark:text-[#4B7CFF]" aria-hidden />
              Fechas de las visitas
              <span className="ml-auto text-[12px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]">
                {items.length} de {MAX_VISITAS}
              </span>
            </p>
            <ul className="divide-y divide-[#EFEFF1] overflow-hidden rounded-[14px] border border-[#E7E7EA] dark:divide-[#1F2A3C] dark:border-[#273244]">
              {items.map((item, i) => {
                const repetida = Boolean(item.fecha) && items.findIndex((x) => x.fecha === item.fecha) < i;
                return (
                  <li key={item.uid} className="cot-pop flex items-center gap-3 px-4 py-2.5">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F4F4F5] text-[13px] font-bold text-[#3F3F46] dark:bg-[#1B2539] dark:text-[#CBD5E1]" aria-hidden>
                      {i + 1}
                    </span>
                    <label htmlFor={pickerId(item.uid)} className="sr-only">
                      Fecha de la visita {i + 1}
                    </label>
                    <div className="min-w-0 max-w-[15rem] flex-1">
                      <DatePicker
                        id={pickerId(item.uid)}
                        dateFormat="d/m/Y"
                        placeholder="dd/mm/aaaa"
                        defaultDate={item.fecha ? formatPolizaFecha(item.fecha) : undefined}
                        onChange={(dates) =>
                          commitItems(items.map((it) => (it.uid === item.uid ? { ...it, fecha: toIso(dates[0]) } : it)))
                        }
                      />
                    </div>
                    {repetida ? (
                      <span className="cot-fade hidden shrink-0 rounded-full bg-[rgba(230,162,60,0.16)] px-2.5 py-0.5 text-[12px] font-medium text-[#8A5D0F] dark:text-[#E6A23C] sm:inline">
                        Mismo día
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => quitar(item.uid)}
                      disabled={items.length === 1 && !item.fecha}
                      aria-label={items.length === 1 ? `Borrar la fecha de la visita ${i + 1}` : `Quitar la visita ${i + 1}`}
                      title={items.length === 1 ? "Borrar fecha" : "Quitar visita"}
                      className="cot-press ml-auto inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] text-[#A1A1AA] hover:bg-[#FEF2F2] hover:text-[#C22B2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(194,43,43,0.3)] disabled:invisible dark:text-[#64748B] dark:hover:bg-[#3F1518] dark:hover:text-[#F87171]"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
            {items.length < MAX_VISITAS ? (
              <button
                type="button"
                onClick={agregar}
                className="cot-press inline-flex h-10 items-center gap-1.5 rounded-[10px] px-3 text-[14px] font-semibold text-[#1244D1] hover:bg-[rgba(27,92,255,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:text-[#9BB6FF] dark:hover:bg-[rgba(75,124,255,0.1)]"
              >
                <Plus className="size-4" strokeWidth={2.5} aria-hidden />
                Agregar visita
              </button>
            ) : null}
            <p className="text-[12.5px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]">
              Todas dentro de 12 meses. Si un día hay más de un mantenimiento, repite la fecha.
            </p>
          </div>
        )}
      </div>

      {errorVisible ? (
        <p className={polErrorClass} role="alert">
          {errorVisible}
        </p>
      ) : null}
    </div>
  );
}
