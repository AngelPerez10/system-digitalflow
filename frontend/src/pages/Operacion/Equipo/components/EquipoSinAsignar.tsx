/**
 * «Sin asignar»: botón con contador que abre la mesa de despacho con todos los
 * trabajos abiertos (de cualquier mes) que aún no tienen técnico.
 *
 * Mismo lenguaje que los modales de crear/editar Orden y Proyecto:
 * - `Modal` compartido (entrada/salida, foco atrapado, Esc, hoja inferior en
 *   celular).
 * - Encabezado en banda marina con indicadores y la barra de avance de la
 *   sesión.
 * - Columna izquierda clara tipo «riel»: búsqueda, filtro por tipo y la cola
 *   agrupada por urgencia. Clic elige un trabajo; la casilla (o Ctrl/⌘ + clic,
 *   Shift + flechas, Espacio) suma varios para asignarlos de una vez.
 * - Contenido sobre gris con `SectionCard`: detalle, técnico y día
 *   (calendario mensual). Pie con Cerrar / Asignar (Ctrl + Enter).
 *
 * Cada asignación usa el mismo `onMove` que el arrastre (queda en el
 * Historial; el aviso de deshacer cubre la última). Movimiento barato: solo
 * `transform`/`opacity` y transiciones de color; las filas asignadas salen
 * hacia la derecha antes de quitarse. Todo respeta `prefers-reduced-motion`.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  FolderKanban,
  Inbox,
  ListChecks,
  MapPin,
  Package,
  Search,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ProgressBar, SectionCard } from "../../Proyectos/shared/ProyectoUi";
import { btn, focusRing, fontSans } from "../../Proyectos/shared/proyectoTokens";
import type { EquipoDestino, EquipoMoveRequest } from "../shared/equipoDnd";
import { infoOrden, infoProyecto } from "../shared/equipoInfo";
import type { EquipoPendiente } from "../shared/equipoPendientes";
import { DIAS_CORTOS, DIAS_LARGOS, addDays, diaSemana, parseYmd, toYmd } from "../shared/equipoSemana";
import { TIPO_TONE, toolbarBadge, toolbarBtn } from "../shared/equipoTokens";
import { EquipoAvatar } from "./EquipoUi";

const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Duración de la salida de una fila asignada (igual que `.eq-row-out`). */
const SALIDA_FILA_MS = 200;

/** Mismo casco que el modal de Proyecto, un poco más bajo. */
const modalShell = `${fontSans} flex h-[min(94dvh,52rem)] w-full flex-col overflow-hidden rounded-t-[22px] border border-[#E7E7EA] bg-white! p-0 shadow-[0_32px_80px_-24px_rgba(9,9,11,0.45)] dark:border-[#273244] dark:bg-[#111827]! sm:h-[min(92dvh,52rem)] sm:w-[min(96vw,72rem)] sm:max-w-none sm:rounded-[22px]`;

type Filtro = "todo" | "orden" | "proyecto";
type Info = ReturnType<typeof infoOrden>;
type Grupo = "atrasado" | "hoy" | "proximo";

const GRUPOS: { key: Grupo; label: string; tone: string }[] = [
  { key: "atrasado", label: "Atrasados", tone: "text-[#8A5D0F] dark:text-[#F2C27A]" },
  { key: "hoy", label: "Hoy", tone: "text-[#1244D1] dark:text-[#9BB6FF]" },
  { key: "proximo", label: "Próximos", tone: "text-[#6E6E77] dark:text-[#8EA0B8]" },
];

/* ─────────────── Utilidades ─────────────── */

function infoDe(p: EquipoPendiente): Info {
  return p.kind === "orden" ? infoOrden(p.orden, true) : infoProyecto(p.row, null);
}

function diaCorto(ymd: string): string {
  const d = parseYmd(ymd);
  return d ? `${DIAS_CORTOS[diaSemana(ymd)]} ${d.getDate()} ${MESES_CORTOS[d.getMonth()]}` : ymd;
}

function diasEntre(desde: string, hasta: string): number {
  const a = parseYmd(desde);
  const b = parseYmd(hasta);
  return a && b ? Math.round((b.getTime() - a.getTime()) / 864e5) : 0;
}

/** «Hace 3 días», «Ayer», «Hoy», «Mañana», «En 5 días». */
function relativo(ymd: string, hoy: string): string {
  const d = diasEntre(hoy, ymd);
  if (d === 0) return "Hoy";
  if (d === 1) return "Mañana";
  if (d === -1) return "Ayer";
  return d < 0 ? `Hace ${-d} días` : `En ${d} días`;
}

