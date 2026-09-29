/**
 * Panel lateral «Historial» del tablero Equipo: línea de tiempo de las
 * reasignaciones (quién movió qué, de quién a quién y cuándo), agrupada por
 * día. Entra deslizándose desde la derecha (`transform`), el fondo se
 * atenúa con `opacity`; Esc o clic afuera lo cierran y el foco regresa al
 * botón que lo abrió.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { erpSansStyle } from "../../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CalendarDays, ClipboardList, FolderKanban, History, RotateCw, Undo2, X } from "lucide-react";
import { focusRing } from "../../Proyectos/shared/proyectoTokens";
import type { EquipoHistorialEntry } from "../shared/equipoHistorialApi";
import type { EquipoItemKind } from "../shared/equipoDnd";
import { EquipoAvatar } from "./EquipoUi";

type Filtro = "todo" | EquipoItemKind;

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** «mié 30 sep» a partir de `YYYY-MM-DD` (hora local). */
function diaTexto(ymd: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd || "");
  if (!m) return "Sin fecha";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today.toISOString())) return "Hoy";
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "Ayer";
  const sameYear = d.getFullYear() === today.getFullYear();
  return d
    .toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) })
    .replace(/\./g, "");
}

function hora(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });
}

function PersonaChip({ id, nombre }: { id: number | null; nombre: string }) {
  return (
    <span className="inline-flex h-6 min-w-0 max-w-[45%] items-center gap-1.5 rounded-full bg-[#F4F4F5] pl-0.5 pr-2 text-[12px] font-medium text-[#3F3F46] dark:bg-white/6 dark:text-[#D6DEEA]">
      <span className="scale-[0.72] -mx-1">
        <EquipoAvatar id={id} nombre={nombre || "—"} size="sm" />
      </span>
      <span className="truncate">{nombre || (id == null ? "Sin asignar" : `#${id}`)}</span>
    </span>
  );
}

