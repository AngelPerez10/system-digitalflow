import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ChevronDown, ChevronRight, ClipboardList, FileText, LayoutGrid, Package, ShieldCheck, Users } from "lucide-react";
import { btn, btnSm, focusRing } from "@/pages/Operacion/Proyectos/shared/proyectoTokens";
import { Reveal } from "./Reveal";
import { MODULO as TONO, segmentoActivo, segmentoInactivo } from "./palette";
import { panelCard } from "./ui";
import { useActividadReciente, type ActivityItem, type ModuleKey } from "./useActividadReciente";

type Filtro = "todo" | "operacion" | "cotizacion" | "contactos" | "otros";

const FILTROS: { key: Filtro; label: string }[] = [
  { key: "todo", label: "Todo" },
  { key: "operacion", label: "Operación" },
  { key: "cotizacion", label: "Ventas" },
  { key: "contactos", label: "Clientes" },
  { key: "otros", label: "Otros" },
];

const PASO = 8;

const MODULO: Record<ModuleKey, { icon: ReactNode; tone: string }> = {
  operacion: { icon: <ClipboardList />, tone: TONO.ordenes.icon },
  cotizacion: { icon: <FileText />, tone: TONO.ventas.icon },
  contactos: { icon: <Users />, tone: "bg-[rgba(23,35,91,0.08)] text-[#17235B] dark:bg-white/[0.08] dark:text-[#D6DEEA]" },
  escritorio: { icon: <LayoutGrid />, tone: "bg-[#F4F4F5] text-[#52525B] dark:bg-white/[0.06] dark:text-[#B7C1D1]" },
  productos_servicios: { icon: <Package />, tone: "bg-[#F4F4F5] text-[#52525B] dark:bg-white/[0.06] dark:text-[#B7C1D1]" },
  usuarios: { icon: <ShieldCheck />, tone: "bg-[#F4F4F5] text-[#52525B] dark:bg-white/[0.06] dark:text-[#B7C1D1]" },
};

function enFiltro(item: ActivityItem, filtro: Filtro): boolean {
  if (filtro === "todo") return true;
  if (filtro === "otros") return !["operacion", "cotizacion", "contactos"].includes(item.module);
  return item.module === filtro;
}