/** Minúsculas y sin acentos (búsqueda tolerante). */
function norm(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function sinMovimiento(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

function esEscritorio(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(min-width: 768px)").matches === true;
}

/* ─────────────── Cola (riel izquierdo) ─────────────── */

/** Casilla de selección (visual; la acción la decide quien la usa). */
function Casilla({ on, mixed = false }: { on: boolean; mixed?: boolean }) {
  return (
    <span
      className={`inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-[background-color,border-color] duration-150 ${
        on || mixed
          ? "border-[#1B5CFF] bg-[#1B5CFF] dark:border-[#4B7CFF] dark:bg-[#4B7CFF]"
          : "border-[#D3D3D8] bg-white group-hover/fila:border-[#A1A1AA] dark:border-[#3A4661] dark:bg-transparent"
      }`}
      aria-hidden
    >
      {mixed && !on ? (
        <span className="h-[2px] w-2 rounded-full bg-white" />
      ) : (
        <Check className={`eq-tick size-3 text-white ${on ? "scale-100 opacity-100" : "scale-50 opacity-0"}`} strokeWidth={3.2} />
      )}
    </span>
  );
}

const FilaPendiente = memo(function FilaPendiente({
  p,
  info: d,
  hoy,
  i,
  seleccionada,
  cursor,
  saliendo,
  onClick,
  onToggle,
}: {
  p: EquipoPendiente;
  info: Info;
  hoy: string;
  i: number;
  seleccionada: boolean;
  cursor: boolean;
  saliendo: boolean;
  onClick: (key: string, multi: boolean) => void;
  onToggle: (key: string) => void;
}) {
  const Icono = p.kind === "orden" ? ClipboardList : FolderKanban;
  const dias = diasEntre(hoy, p.fecha);
  return (
    <div
      role="option"
      aria-selected={seleccionada}
      data-key={p.key}
      tabIndex={cursor ? 0 : -1}
      onClick={(e) => onClick(p.key, e.ctrlKey || e.metaKey)}
      style={{ "--eq-i": Math.min(i, 12) } as CSSProperties}
      className={`${saliendo ? "eq-row-out" : "eq-row-in"} cot-press group/fila relative flex cursor-pointer items-center gap-3 rounded-[12px] px-2.5 py-2.5 transition-[background-color,box-shadow] duration-150 ${focusRing} ${
        seleccionada
          ? "bg-white shadow-[0_1px_2px_rgba(9,9,11,0.06)] ring-1 ring-[#E4E4E7] dark:bg-[#1B2539] dark:ring-[#273244]"
          : "hover:bg-white/70 dark:hover:bg-white/[0.03]"
      }`}
    >
      <button
        type="button"
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(p.key);
        }}
        aria-label={seleccionada ? `Quitar ${d.folio} de la selección` : `Agregar ${d.folio} a la selección`}
        className="-m-1.5 inline-flex size-8 shrink-0 items-center justify-center"
      >
        <Casilla on={seleccionada} />
      </button>
      <span
        className={`inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-150 ${
          seleccionada ? "bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63]/70 dark:text-[#9BB6FF]" : "bg-[#F0F0F2] text-[#71717A] dark:bg-white/[0.05] dark:text-[#8EA0B8]"
        }`}
      >
        <Icono className="size-4" aria-label={TIPO_TONE[p.kind].label} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[14px] font-semibold tracking-[-0.1px] ${seleccionada ? "text-[#09090B] dark:text-[#F8FAFC]" : "text-[#27272A] dark:text-[#D6DEEA]"}`}>
          {d.cliente}
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
          <span className="font-mono">{d.folio}</span> · {diaCorto(p.fecha)}
        </span>
      </span>
      <span
        className={`shrink-0 text-[11.5px] font-medium tabular-nums ${
          dias < 0 ? "text-[#8A5D0F] dark:text-[#F2C27A]" : dias === 0 ? "text-[#1244D1] dark:text-[#9BB6FF]" : "text-[#A1A1AA] dark:text-[#64748B]"
        }`}
      >
        {relativo(p.fecha, hoy)}
      </span>
    </div>
  );
});

/* ─────────────── Contenido ─────────────── */

function Dato({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[12px] font-medium text-[#71717A] dark:text-[#8EA0B8]">
        <span className="text-[#A1A1AA] dark:text-[#64748B] [&>svg]:size-3.5" aria-hidden>
          {icon}
        </span>
        {label}
      </dt>
      <dd className="mt-1 text-[14px] leading-[1.5] text-[#09090B] dark:text-[#F1F5F9]">{children}</dd>
    </div>
  );
}

/** Calendario mensual para elegir el día de trabajo (cualquier día, y de meses vecinos). */
function CalendarioDia({ value, original, hoy, onChange }: { value: string; original: string; hoy: string; onChange: (ymd: string) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [vista, setVista] = useState(() => (value || original).slice(0, 7));
  // Dirección del último cambio de mes: la cuadrícula entra desde ese lado.
  const [dir, setDir] = useState<"next" | "prev" | null>(null);

  // Si el día elegido cae en otro mes (otro trabajo, flechas del teclado), la vista lo sigue.
  useEffect(() => {
    if (!value) return;
    const mes = value.slice(0, 7);
    if (mes === vista) return;
    setDir(mes > vista ? "next" : "prev");
    setVista(mes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const [y, m] = vista.split("-").map(Number);
  const celdas = useMemo(() => {
    const primero = new Date(y, m - 1, 1);
    const offset = (primero.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => toYmd(new Date(y, m - 1, 1 - offset + i)));
  }, [y, m]);

  const irMes = (delta: number) => {
    setDir(delta > 0 ? "next" : "prev");
    setVista(toYmd(new Date(y, m - 1 + delta, 1)).slice(0, 7));
  };

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
  const flecha = `cot-press inline-flex size-9 items-center justify-center rounded-[9px] border border-[#E7E7EA] bg-white text-[#52525B] hover:border-[#D3D3D8] hover:text-[#09090B] dark:border-[#273244] dark:bg-[#111827] dark:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:hover:text-[#F8FAFC] ${focusRing}`;
  const entrada = dir === "next" ? "eq-slide-next" : dir === "prev" ? "eq-slide-prev" : "";

  return (
    <div className="overflow-hidden">
      <div className="flex items-center gap-1.5 pb-3">
        <p key={vista} className={`${entrada || "cot-fade"} min-w-0 flex-1 text-[15px] font-semibold capitalize tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]`} aria-live="polite">
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
          <span key={d} className="py-1 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A1A1AA] dark:text-[#64748B]">
            {d.slice(0, 2)}
          </span>
        ))}
      </div>

      {/* Se re-monta al cambiar de mes: entra desde el lado hacia el que se navegó. */}
      <div key={vista} ref={ref} role="grid" aria-label="Día de trabajo" onKeyDown={mover} className={`${entrada} grid grid-cols-7 gap-y-1`}>
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
              className={`cot-press relative mx-auto inline-flex size-10 items-center justify-center rounded-[11px] text-[13.5px] tabular-nums sm:size-11 ${
                activo
                  ? "bg-[#1B5CFF] font-semibold text-white shadow-[0_6px_14px_-8px_rgba(27,92,255,0.8)] dark:bg-[#4B7CFF]"
                  : `${esOriginal ? "shadow-[inset_0_0_0_1.5px_#A1A1AA] dark:shadow-[inset_0_0_0_1.5px_#4B5A7A] " : ""}hover:bg-[#F4F4F5] dark:hover:bg-white/6 ${
                      fuera
                        ? "text-[#D4D4D8] dark:text-[#475569]"
                        : finde
                          ? "font-medium text-[#A1A1AA] dark:text-[#8EA0B8]"
                          : "font-medium text-[#27272A] dark:text-[#E2E8F0]"
                    }`
              } ${focusRing}`}
            >
              {d?.getDate()}
              {esHoy ? <span className={`absolute bottom-1 size-1 rounded-full ${activo ? "bg-white" : "bg-[#1B5CFF] dark:bg-[#6B93FF]"}`} aria-hidden /> : null}
            </button>
          );
        })}
      </div>

      <p className="mt-3 flex items-center gap-4 border-t border-[#F0F0F2] pt-3 text-[12px] text-[#71717A] dark:border-[#1F2A3C] dark:text-[#8EA0B8]">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-[#1B5CFF] dark:bg-[#6B93FF]" aria-hidden />
          Hoy
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3.5 rounded-[5px] shadow-[inset_0_0_0_1.5px_#A1A1AA] dark:shadow-[inset_0_0_0_1.5px_#4B5A7A]" aria-hidden />
          Fecha original
        </span>
        <button
          type="button"
          onClick={() => onChange(original)}
          disabled={value === original}
          className={`ml-auto rounded-md px-1.5 py-0.5 font-semibold text-[#1B5CFF] transition-opacity duration-150 hover:underline disabled:pointer-events-none disabled:opacity-0 dark:text-[#7EA0FF] ${focusRing}`}
        >
          Volver a la original
        </button>
      </p>
    </div>
  );
}