export function EquipoHistorialDrawer({
  open,
  onClose,
  entries,
  loading,
  error,
  onRefresh,
  onOpenItem,
}: {
  open: boolean;
  onClose: () => void;
  entries: EquipoHistorialEntry[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onOpenItem: (tipo: EquipoItemKind, id: number) => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todo");

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => closeRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  const grupos = useMemo(() => {
    const list = filtro === "todo" ? entries : entries.filter((e) => e.tipo === filtro);
    const out: { key: string; label: string; items: EquipoHistorialEntry[] }[] = [];
    for (const e of list) {
      const k = dayKey(e.creado_at);
      const last = out[out.length - 1];
      if (last && last.key === k) last.items.push(e);
      else out.push({ key: k, label: dayLabel(e.creado_at), items: [e] });
    }
    return out;
  }, [entries, filtro]);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[100000]" role="presentation" style={erpSansStyle}>
          <motion.div
            className="absolute inset-0 bg-[#09090B]/30 backdrop-blur-[2px] dark:bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute inset-y-0 right-0 flex w-full max-w-[27rem] flex-col border-l border-[#E7E7EA] bg-white shadow-[-24px_0_48px_-24px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:bg-[#111827]"
            initial={{ x: "100%" }}
            animate={{ x: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ x: "100%", transition: { duration: 0.22, ease: "easeIn" } }}
          >
            <header className="flex items-start gap-3 border-b border-[#F0F0F2] px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] dark:border-[#1F2A3C]">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63]/70 dark:text-[#9BB6FF]" aria-hidden>
                <History className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-[16px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                  Historial
                </h2>
                <p className="text-[12.5px] text-[#71717A] dark:text-[#8EA0B8]">Reasignaciones hechas en el tablero Equipo</p>
              </div>
              <button
                type="button"
                onClick={onRefresh}
                aria-label="Actualizar historial"
                title="Actualizar"
                className={`cot-press inline-flex size-9 items-center justify-center rounded-[10px] text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:bg-white/6 ${focusRing}`}
              >
                <RotateCw className={`size-4 ${loading ? "motion-safe:animate-spin" : ""}`} aria-hidden />
              </button>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Cerrar historial"
                className={`cot-press inline-flex size-9 items-center justify-center rounded-[10px] text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:bg-white/6 ${focusRing}`}
              >
                <X className="size-4" aria-hidden />
              </button>
            </header>

            <div className="flex gap-1 border-b border-[#F0F0F2] px-5 py-2.5 dark:border-[#1F2A3C]" role="radiogroup" aria-label="Filtrar historial">
              {(
                [
                  { v: "todo", l: "Todo" },
                  { v: "orden", l: "Órdenes" },
                  { v: "proyecto", l: "Proyectos" },
                ] as const
              ).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  role="radio"
                  aria-checked={filtro === o.v}
                  onClick={() => setFiltro(o.v)}
                  className={`cot-press h-8 rounded-full px-3 text-[12.5px] font-semibold ${focusRing} ${
                    filtro === o.v
                      ? "bg-[#17235B] text-white dark:bg-[#4B7CFF]"
                      : "text-[#52525B] hover:bg-[#F4F4F5] dark:text-[#8EA0B8] dark:hover:bg-white/6"
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3" aria-busy={loading || undefined}>
              {error ? (
                <p className="rounded-xl bg-[#FEF2F2] px-3 py-3 text-[13px] text-[#B42323] dark:bg-[#3F1518] dark:text-[#F87171]" role="alert">
                  {error}
                </p>
              ) : loading && entries.length === 0 ? (
                <ul className="space-y-4" aria-hidden>
                  {Array.from({ length: 5 }, (_, i) => (
                    <li key={i} className="flex gap-3" style={{ opacity: 1 - i * 0.15 }}>
                      <span className="size-7 shrink-0 rounded-full bg-[#EDEDF0] motion-safe:animate-pulse dark:bg-[#1B2539]" />
                      <span className="flex-1 space-y-2">
                        <span className="block h-3 w-3/4 rounded-full bg-[#EDEDF0] motion-safe:animate-pulse dark:bg-[#1B2539]" />
                        <span className="block h-2.5 w-1/2 rounded-full bg-[#EDEDF0] motion-safe:animate-pulse dark:bg-[#1B2539]" />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : grupos.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-[#F4F4F5] text-[#A1A1AA] dark:bg-white/6">
                    <History className="size-5" aria-hidden />
                  </span>
                  <p className="text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">Aún no hay movimientos</p>
                  <p className="max-w-xs text-[12.5px] text-[#71717A] dark:text-[#8EA0B8]">
                    Cada vez que muevas una orden o proyecto a otro técnico o a otro día quedará registrado aquí.
                  </p>
                </div>
              ) : (
                grupos.map((g) => (
                  <section key={g.key} className="mb-5 last:mb-0" aria-label={g.label}>
                    <h3 className="sticky top-0 z-[1] -mx-5 mb-2 bg-white/95 px-5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#71717A] backdrop-blur-sm first-letter:uppercase dark:bg-[#111827]/95 dark:text-[#8EA0B8]">
                      {g.label}
                    </h3>
                    <ol className="relative space-y-1 before:absolute before:bottom-3 before:left-[13px] before:top-3 before:w-px before:bg-[#F0F0F2] dark:before:bg-[#1F2A3C]">
                      {g.items.map((e, i) => {
                        const deshacer = e.accion === "deshacer";
                        const cambioTecnico = e.desde_id !== e.hacia_id;
                        const cambioDia = !!(e.desde_fecha || e.hacia_fecha) && e.desde_fecha !== e.hacia_fecha;
                        const verbo = deshacer
                          ? "deshizo el cambio de"
                          : cambioTecnico && cambioDia
                            ? "reasignó y cambió de día"
                            : cambioDia
                              ? "cambió de día"
                              : "reasignó";
                        return (
                          <li
                            key={e.id}
                            className="cot-rise relative flex gap-3 rounded-[12px] py-2 pl-0 pr-1"
                            style={{ "--cot-i": Math.min(i, 8) } as React.CSSProperties}
                          >
                            <span className="relative z-[1] mt-0.5">
                              <EquipoAvatar id={e.usuario ?? 0} nombre={e.usuario_nombre || "?"} avatarUrl={e.usuario_avatar_url} size="sm" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="min-w-0 text-[13px] leading-snug text-[#3F3F46] dark:text-[#D6DEEA]">
                                  <span className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">{e.usuario_nombre || "Alguien"}</span>{" "}
                                  {verbo}{" "}
                                  <button
                                    type="button"
                                    onClick={() => onOpenItem(e.tipo, e.objeto_id)}
                                    className={`inline-flex items-center gap-1 rounded font-mono text-[12.5px] font-semibold text-[#1244D1] underline decoration-[#C9D7FF] underline-offset-2 hover:decoration-[#1244D1] dark:text-[#9BB6FF] ${focusRing}`}
                                  >
                                    {e.tipo === "orden" ? <ClipboardList className="size-3" aria-hidden /> : <FolderKanban className="size-3" aria-hidden />}
                                    {e.folio || `#${e.objeto_id}`}
                                  </button>
                                </p>
                                <time dateTime={e.creado_at} className="shrink-0 text-[11.5px] tabular-nums text-[#A1A1AA] dark:text-[#64748B]">
                                  {hora(e.creado_at)}
                                </time>
                              </div>
                              {e.cliente ? <p className="truncate text-[12px] text-[#71717A] dark:text-[#8EA0B8]">{e.cliente}</p> : null}
                              {cambioTecnico || !cambioDia ? (
                                <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
                                  {deshacer ? <Undo2 className="size-3.5 shrink-0 text-[#8A5D0F] dark:text-[#F2C27A]" aria-label="Deshecho" /> : null}
                                  <PersonaChip id={e.desde_id} nombre={e.desde_nombre} />
                                  <ArrowRight className="size-3.5 shrink-0 text-[#A1A1AA]" aria-label="a" />
                                  <PersonaChip id={e.hacia_id} nombre={e.hacia_nombre} />
                                </div>
                              ) : null}
                              {cambioDia ? (
                                <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-[#3F3F46] dark:text-[#D6DEEA]">
                                  {deshacer && !cambioTecnico ? <Undo2 className="size-3.5 shrink-0 text-[#8A5D0F] dark:text-[#F2C27A]" aria-label="Deshecho" /> : null}
                                  <span className="inline-flex h-6 items-center gap-1 rounded-full bg-[#F4F4F5] px-2 tabular-nums dark:bg-white/[0.06]">
                                    <CalendarDays className="size-3 text-[#A1A1AA]" aria-hidden />
                                    {diaTexto(e.desde_fecha)}
                                  </span>
                                  <ArrowRight className="size-3.5 shrink-0 text-[#A1A1AA]" aria-label="a" />
                                  <span className="inline-flex h-6 items-center gap-1 rounded-full bg-[#EEF3FF] px-2 tabular-nums text-[#1244D1] dark:bg-[#1B2A63]/60 dark:text-[#C9D7FF]">
                                    <CalendarDays className="size-3" aria-hidden />
                                    {diaTexto(e.hacia_fecha)}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                ))
              )}
            </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