function hace(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h`;
  return `${Math.floor(hrs / 24)} d`;
}

function etiquetaDia(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);
  if (d.toDateString() === hoy.toDateString()) return "Hoy";
  if (d.toDateString() === ayer.toDateString()) return "Ayer";
  const txt = d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

/** Línea de tiempo de movimientos recientes, agrupada por día y filtrable por área. */
export function ActividadReciente({ index = 0 }: { index?: number }) {
  const navigate = useNavigate();
  const { items, loading, error } = useActividadReciente();
  const [filtro, setFiltro] = useState<Filtro>("todo");
  const [visibles, setVisibles] = useState(PASO);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const conteos = useMemo(() => {
    const c = {} as Record<Filtro, number>;
    for (const f of FILTROS) c[f.key] = items.filter((i) => enFiltro(i, f.key)).length;
    return c;
  }, [items]);

  const filtrados = useMemo(() => items.filter((i) => enFiltro(i, filtro)), [items, filtro]);
  const grupos = useMemo(() => {
    const out: { dia: string; items: ActivityItem[] }[] = [];
    for (const it of filtrados.slice(0, visibles)) {
      const dia = etiquetaDia(it.when);
      const last = out[out.length - 1];
      if (last && last.dia === dia) last.items.push(it);
      else out.push({ dia, items: [it] });
    }
    return out;
  }, [filtrados, visibles]);

  const cambiarFiltro = (f: Filtro) => {
    setFiltro(f);
    setVisibles(PASO);
  };

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (i + (e.key === "ArrowRight" ? 1 : -1) + FILTROS.length) % FILTROS.length;
    cambiarFiltro(FILTROS[next].key);
    tabRefs.current[next]?.focus();
  };

  const abrir = (i: ActivityItem) => {
    const id = i.openEntityId;
    navigate(i.viewPath === "/ordenes" && typeof id === "number" && id > 0 ? `${i.viewPath}?abrir=${id}` : i.viewPath);
  };

  let rowIndex = 0;

  return (
    <Reveal index={index} className={`flex min-w-0 flex-col p-5 ${panelCard}`} aria-labelledby="actividad-title">
      {() => (
        <>
          <div className="flex items-start gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[rgba(23,35,91,0.08)] text-[#17235B] dark:bg-white/[0.08] dark:text-[#D6DEEA]" aria-hidden>
              <Activity className="size-[18px]" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <h2 id="actividad-title" className="text-[16px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">
                Actividad reciente
              </h2>
              <p className="mt-0.5 text-[13px] text-[#71717A] dark:text-[#8EA0B8]">Movimientos en todos los módulos.</p>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Filtrar actividad"
            className="mt-4 flex gap-1 overflow-x-auto rounded-[12px] bg-[#F4F4F5] p-1 [scrollbar-width:none] dark:bg-[#0F172A]"
          >
            {FILTROS.map((f, i) => {
              const active = filtro === f.key;
              return (
                <button
                  key={f.key}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls="actividad-lista"
                  tabIndex={active ? 0 : -1}
                  onClick={() => cambiarFiltro(f.key)}
                  onKeyDown={(e) => onTabKey(e, i)}
                  className={`cot-press inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-[9px] px-2.5 text-[12.5px] font-semibold ${focusRing} ${
                    active
                      ? segmentoActivo
                      : segmentoInactivo
                  }`}
                >
                  {f.label}
                  {!loading && active && (
                    <span
                      key={`${f.key}-${conteos[f.key]}`}
                      className="cot-flash text-[11px] tabular-nums text-[#71717A] dark:text-[#8EA0B8]"
                    >
                      {conteos[f.key]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div id="actividad-lista" role="tabpanel" aria-live="polite" className="mt-4 min-h-[240px]">
            {loading ? (
              <ul className="space-y-4" aria-label="Cargando actividad">
                {Array.from({ length: 5 }, (_, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="size-8 shrink-0 animate-pulse rounded-full bg-[#F4F4F5] dark:bg-white/[0.06]" />
                    <span className="flex-1 space-y-2 pt-1">
                      <span className="block h-3 w-4/5 animate-pulse rounded bg-[#F4F4F5] dark:bg-white/[0.06]" />
                      <span className="block h-3 w-1/2 animate-pulse rounded bg-[#F4F4F5] dark:bg-white/[0.06]" />
                    </span>
                  </li>
                ))}
              </ul>
            ) : error ? (
              <p className="cot-fade rounded-[14px] border border-[#F6CFCF] bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#B42323] dark:border-[#7F1D1D] dark:bg-[#3F1518] dark:text-[#F87171]" role="alert">
                {error}
              </p>
            ) : filtrados.length === 0 ? (
              <div key={filtro} className="cot-fade flex flex-col items-center px-4 py-10 text-center">
                <span className="cot-tick inline-flex size-14 items-center justify-center rounded-[16px] bg-[#F4F4F5] text-[#52525B] dark:bg-white/[0.06] dark:text-[#B7C1D1]" aria-hidden>
                  <Activity className="size-6" />
                </span>
                <p className="mt-3 text-[16px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">Sin movimientos</p>
                <p className="mt-1 text-[13px] text-[#71717A] dark:text-[#8EA0B8]">No hay actividad reciente en esta área.</p>
                {filtro !== "todo" && (
                  <button type="button" className={`${btn.ghost} ${btnSm} mt-3`} onClick={() => cambiarFiltro("todo")}>
                    Ver toda la actividad
                  </button>
                )}
              </div>
            ) : (
              <div key={filtro} className="cot-fade space-y-4">
                {grupos.map((g) => (
                  <div key={g.dia}>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]">{g.dia}</p>
                    <ol className="relative">
                      {g.items.map((it, idx) => {
                        const mod = MODULO[it.module] ?? MODULO.usuarios;
                        const i = rowIndex++;
                        const last = idx === g.items.length - 1;
                        return (
                          <li key={it.id} className="cot-rise relative" style={{ "--cot-i": Math.min(i, 12) } as CSSProperties}>
                            {!last && <span className="absolute bottom-0 left-[23px] top-11 w-px bg-[#F0F0F2] dark:bg-[#1F2A3C]" aria-hidden />}
                            <button
                              type="button"
                              onClick={() => abrir(it)}
                              className={`cot-press group flex w-full items-start gap-3 rounded-[12px] px-2 py-2 text-left hover:bg-[#FAFAFA] dark:hover:bg-[#0F172A]/60 ${focusRing}`}
                            >
                              <span className={`relative mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full [&_svg]:size-[15px] ${mod.tone}`} aria-hidden>
                                {mod.icon}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-[13.5px] leading-snug text-[#52525B] dark:text-[#B7C1D1]">
                                  <span className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">{it.actor}</span> {it.text}
                                </span>
                                {it.detail && (
                                  <span className="mt-0.5 block truncate text-[12px] text-[#71717A] dark:text-[#8EA0B8]">{it.detail}</span>
                                )}
                                <span className="mt-1 flex items-center gap-1.5 text-[11.5px] text-[#A1A1AA] dark:text-[#64748B]">
                                  <span className="tabular-nums">{hora(it.when)}</span>
                                  <span aria-hidden>·</span>
                                  <span>hace {hace(it.when)}</span>
                                  <span aria-hidden>·</span>
                                  <span className="truncate">{it.viewName}</span>
                                </span>
                              </span>
                              <ChevronRight
                                className="mt-2 size-4 shrink-0 text-[#A1A1AA] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#17235B] dark:text-[#64748B] dark:group-hover:text-[#F8FAFC]"
                                aria-hidden
                              />
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ))}

                {filtrados.length > visibles && (
                  <button type="button" className={`${btn.secondary} ${btnSm} w-full`} onClick={() => setVisibles((v) => v + PASO)}>
                    <ChevronDown aria-hidden />
                    Mostrar más ({filtrados.length - visibles})
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </Reveal>
  );
}