/* ─────────────── Componente principal ─────────────── */

type Confirmacion = { token: number; titulo: string; nombre: string; detalle: string };

export function EquipoSinAsignar({
  pendientes,
  destinos,
  onAssign,
}: {
  pendientes: EquipoPendiente[];
  destinos: EquipoDestino[];
  onAssign: (req: EquipoMoveRequest) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("todo");
  const [q, setQ] = useState("");
  const [qTecnico, setQTecnico] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [cursorKey, setCursorKey] = useState<string | null>(null);
  const [tecnico, setTecnico] = useState("");
  const [fecha, setFecha] = useState("");
  const [conservarFechas, setConservarFechas] = useState(true);
  const [detalleMovil, setDetalleMovil] = useState(false);
  const [saliendo, setSaliendo] = useState<Set<string>>(() => new Set());
  const [asignados, setAsignados] = useState(0);
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);

  const listaRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Mientras sea true, se elige solo el trabajo más urgente (p. ej. si se abrió antes de que llegara la cola).
  const autoSelRef = useRef(false);
  // Asignación diferida (mientras salen las filas): se ejecuta sí o sí, aunque se cierre el modal.
  const diferidaRef = useRef<{ timer: number; run: () => void } | null>(null);

  const tecnicos = useMemo(() => destinos.filter((d) => d.id != null), [destinos]);
  const hoy = useMemo(() => toYmd(new Date()), []);
  const n = pendientes.length;

  const infos = useMemo(() => new Map(pendientes.map((p) => [p.key, infoDe(p)])), [pendientes]);
  const textos = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of pendientes) {
      const d = infos.get(p.key)!;
      m.set(p.key, norm([d.folio, d.cliente, d.sucursal, d.direccion, ...d.servicios].filter(Boolean).join(" ")));
    }
    return m;
  }, [pendientes, infos]);

  const conteo = useMemo(() => {
    let atrasado = 0;
    let deHoy = 0;
    let ordenes = 0;
    for (const p of pendientes) {
      if (p.fecha < hoy) atrasado += 1;
      else if (p.fecha === hoy) deHoy += 1;
      if (p.kind === "orden") ordenes += 1;
    }
    return { atrasado, hoy: deHoy, proximo: n - atrasado - deHoy, ordenes, proyectos: n - ordenes };
  }, [pendientes, hoy, n]);

  const qNorm = norm(q.trim());
  const visibles = useMemo(
    () => pendientes.filter((p) => (filtro === "todo" || p.kind === filtro) && (!qNorm || textos.get(p.key)!.includes(qNorm))),
    [pendientes, filtro, qNorm, textos],
  );
  const grupos = useMemo(() => {
    const g: Record<Grupo, EquipoPendiente[]> = { atrasado: [], hoy: [], proximo: [] };
    for (const p of visibles) g[p.fecha < hoy ? "atrasado" : p.fecha === hoy ? "hoy" : "proximo"].push(p);
    return GRUPOS.map((meta) => ({ ...meta, lista: g[meta.key] })).filter((x) => x.lista.length > 0);
  }, [visibles, hoy]);
  // Orden visual (por grupo) para el teclado y para «siguiente».
  const ordenVisual = useMemo(() => grupos.flatMap((g) => g.lista), [grupos]);
  const indice = useMemo(() => new Map(ordenVisual.map((p, i) => [p.key, i])), [ordenVisual]);

  // Selección efectiva: solo lo que sigue existiendo.
  const porKey = useMemo(() => new Map(pendientes.map((p) => [p.key, p])), [pendientes]);
  const items = useMemo(() => sel.map((k) => porKey.get(k)).filter((p): p is EquipoPendiente => p != null), [sel, porKey]);
  const selSet = useMemo(() => new Set(items.map((p) => p.key)), [items]);
  const uno = items.length === 1 ? items[0] : null;
  const unoInfo = uno ? (infos.get(uno.key) ?? null) : null;
  const firma = items.map((p) => p.key).join("|");
  const cursor = cursorKey && indice.has(cursorKey) ? cursorKey : (ordenVisual[0]?.key ?? null);

  const tecnicosVisibles = useMemo(() => {
    const t = norm(qTecnico.trim());
    return t ? tecnicos.filter((d) => norm(d.nombre).includes(t)) : tecnicos;
  }, [tecnicos, qTecnico]);
  const dest = tecnicos.find((t) => t.key === tecnico);

  const fechaSel = fecha || items[0]?.fecha || hoy;
  const usaFechaComun = items.length === 1 || !conservarFechas;

  // Al cambiar lo elegido: el día vuelve al del (primer) trabajo y el contenido sube al inicio.
  useEffect(() => {
    setFecha(items[0]?.fecha ?? "");
    scrollRef.current?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma]);

  /* ----- Abrir / cerrar ----- */

  const ejecutarDiferida = useCallback(() => {
    const p = diferidaRef.current;
    if (!p) return;
    window.clearTimeout(p.timer);
    diferidaRef.current = null;
    p.run();
  }, []);

  const cerrar = useCallback(() => {
    ejecutarDiferida();
    setOpen(false);
  }, [ejecutarDiferida]);

  useEffect(() => ejecutarDiferida, [ejecutarDiferida]);

  const abrir = () => {
    setDetalleMovil(false);
    setAsignados(0);
    setConfirmacion(null);
    setQ("");
    setFiltro("todo");
    // Arranca con el más urgente elegido (ver el efecto de abajo).
    autoSelRef.current = true;
    setSel([]);
    setCursorKey(null);
    setOpen(true);
  };

  // Elige el más urgente al abrir y cuando llega la cola, hasta que el usuario elige algo.
  useEffect(() => {
    if (!open || !autoSelRef.current || items.length > 0 || ordenVisual.length === 0) return;
    setSel([ordenVisual[0].key]);
    setCursorKey(ordenVisual[0].key);
  }, [open, items.length, ordenVisual]);

  useEffect(() => {
    if (!confirmacion) return;
    const t = window.setTimeout(() => setConfirmacion(null), 2800);
    return () => window.clearTimeout(t);
  }, [confirmacion]);

  /* ----- Selección ----- */

  const toggle = useCallback((key: string) => {
    autoSelRef.current = false;
    setSel((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
    setCursorKey(key);
  }, []);

  const clickFila = useCallback(
    (key: string, multi: boolean) => {
      if (multi) {
        toggle(key);
        return;
      }
      autoSelRef.current = false;
      setCursorKey(key);
      setSel([key]);
      if (!esEscritorio()) setDetalleMovil(true);
    },
    [toggle],
  );

  const visiblesSel = ordenVisual.filter((p) => selSet.has(p.key)).length;
  const todos = ordenVisual.length > 0 && visiblesSel === ordenVisual.length;
  const alternarTodos = () => {
    autoSelRef.current = false;
    setSel(todos ? [] : ordenVisual.map((p) => p.key));
  };

  const onListKey = (e: React.KeyboardEvent) => {
    if (!cursor) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const i = indice.get(cursor) ?? 0;
      const next = ordenVisual[Math.min(ordenVisual.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))];
      if (!next) return;
      setCursorKey(next.key);
      // Shift + flecha suma a la selección; sola, la reemplaza.
      if (e.shiftKey) setSel((prev) => (prev.includes(next.key) ? prev : [...prev, next.key]));
      else setSel([next.key]);
      requestAnimationFrame(() => listaRef.current?.querySelector<HTMLElement>(`[data-key="${next.key}"]`)?.focus());
    } else if (e.key === " ") {
      e.preventDefault();
      toggle(cursor);
    } else if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      setSel([cursor]);
      if (!esEscritorio()) setDetalleMovil(true);
    }
  };

  /* ----- Asignar ----- */

  const asignar = () => {
    if (!dest || items.length === 0) return;
    ejecutarDiferida();
    const lote = items;
    const keys = new Set(lote.map((p) => p.key));
    const fechaComun = usaFechaComun ? fechaSel : null;

    // Siguiente: el primero después del último elegido (o antes, si no hay).
    const ultimo = Math.max(...lote.map((p) => indice.get(p.key) ?? -1));
    const siguiente =
      ordenVisual.slice(ultimo + 1).find((p) => !keys.has(p.key)) ?? [...ordenVisual].reverse().find((p) => !keys.has(p.key)) ?? null;

    const run = () => {
      for (const p of lote) {
        onAssign({ kind: p.kind, id: p.id, fromId: null, toId: dest.id, fromFecha: p.fecha, toFecha: fechaComun ?? p.fecha });
      }
      setSaliendo(new Set());
    };

    setConfirmacion({
      token: Date.now(),
      titulo: lote.length === 1 ? (infos.get(lote[0].key)?.folio ?? "Trabajo") : `${lote.length} trabajos`,
      nombre: dest.nombre.split(" ")[0],
      detalle: fechaComun ? diaCorto(fechaComun) : "sus fechas",
    });
    setAsignados((a) => a + lote.length);
    setSel(siguiente ? [siguiente.key] : []);
    setCursorKey(siguiente?.key ?? null);
    setDetalleMovil(false);

    if (sinMovimiento()) {
      run();
      return;
    }
    // Las filas salen primero; luego se asigna (y desaparecen de la cola).
    setSaliendo(keys);
    const timer = window.setTimeout(() => {
      diferidaRef.current = null;
      run();
    }, SALIDA_FILA_MS);
    diferidaRef.current = { timer, run };
  };

  const onDialogKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && dest && items.length > 0) {
      e.preventDefault();
      asignar();
    }
  };

  /* ----- Render ----- */

  const tabs: { key: Filtro; label: string; count: number }[] = [
    { key: "todo", label: "Todos", count: n },
    { key: "orden", label: "Órdenes", count: conteo.ordenes },
    { key: "proyecto", label: "Proyectos", count: conteo.proyectos },
  ];
  const tabIdx = tabs.findIndex((t) => t.key === filtro);
  const total = asignados + n;
  const avance = total > 0 ? Math.round((asignados / total) * 100) : 0;

  const inputClass =
    "h-10 w-full rounded-[11px] border border-[#E4E4E7] bg-white pl-9 pr-9 text-[13.5px] text-[#09090B] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.12)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#64748B] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.2)] [&::-webkit-search-cancel-button]:hidden";

  const indicadores = [
    { label: "Atrasados", value: conteo.atrasado, tone: "text-[#F2C27A]" },
    { label: "Hoy", value: conteo.hoy, tone: "text-[#C9D7FF]" },
    { label: "Próximos", value: conteo.proximo, tone: "text-white" },
  ];

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-haspopup="dialog"
        aria-label={`Sin asignar: ${n} ${n === 1 ? "trabajo" : "trabajos"}`}
        title="Sin asignar"
        className={`${toolbarBtn(open, "amber")} min-w-0 flex-1 sm:flex-none`}
      >
        <Inbox data-eq-icon="bandeja" className={n > 0 ? "text-[#B7791F] dark:text-[#F2C27A]" : ""} aria-hidden />
        <span className="hidden sm:inline">Sin asignar</span>
        {n > 0 ? (
          <span key={n} className={toolbarBadge.amber} aria-hidden>
            {n}
          </span>
        ) : null}
      </button>

      <Modal
        mobileBottomSheet
        isOpen={open}
        onClose={cerrar}
        closeOnBackdropClick={false}
        showCloseButton={false}
        ariaLabelledBy="eq-despacho-titulo"
        className={modalShell}
      >
        <div className="flex min-h-0 flex-1 flex-col" onKeyDown={onDialogKey}>
          {/* ───── Encabezado (banda marina, igual que Orden/Proyecto) ───── */}
          <header className="cot-sheen relative shrink-0 overflow-hidden bg-[#17235B] text-white dark:bg-[#1B2A63]">
            <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#E6A23C]/15 blur-3xl" aria-hidden />
            <div className="relative flex items-start gap-3.5 pb-4 pl-5 pr-16 pt-5 sm:pl-6 lg:pr-[4.5rem]">
              <span className="hidden size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C] sm:inline-flex" aria-hidden>
                <Inbox className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">Equipo · Despacho</p>
                <h2 id="eq-despacho-titulo" className="mt-1 text-[20px] font-semibold leading-tight tracking-[-0.5px] sm:text-[22px]">
                  Trabajos sin asignar
                </h2>
              </div>
              <dl className="hidden items-center divide-x divide-white/10 lg:flex">
                {indicadores.map((k) => (
                  <div key={k.label} className="px-5 text-right last:pr-2">
                    <dd key={k.value} className={`cot-flash text-[22px] font-semibold leading-none tabular-nums ${k.value > 0 ? k.tone : "text-white/30"}`}>
                      {k.value}
                    </dd>
                    <dt className="mt-1 text-[11.5px] text-white/55">{k.label}</dt>
                  </div>
                ))}
              </dl>
              <button
                type="button"
                onClick={cerrar}
                aria-label="Cerrar ventana"
                className="cot-press absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-[10px] text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="relative flex items-center gap-3 px-5 pb-4 sm:px-6">
              <ProgressBar value={avance} barClass="bg-[#E6A23C]" className="flex-1 bg-white/10!" label="Avance de la sesión" />
              <span className="shrink-0 text-[12.5px] tabular-nums text-white/70">
                <span key={asignados} className="cot-flash font-semibold text-white">
                  {asignados}
                </span>{" "}
                de {total} asignados
              </span>
            </div>
          </header>

          <div className="relative flex min-h-0 flex-1">
            {/* ───── Cola (riel claro) ───── */}
            <aside
              className={`${detalleMovil ? "hidden md:flex" : "flex"} min-h-0 w-full flex-col border-r border-[#F0F0F2] bg-[#FAFAFA] md:w-[22rem] md:shrink-0 lg:w-[24rem] dark:border-[#1F2A3C] dark:bg-[#0F172A]/60`}
              aria-label="Cola de trabajos"
            >
              <div className="space-y-2.5 p-3 pb-2">
                <label className="group/q relative block">
                  <span className="sr-only">Buscar en la cola</span>
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#A1A1AA] transition-colors duration-150 group-focus-within/q:text-[#1B5CFF] dark:group-focus-within/q:text-[#7EA0FF]"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape" && q) {
                        e.preventDefault();
                        e.stopPropagation();
                        setQ("");
                      }
                    }}
                    placeholder="Buscar folio, cliente o servicio…"
                    className={inputClass}
                  />
                  {q ? (
                    <button
                      type="button"
                      onClick={() => setQ("")}
                      aria-label="Limpiar búsqueda"
                      className={`cot-pop absolute right-1.5 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-[8px] text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:bg-white/[0.06] dark:hover:text-white ${focusRing}`}
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  ) : null}
                </label>

                {/* Filtro por tipo: control segmentado; la marca blanca se desliza con `transform`. */}
                <div className="relative grid grid-cols-3 rounded-[11px] bg-[#EDEDF0] p-1 dark:bg-white/[0.05]" role="tablist" aria-label="Tipo de trabajo">
                  <span
                    className="eq-seg-pill pointer-events-none absolute bottom-1 left-1 top-1 w-[calc((100%-0.5rem)/3)] rounded-[8px] bg-white shadow-[0_1px_2px_rgba(9,9,11,0.08)] ring-1 ring-[#E4E4E7] dark:bg-[#1B2539] dark:ring-[#273244]"
                    style={{ transform: `translateX(${tabIdx * 100}%)` }}
                    aria-hidden
                  />
                  {tabs.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      aria-selected={filtro === t.key}
                      onClick={() => setFiltro(t.key)}
                      className={`relative z-[1] inline-flex h-8 items-center justify-center gap-1.5 rounded-[8px] text-[12.5px] font-semibold transition-colors duration-150 ${
                        filtro === t.key ? "text-[#09090B] dark:text-white" : "text-[#71717A] hover:text-[#3F3F46] dark:text-[#8EA0B8] dark:hover:text-[#D6DEEA]"
                      } ${focusRing}`}
                    >
                      {t.label}
                      <span className="text-[11px] font-medium tabular-nums opacity-55">{t.count}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 px-1 pt-0.5 text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
                  <button
                    type="button"
                    onClick={alternarTodos}
                    disabled={ordenVisual.length === 0}
                    className={`group/fila -ml-0.5 inline-flex items-center gap-2 rounded-[7px] py-1 pl-0.5 pr-1.5 font-medium transition-colors duration-150 hover:text-[#09090B] disabled:pointer-events-none disabled:opacity-40 dark:hover:text-white ${focusRing}`}
                  >
                    <Casilla on={todos} mixed={visiblesSel > 0} />
                    {todos ? "Quitar todos" : "Elegir todos"}
                  </button>
                  {visiblesSel > 1 ? (
                    <span key={visiblesSel} className="cot-fade ml-auto">
                      <span className="font-semibold text-[#09090B] dark:text-white">{visiblesSel}</span> elegidos
                    </span>
                  ) : null}
                </div>
              </div>

              <div
                ref={listaRef}
                role="listbox"
                aria-label="Trabajos sin asignar"
                aria-multiselectable="true"
                onKeyDown={onListKey}
                className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-4"
              >
                {n === 0 ? (
                  <p className="cot-fade px-4 py-14 text-center text-[13px] text-[#71717A] dark:text-[#8EA0B8]">No hay trabajos en la cola.</p>
                ) : grupos.length === 0 ? (
                  <div className="cot-fade flex flex-col items-center gap-2 px-4 py-14 text-center">
                    <Search className="size-5 text-[#D3D3D8] dark:text-[#3A4661]" aria-hidden />
                    <p className="text-[13px] text-[#71717A] dark:text-[#8EA0B8]">Sin coincidencias en la cola.</p>
                  </div>
                ) : (
                  grupos.map((g) => (
                    <div key={g.key} role="group" aria-label={`${g.label}: ${g.lista.length}`} className="pt-2">
                      <p className="sticky top-0 z-[1] flex items-center gap-2 bg-[#FAFAFA]/95 px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] dark:bg-[#0F172A]/95">
                        <span className={g.tone}>{g.label}</span>
                        <span className="tabular-nums text-[#A1A1AA] dark:text-[#64748B]">{g.lista.length}</span>
                      </p>
                      <div className="space-y-1">
                        {g.lista.map((p) => (
                          <FilaPendiente
                            key={p.key}
                            p={p}
                            info={infos.get(p.key)!}
                            hoy={hoy}
                            i={indice.get(p.key) ?? 0}
                            seleccionada={selSet.has(p.key)}
                            cursor={p.key === cursor}
                            saliendo={saliendo.has(p.key)}
                            onClick={clickFila}
                            onToggle={toggle}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </aside>

            {/* ───── Contenido + pie ───── */}
            <div className={`${detalleMovil ? "flex" : "hidden md:flex"} relative min-h-0 min-w-0 flex-1 flex-col`}>
              <div ref={scrollRef} className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-[#F7F7F8] dark:bg-[#0B1220]">
                {items.length > 0 ? (
                  <div key={firma} className="mx-auto w-full max-w-3xl space-y-4 p-3 sm:p-5 lg:p-6">
                    {/* Encabezado del contenido (como «Paso N de M» en Proyecto). */}
                    <div className="cot-fade flex items-center gap-3 px-1 pt-1">
                      <button
                        type="button"
                        onClick={() => setDetalleMovil(false)}
                        aria-label="Volver a la cola"
                        className={`cot-press inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-white text-[#52525B] ring-1 ring-[#E4E4E7] md:hidden dark:bg-[#111827] dark:text-[#B7C1D1] dark:ring-[#273244] ${focusRing}`}
                      >
                        <ArrowLeft className="size-[18px]" aria-hidden />
                      </button>
                      <span
                        className="hidden size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#1B5CFF] ring-1 ring-[#E4E4E7] sm:inline-flex dark:bg-[#111827] dark:text-[#7EA0FF] dark:ring-[#273244]"
                        aria-hidden
                      >
                        {uno ? uno.kind === "orden" ? <ClipboardList className="size-5" /> : <FolderKanban className="size-5" /> : <ListChecks className="size-5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1B5CFF] dark:text-[#7EA0FF]">
                          {uno && unoInfo ? `${uno.kind === "orden" ? "Orden de trabajo" : "Proyecto"} · ${unoInfo.folio}` : "Asignación en lote"}
                        </p>
                        <p className="truncate text-[20px] font-semibold leading-tight tracking-[-0.4px] text-[#09090B] dark:text-[#F8FAFC]">
                          {uno && unoInfo ? unoInfo.cliente : `${items.length} trabajos elegidos`}
                        </p>
                      </div>
                      {items.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => {
                            autoSelRef.current = false;
                            setSel([]);
                          }}
                          className={`${btn.ghost} min-h-9! px-3! text-[13px]!`}>
                          Quitar selección
                        </button>
                      ) : null}
                    </div>

                    {/* 1 · Detalle */}
                    {uno && unoInfo ? (
                      <SectionCard
                        id="eq-despacho-detalle"
                        title="Detalle del trabajo"
                        icon={<ClipboardList />}
                        hint={
                          <>
                            Programado para {diaCorto(uno.fecha)} ·{" "}
                            <span className={uno.fecha < hoy ? "font-semibold text-[#8A5D0F] dark:text-[#F2C27A]" : ""}>{relativo(uno.fecha, hoy).toLowerCase()}</span>
                          </>
                        }
                        actions={
                          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#52525B] dark:text-[#B7C1D1]">
                            <span className={`size-2 rounded-full ${unoInfo.estadoDot}`} aria-hidden />
                            {unoInfo.estadoLabel}
                          </span>
                        }
                        index={0}
                      >
                        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                          <Dato icon={<MapPin />} label="Lugar">
                            {unoInfo.sucursal || unoInfo.direccion ? (
                              <>
                                {unoInfo.sucursal ? <span className="block font-medium">{unoInfo.sucursal}</span> : null}
                                {unoInfo.direccion ? <span className="line-clamp-2 text-[13px] text-[#71717A] dark:text-[#8EA0B8]">{unoInfo.direccion}</span> : null}
                              </>
                            ) : (
                              <span className="text-[#A1A1AA]">Sin lugar registrado</span>
                            )}
                          </Dato>
                          <Dato icon={<Clock />} label="Horario">
                            {unoInfo.horario || <span className="text-[#A1A1AA]">Sin horario</span>}
                          </Dato>
                          <Dato icon={<Wrench />} label="Servicios">
                            {unoInfo.servicios.length > 0 ? unoInfo.servicios.join(" · ") : <span className="text-[#A1A1AA]">Sin servicios</span>}
                          </Dato>
                          {unoInfo.equipos ? (
                            <Dato icon={<Package />} label="Equipos">
                              <span className="tabular-nums">
                                {unoInfo.equipos.instalados} de {unoInfo.equipos.total} instalados
                              </span>
                            </Dato>
                          ) : null}
                        </dl>
                        {unoInfo.detalle ? (
                          <div className="rounded-[14px] border border-[#F0E2C0] bg-[#FFFAEF] px-4 py-3 dark:border-[#E6A23C]/20 dark:bg-[#E6A23C]/[0.06]">
                            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#8A5D0F] dark:text-[#F2C27A]">
                              <AlertTriangle className="size-3.5" aria-hidden />
                              {unoInfo.detalleLabel}
                            </p>
                            <p className="mt-1 text-[13.5px] leading-[1.55] text-[#3F3F46] dark:text-[#D6DEEA]">{unoInfo.detalle}</p>
                          </div>
                        ) : null}
                      </SectionCard>
                    ) : (
                      <SectionCard id="eq-despacho-lote" title="Trabajos elegidos" icon={<ListChecks />} hint="Se asignarán todos al mismo técnico." flush index={0}>
                        <ul className="divide-y divide-[#F0F0F2] dark:divide-[#1F2A3C]">
                          {items.map((p) => {
                            const d = infos.get(p.key)!;
                            const Icono = p.kind === "orden" ? ClipboardList : FolderKanban;
                            return (
                              <li key={p.key} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F0F0F2] text-[#71717A] dark:bg-white/[0.05] dark:text-[#8EA0B8]">
                                  <Icono className="size-4" aria-label={TIPO_TONE[p.kind].label} />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[14px] font-semibold text-[#09090B] dark:text-[#F1F5F9]">{d.cliente}</span>
                                  <span className="block truncate text-[12.5px] text-[#71717A] dark:text-[#8EA0B8]">
                                    <span className="font-mono">{d.folio}</span> · {diaCorto(p.fecha)}
                                  </span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggle(p.key)}
                                  aria-label={`Quitar ${d.folio}`}
                                  className={`cot-press inline-flex size-9 shrink-0 items-center justify-center rounded-[9px] text-[#A1A1AA] hover:bg-[#F4F4F5] hover:text-[#09090B] dark:hover:bg-white/[0.06] dark:hover:text-white ${focusRing}`}
                                >
                                  <X className="size-4" aria-hidden />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </SectionCard>
                    )}

                    {/* 2 · Técnico */}
                    <SectionCard
                      id="eq-despacho-tecnico"
                      title="Técnico responsable"
                      icon={<UserRound />}
                      hint={tecnicos.length === 0 ? "No hay técnicos disponibles." : dest ? `Elegido: ${dest.nombre}` : "Quién atenderá el trabajo."}
                      index={1}
                    >
                      {tecnicos.length > 6 ? (
                        <label className="group/t relative block">
                          <span className="sr-only">Buscar técnico</span>
                          <Search
                            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#A1A1AA] transition-colors duration-150 group-focus-within/t:text-[#1B5CFF] dark:group-focus-within/t:text-[#7EA0FF]"
                            aria-hidden
                          />
                          <input
                            type="search"
                            value={qTecnico}
                            onChange={(e) => setQTecnico(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape" && qTecnico) {
                                e.preventDefault();
                                e.stopPropagation();
                                setQTecnico("");
                              }
                            }}
                            placeholder="Buscar técnico…"
                            className={inputClass}
                          />
                        </label>
                      ) : null}
                      <div role="radiogroup" aria-label="Técnico" className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 lg:grid-cols-3">
                        {tecnicosVisibles.map((t) => {
                          const activo = t.key === tecnico;
                          return (
                            <button
                              key={t.key}
                              type="button"
                              role="radio"
                              aria-checked={activo}
                              onClick={() => setTecnico(activo ? "" : t.key)}
                              className={`cot-press flex min-h-[3.5rem] items-center gap-3 rounded-[14px] border px-3 py-2 text-left transition-[background-color,border-color,box-shadow] duration-150 ${
                                activo
                                  ? "border-[#1B5CFF] bg-[#F4F7FF] shadow-[0_0_0_1px_#1B5CFF] dark:border-[#4B7CFF] dark:bg-[#4B7CFF]/10 dark:shadow-[0_0_0_1px_#4B7CFF]"
                                  : "border-[#E7E7EA] bg-white hover:border-[#D3D3D8] hover:bg-[#FAFAFA] dark:border-[#273244] dark:bg-transparent dark:hover:border-[#3A4661]"
                              } ${focusRing}`}
                            >
                              <EquipoAvatar id={t.id} nombre={t.nombre} avatarUrl={t.avatarUrl} size="md" />
                              <span className="min-w-0 flex-1 text-[13.5px] font-semibold leading-tight text-[#09090B] dark:text-[#E2E8F0]">
                                <span className="line-clamp-2">{t.nombre}</span>
                              </span>
                              <span
                                className={`inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color] duration-150 ${
                                  activo ? "border-[#1B5CFF] bg-[#1B5CFF] dark:border-[#4B7CFF] dark:bg-[#4B7CFF]" : "border-[#D3D3D8] dark:border-[#3A4661]"
                                }`}
                                aria-hidden
                              >
                                <Check className={`eq-tick size-3 text-white ${activo ? "scale-100 opacity-100" : "scale-50 opacity-0"}`} strokeWidth={3} />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {tecnicos.length > 0 && tecnicosVisibles.length === 0 ? (
                        <p className="cot-fade py-4 text-center text-[13px] text-[#71717A] dark:text-[#8EA0B8]">Ningún técnico coincide con «{qTecnico.trim()}».</p>
                      ) : null}
                    </SectionCard>

                    {/* 3 · Día */}
                    <SectionCard
                      id="eq-despacho-dia"
                      title="Día de trabajo"
                      icon={<CalendarDays />}
                      hint={usaFechaComun ? `Se programará el ${diaCorto(fechaSel)}.` : "Cada trabajo conserva su fecha."}
                      index={2}
                    >
                      {items.length > 1 ? (
                        <label className="flex cursor-pointer select-none items-center justify-between gap-3 rounded-[14px] border border-[#F0F0F2] bg-[#FAFAFA] px-4 py-3 text-[13.5px] font-medium text-[#09090B] dark:border-[#1F2A3C] dark:bg-[#0F172A]/60 dark:text-[#E2E8F0]">
                          <span>
                            Conservar la fecha de cada trabajo
                            <span className="mt-0.5 block text-[12.5px] font-normal text-[#71717A] dark:text-[#8EA0B8]">Desactívalo para moverlos todos al mismo día.</span>
                          </span>
                          <input type="checkbox" className="peer sr-only" checked={conservarFechas} onChange={(e) => setConservarFechas(e.target.checked)} />
                          <span
                            className="relative inline-flex h-5 w-9 shrink-0 rounded-full bg-[#D4D4D8] transition-colors duration-150 peer-checked:bg-[#1B5CFF] peer-focus-visible:ring-4 peer-focus-visible:ring-[rgba(27,92,255,0.25)] dark:bg-[#3A4661] dark:peer-checked:bg-[#4B7CFF] after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-150 peer-checked:after:translate-x-4"
                            aria-hidden
                          />
                        </label>
                      ) : null}
                      {usaFechaComun ? <CalendarioDia value={fechaSel} original={items[0].fecha} hoy={hoy} onChange={setFecha} /> : null}
                    </SectionCard>
                  </div>
                ) : (
                  <div className="cot-fade flex h-full flex-col items-center justify-center gap-2 px-8 py-16 text-center">
                    {n === 0 ? (
                      <>
                        <span className="cot-pop inline-flex size-16 items-center justify-center rounded-full bg-[#E9F8F0] text-[#04724D] ring-8 ring-[#E9F8F0]/50 dark:bg-[#0F2A1C] dark:text-[#86EFAC] dark:ring-[#0F2A1C]/50" aria-hidden>
                          <CheckCheck className="size-7" />
                        </span>
                        <p className="mt-4 text-[18px] font-semibold tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">Todo asignado</p>
                        <p className="max-w-xs text-[13.5px] text-[#71717A] dark:text-[#8EA0B8]">
                          {asignados > 0 ? `Despachaste ${asignados} ${asignados === 1 ? "trabajo" : "trabajos"} en esta sesión.` : "No quedan trabajos sin técnico."}
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-white text-[#A1A1AA] ring-1 ring-[#E4E4E7] dark:bg-[#111827] dark:text-[#64748B] dark:ring-[#273244]" aria-hidden>
                          <ClipboardList className="size-5" />
                        </span>
                        <p className="mt-2 text-[16px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">Elige un trabajo</p>
                        <p className="max-w-xs text-[13.5px] text-[#71717A] dark:text-[#8EA0B8]">Haz clic en uno de la cola, o marca varias casillas para asignarlos juntos.</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Confirmación breve tras asignar (se va sola). */}
              {confirmacion ? (
                <div key={confirmacion.token} role="status" className="eq-toast-in pointer-events-none absolute inset-x-4 bottom-[5.25rem] z-[2] flex justify-center">
                  <span className="inline-flex max-w-full items-center gap-2.5 rounded-full bg-[#17235B] py-2 pl-2 pr-4 text-[13px] text-white shadow-[0_14px_30px_-12px_rgba(9,9,11,0.55)] dark:bg-[#1B2A63] dark:ring-1 dark:ring-white/10">
                    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[#34D399] text-[#052E1C]" aria-hidden>
                      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
                        <path className="eq-check-draw" d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    </span>
                    <span className="min-w-0 truncate">
                      <span className="font-semibold">{confirmacion.titulo}</span>
                      <span className="text-white/55"> → </span>
                      <span className="font-semibold">{confirmacion.nombre}</span>
                      <span className="text-white/55"> · {confirmacion.detalle}</span>
                    </span>
                  </span>
                </div>
              ) : null}

              {/* Pie (igual que Orden/Proyecto). */}
              <footer className="flex shrink-0 items-center gap-3 border-t border-[#F0F0F2] bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 dark:border-[#1F2A3C] dark:bg-[#111827] sm:px-5 sm:pb-3">
                <button type="button" onClick={cerrar} className={`${btn.secondary} px-3 sm:px-4`}>
                  <X aria-hidden />
                  <span className="hidden sm:inline">Cerrar</span>
                </button>
                <div key={dest?.key ?? "none"} className="eq-row-in flex min-w-0 flex-1 items-center justify-center gap-2.5">
                  {dest && items.length > 0 ? (
                    <>
                      <EquipoAvatar id={dest.id} nombre={dest.nombre} avatarUrl={dest.avatarUrl} size="sm" />
                      <p className="min-w-0 truncate text-[13px] text-[#52525B] dark:text-[#B7C1D1]">
                        <span className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">{dest.nombre}</span>
                        <span className="hidden sm:inline"> · {usaFechaComun ? diaCorto(fechaSel) : "cada uno en su fecha"}</span>
                      </p>
                    </>
                  ) : (
                    <p className="hidden truncate text-[12.5px] text-[#71717A] lg:block dark:text-[#8EA0B8]">
                      {items.length === 0 ? "Elige un trabajo de la cola" : "Elige un técnico para continuar"}
                    </p>
                  )}
                </div>
                <button type="button" disabled={!dest || items.length === 0} onClick={asignar} className={`${btn.primary} px-4`} title="Ctrl + Enter">
                  <Check aria-hidden />
                  {items.length > 1 ? `Asignar ${items.length}` : "Asignar"}
                </button>
              </footer>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
