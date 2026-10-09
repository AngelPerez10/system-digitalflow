/**
 * «Prellenar desde contactos»: tarjeta en el formulario + modal de búsqueda.
 *
 * Sustituye al combobox (un menú flotante que se cerraba al hacer scroll de la
 * página). El modal tiene espacio para nombre, correo, RFC y tipo; se filtra por
 * tipo en el servidor (`?tipo=`) y se navega con ↑ ↓ y Enter desde el buscador
 * (patrón combobox: el foco se queda en el campo y `aria-activedescendant`
 * marca la fila activa).
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Building2, Check, ChevronRight, Mail, RefreshCw, Search, SearchX, Truck, UserRound, UsersRound, X } from "lucide-react";
import { AppModal } from "@/components/ui/modal-kit/ModalKit";
import { fetchClientesPage } from "@/components/clientes";
import { cn } from "@/lib/utils";
import type { Cliente } from "@/types/cliente";
import { labelClass } from "@/pages/Configuracion/usuarios/usuariosStyles";
import { btn, btnSm, focusRing, fontSans, iconBtnDanger, pageSearchInputClass } from "../shared/contratoTokens";

type TipoApi = NonNullable<Cliente["tipo"]>;

export type ContactoResumen = {
  id: number;
  nombre: string;
  correo?: string;
  rfc?: string;
  tipo?: TipoApi | "";
};

const PAGE_SIZE = 50;
const DEBOUNCE_MS = 220;

const FILTROS: { id: "" | TipoApi; label: string; Icon: typeof Building2; activo: string }[] = [
  {
    id: "",
    label: "Todos",
    Icon: UsersRound,
    activo:
      "bg-white text-[#17235B] shadow-[0_1px_2px_rgba(9,9,11,0.08)] ring-1 ring-[#E4E4E7] dark:bg-[#1B2539] dark:text-[#F8FAFC] dark:ring-[#273244]",
  },
  {
    id: "EMPRESA",
    label: "Empresas",
    Icon: Building2,
    activo: "bg-[#EEF3FF] text-[#1244D1] ring-1 ring-[#D7E3FF] dark:bg-[#1B2A63] dark:text-[#C5D4FF] dark:ring-[#1B2A63]",
  },
  {
    id: "PERSONA_FISICA",
    label: "Personas",
    Icon: UserRound,
    activo: "bg-[#FFF8EB] text-[#8A5D0F] ring-1 ring-[#F0D7A3] dark:bg-[#E6A23C]/15 dark:text-[#F2C27A] dark:ring-[#E6A23C]/30",
  },
  {
    id: "PROVEEDOR",
    label: "Proveedores",
    Icon: Truck,
    activo: "bg-[#E9F8F0] text-[#04724D] ring-1 ring-[#BFE6D4] dark:bg-[#22A06B]/15 dark:text-[#7DDEAE] dark:ring-[#22A06B]/30",
  },
];

function rielTipo(tipo?: TipoApi | "") {
  if (tipo === "PERSONA_FISICA") return "bg-[#E6A23C]";
  if (tipo === "PROVEEDOR") return "bg-[#04724D] dark:bg-[#22A06B]";
  if (tipo === "EMPRESA") return "bg-[#1B5CFF] dark:bg-[#4B7CFF]";
  return "bg-[#D4D4D8] dark:bg-[#3A4661]";
}

/** Ícono y tono por tipo; el azul queda para la acción y la selección. */
const TIPO_META: Record<TipoApi, { label: string; Icon: typeof Building2; tile: string }> = {
  EMPRESA: {
    label: "Empresa",
    Icon: Building2,
    tile: "bg-[#F4F4F5] text-[#52525B] dark:bg-white/[0.06] dark:text-[#B7C1D1]",
  },
  PERSONA_FISICA: {
    label: "Persona",
    Icon: UserRound,
    tile: "bg-[#FFF8EB] text-[#8A5D0F] dark:bg-[#E6A23C]/15 dark:text-[#E6A23C]",
  },
  PROVEEDOR: {
    label: "Proveedor",
    Icon: Truck,
    tile: "bg-[#E9F8F0] text-[#04724D] dark:bg-[#22A06B]/15 dark:text-[#22A06B]",
  },
};

/** El catálogo a veces guarda varios correos en un campo («a@x.mx || b@x.mx»). */
function separarCorreos(raw = ""): string[] {
  return raw
    .split(/\s*(?:\|\||[|;,\s])\s*/)
    .map((c) => c.trim())
    .filter(Boolean);
}

function contactoDesdeCliente(c: Pick<Cliente, "id" | "nombre" | "correo" | "rfc" | "tipo">): ContactoResumen {
  return {
    id: c.id,
    nombre: String(c.nombre || "").trim() || `Contacto ${c.id}`,
    correo: String(c.correo || "").trim(),
    rfc: String(c.rfc || "").trim().toUpperCase(),
    tipo: c.tipo || "",
  };
}

function TipoTile({ tipo, size = "md" }: { tipo?: TipoApi | ""; size?: "md" | "lg" }) {
  const meta = tipo ? TIPO_META[tipo] : TIPO_META.EMPRESA;
  const Icon = meta.Icon;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        size === "lg" ? "size-11 rounded-[12px]" : "size-10 rounded-[10px]",
        meta.tile,
      )}
    >
      <Icon className={size === "lg" ? "size-5" : "size-[18px]"} strokeWidth={1.75} />
    </span>
  );
}

function TipoChip({ tipo }: { tipo?: TipoApi | "" }) {
  if (!tipo) return null;
  const tono =
    tipo === "PERSONA_FISICA"
      ? "bg-[#FFF8EB] text-[#8A5D0F] ring-[#F0D7A3] dark:bg-[#E6A23C]/15 dark:text-[#F2C27A] dark:ring-[#E6A23C]/30"
      : tipo === "PROVEEDOR"
        ? "bg-[#E9F8F0] text-[#04724D] ring-[#BFE6D4] dark:bg-[#22A06B]/15 dark:text-[#7DDEAE] dark:ring-[#22A06B]/30"
        : "bg-[#EEF3FF] text-[#1244D1] ring-[#D7E3FF] dark:bg-[#1B2A63] dark:text-[#C5D4FF] dark:ring-[#1B2A63]";
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", tono)}>
      {TIPO_META[tipo].label}
    </span>
  );
}

function CorreoLinea({ correo, vacio = "Sin correo registrado" }: { correo?: string; vacio?: string }) {
  const [principal, ...otros] = separarCorreos(correo);
  if (!principal) return <span className="italic text-[#A1A1AA] dark:text-[#64748B]">{vacio}</span>;
  return (
    <span className="flex min-w-0 items-center gap-1">
      <Mail className="size-3 shrink-0" aria-hidden />
      <span className="truncate">{principal}</span>
      {otros.length > 0 ? (
        <span className="shrink-0 tabular-nums text-[#A1A1AA] dark:text-[#64748B]" title={otros.join(", ")}>
          +{otros.length}
        </span>
      ) : null}
    </span>
  );
}

/* ------------------------------------------------------------------ campo */

type Props = {
  label?: string;
  value: ContactoResumen | null;
  onChange: (contacto: ContactoResumen | null) => void;
  disabled?: boolean;
  /** Mientras se traen los datos completos del contacto elegido. */
  cargando?: boolean;
};

export default function ContactoPicker({
  label = "Prellenar desde contactos (opcional)",
  value,
  onChange,
  disabled = false,
  cargando = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div>
      <span id={labelId} className={labelClass}>
        {label}
      </span>

      {value ? (
        <div
          key={value.id}
          className="cot-fade relative flex items-center gap-3 overflow-hidden rounded-[14px] border border-[#E4E4E7] bg-white p-3 pl-4 dark:border-[#273244] dark:bg-[#0F172A]"
          aria-labelledby={labelId}
          role="group"
        >
          <span className="absolute inset-y-0 left-0 w-1 bg-[#E6A23C]" aria-hidden />
          <TipoTile tipo={value.tipo} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-[15px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">
                {value.nombre}
              </p>
              <TipoChip tipo={value.tipo} />
            </div>
            <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[12.5px] text-[#71717A] dark:text-[#8EA0B8]">
              {cargando ? (
                <span className="inline-flex items-center gap-1.5" role="status">
                  <RefreshCw className="size-3 animate-spin" aria-hidden />
                  Copiando datos del contacto…
                </span>
              ) : (
                <CorreoLinea correo={value.correo} />
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              ref={triggerRef}
              type="button"
              disabled={disabled}
              onClick={() => setOpen(true)}
              className={cn(btn.secondary, btnSm, "cot-press")}
            >
              Cambiar
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(null)}
              aria-label={`Quitar a ${value.nombre} y borrar los datos que se copiaron`}
              title="Quitar contacto"
              className={iconBtnDanger}
            >
              <X aria-hidden />
            </button>
          </div>
        </div>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          aria-labelledby={labelId}
          aria-haspopup="dialog"
          className={cn(
            "cot-press group relative flex w-full items-center gap-3 overflow-hidden rounded-[14px] border border-[#E4E4E7] bg-white p-3 pl-4 text-left transition-colors hover:border-[#1B5CFF] hover:bg-[#F7F9FF] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#0F172A] dark:hover:border-[#4B7CFF] dark:hover:bg-[#1B2A63]/40",
            focusRing,
          )}
        >
          <span className="absolute inset-y-0 left-0 w-1 bg-[#E6A23C]" aria-hidden />
          <span
            aria-hidden
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63] dark:text-[#9BB6FF]"
          >
            <UsersRound className="size-5" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">
              Elegir de Contactos
            </span>
            <span className="block truncate text-[12.5px] text-[#71717A] dark:text-[#8EA0B8]">
              Busca por nombre, correo o RFC y se copian sus datos al contrato.
            </span>
          </span>
          <ChevronRight
            className="size-4 shrink-0 text-[#A1A1AA] transition-transform group-hover:translate-x-0.5 group-hover:text-[#1B5CFF] dark:text-[#64748B]"
            aria-hidden
          />
        </button>
      )}

      <ContactoPickerModal
        open={open}
        seleccionadoId={value?.id ?? null}
        onClose={() => {
          setOpen(false);
          requestAnimationFrame(() => triggerRef.current?.focus());
        }}
        onElegir={(c) => {
          setOpen(false);
          onChange(c);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ modal */

type Estado =
  | { fase: "cargando" }
  | { fase: "error"; mensaje: string }
  | { fase: "listo"; filas: ContactoResumen[]; total: number };

function ContactoPickerModal({
  open,
  seleccionadoId,
  onClose,
  onElegir,
}: {
  open: boolean;
  seleccionadoId: number | null;
  onClose: () => void;
  onElegir: (c: ContactoResumen) => void;
}) {
  const titleId = useId();
  const descId = useId();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const resultadosRef = useRef<HTMLDivElement>(null);

  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState<"" | TipoApi>("");
  const [estado, setEstado] = useState<Estado>({ fase: "cargando" });
  const [activo, setActivo] = useState(0);
  /** La fila activa solo se marca (y la lista solo se desplaza) al navegar con el teclado; el ratón usa :hover. */
  const [teclado, setTeclado] = useState(false);
  const [intento, setIntento] = useState(0);

  // Cada apertura empieza limpia y con el foco en el buscador.
  useEffect(() => {
    if (!open) return;
    setBusqueda("");
    setTipo("");
    setActivo(0);
    setTeclado(false);
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    setEstado({ fase: "cargando" });
    const t = window.setTimeout(async () => {
      try {
        const { rows, total } = await fetchClientesPage(busqueda, {
          tipo: tipo || undefined,
          pageSize: PAGE_SIZE,
          signal: ctrl.signal,
        });
        const filas = rows.filter((c) => c && c.id != null).map(contactoDesdeCliente);
        setEstado({ fase: "listo", filas, total });
        if (resultadosRef.current) resultadosRef.current.scrollTop = 0;
        setActivo(0);
      } catch {
        if (ctrl.signal.aborted) return;
        setEstado({ fase: "error", mensaje: "No se pudieron cargar los contactos." });
      }
    }, busqueda ? DEBOUNCE_MS : 0);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [open, busqueda, tipo, intento]);

  const filas = estado.fase === "listo" ? estado.filas : [];

  // Mantener visible la fila activa solo al navegar con el teclado.
  useEffect(() => {
    if (!teclado) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activo}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activo, teclado]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!filas.length) return;
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) setTeclado(true);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActivo((i) => Math.min(filas.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((i) => Math.max(0, i - 1));
    } else if (e.key === "Home" && e.ctrlKey) {
      e.preventDefault();
      setActivo(0);
    } else if (e.key === "End" && e.ctrlKey) {
      e.preventDefault();
      setActivo(filas.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const fila = filas[activo];
      if (fila) onElegir(fila);
    }
  };

  const onTabsKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const i = FILTROS.findIndex((t) => t.id === tipo);
      const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!delta) return;
      e.preventDefault();
      const next = FILTROS[(i + delta + FILTROS.length) % FILTROS.length];
      setTipo(next.id);
      e.currentTarget.querySelector<HTMLButtonElement>(`[data-tipo="${next.id}"]`)?.focus();
    },
    [tipo],
  );

  const resumen = useMemo(() => {
    if (estado.fase !== "listo") return "";
    const { filas: f, total } = estado;
    if (!f.length) return "Sin resultados";
    if (total > f.length) return `Mostrando ${f.length} de ${total.toLocaleString("es-MX")} · escribe para afinar`;
    return f.length === 1 ? "1 contacto" : `${f.length} contactos`;
  }, [estado]);

  const activoId = teclado && filas[activo] ? `${listId}-${filas[activo].id}` : undefined;

  return (
    <AppModal
      open={open}
      onClose={onClose}
      size="lg"
      dismissOnBackdrop
      labelledBy={titleId}
      describedBy={descId}
      className={cn(fontSans, "h-[min(680px,calc(100dvh-2rem))] sm:max-w-[44rem]!")}
    >
      <header className="relative shrink-0 overflow-hidden bg-[#17235B] text-white dark:bg-[#1B2A63]">
        <div className="pointer-events-none absolute -right-16 -top-24 size-56 rounded-full bg-[#E6A23C]/20 blur-3xl" aria-hidden />
        <div className="relative flex items-center gap-3 px-5 py-3.5 pr-16">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C] ring-1 ring-inset ring-[#E6A23C]/30">
            <UsersRound className="size-4" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">Directorio</p>
            <h2 id={titleId} className="text-[18px] font-semibold leading-tight tracking-[-0.4px]">
              Elegir contacto
            </h2>
            <p id={descId} className="mt-0.5 text-[13px] leading-5 text-white/80">
              Sus datos fiscales se copian al contrato; puedes corregirlos después.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar ventana"
          className="absolute right-3 top-3 inline-flex size-11 items-center justify-center rounded-[10px] text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <X className="size-4" aria-hidden />
        </button>
        <div className="h-[3px] bg-[#E6A23C]" aria-hidden />
      </header>

      {/* Buscador + filtro por tipo */}
      <div className="shrink-0 space-y-3 border-b border-[#F0F0F2] bg-[#FAFAFA] px-5 py-3 dark:border-[#1F2A3C] dark:bg-[#0F172A]/70">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#A1A1AA] dark:text-[#64748B]"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={activoId}
            aria-autocomplete="list"
            aria-label="Buscar contacto por nombre, correo o RFC"
            autoComplete="off"
            spellCheck={false}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Nombre, correo o RFC"
            className={cn(pageSearchInputClass, "[&::-webkit-search-cancel-button]:hidden")}
          />
          {busqueda ? (
            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                inputRef.current?.focus();
              }}
              aria-label="Limpiar búsqueda"
              className={cn(
                "absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-[8px] text-[#A1A1AA] hover:bg-[#F4F4F5] hover:text-[#52525B] dark:text-[#64748B] dark:hover:bg-white/[0.06] dark:hover:text-[#D6DEEA]",
                focusRing,
              )}
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>

        <div
          role="tablist"
          aria-label="Tipo de contacto"
          onKeyDown={onTabsKeyDown}
          className="flex gap-1 overflow-x-auto rounded-[12px] bg-[#F4F4F5] p-1 dark:bg-[#0F172A]"
        >
          {FILTROS.map((t) => {
            const sel = t.id === tipo;
            const Icon = t.Icon;
            return (
              <button
                key={t.id || "todos"}
                type="button"
                role="tab"
                data-tipo={t.id}
                aria-selected={sel}
                aria-controls={listId}
                tabIndex={sel ? 0 : -1}
                onClick={() => setTipo(t.id)}
                className={cn(
                  "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[9px] px-3 text-[13px] font-medium transition-colors [&_svg]:size-3.5",
                  focusRing,
                  sel ? t.activo : "text-[#71717A] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:text-[#F8FAFC]",
                )}
              >
                <Icon aria-hidden />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Resultados */}
      <div ref={resultadosRef} className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2" aria-busy={estado.fase === "cargando"}>
        {estado.fase === "cargando" ? (
          <ul aria-hidden className="space-y-1 p-1">
            {Array.from({ length: 7 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 rounded-[12px] px-3 py-2.5">
                <span className="size-10 shrink-0 animate-pulse rounded-[10px] bg-[#F4F4F5] dark:bg-white/[0.06]" />
                <span className="flex-1 space-y-2">
                  <span
                    className="block h-3 animate-pulse rounded-full bg-[#F4F4F5] dark:bg-white/[0.06]"
                    style={{ width: `${48 + ((i * 17) % 32)}%` }}
                  />
                  <span className="block h-2.5 w-1/3 animate-pulse rounded-full bg-[#F4F4F5] dark:bg-white/[0.06]" />
                </span>
              </li>
            ))}
          </ul>
        ) : estado.fase === "error" ? (
          <div className="cot-fade grid h-full place-items-center px-6 text-center" role="alert">
            <div>
              <p className="text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{estado.mensaje}</p>
              <p className="mt-1 text-[13px] text-[#71717A] dark:text-[#8EA0B8]">Revisa tu conexión e inténtalo de nuevo.</p>
              <button type="button" onClick={() => setIntento((n) => n + 1)} className={cn(btn.secondary, "cot-press mt-4")}>
                <RefreshCw aria-hidden /> Reintentar
              </button>
            </div>
          </div>
        ) : filas.length === 0 ? (
          <div className="cot-fade grid h-full place-items-center px-6 text-center">
            <div>
              <span className="cot-tick mx-auto inline-flex size-14 items-center justify-center rounded-[16px] bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63] dark:text-[#9BB6FF]">
                <SearchX className="size-6" aria-hidden />
              </span>
              <p className="mt-4 text-[16px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">
                Sin coincidencias
              </p>
              <p className="mx-auto mt-1 max-w-xs text-[13px] text-[#71717A] dark:text-[#8EA0B8]">
                {busqueda
                  ? `No hay contactos que coincidan con «${busqueda.trim()}».`
                  : "No hay contactos de este tipo todavía."}{" "}
                Puedes capturar los datos a mano.
              </p>
              {busqueda || tipo ? (
                <button
                  type="button"
                  onClick={() => {
                    setBusqueda("");
                    setTipo("");
                    inputRef.current?.focus();
                  }}
                  className={cn(btn.ghost, "cot-press mt-3")}
                >
                  Limpiar filtros
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <ul
            key={`${tipo}|${busqueda.trim()}`}
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Contactos"
            className="space-y-0.5 p-1"
            onMouseMove={teclado ? () => setTeclado(false) : undefined}
          >
            {filas.map((c, i) => {
              const esActivo = teclado && i === activo;
              const esSel = c.id === seleccionadoId;
              return (
                <li
                  key={c.id}
                  id={`${listId}-${c.id}`}
                  data-index={i}
                  role="option"
                  aria-selected={esSel}
                  onClick={() => onElegir(c)}
                  style={{ "--cot-i": Math.min(i, 12) } as CSSProperties}
                  className={cn(
                    "cot-rise group relative flex min-h-[60px] cursor-pointer items-center gap-3 rounded-[12px] py-2.5 pl-4 pr-3 transition-colors",
                    esSel
                      ? "bg-[#EEF3FF] dark:bg-[#1B2A63]/70"
                      : esActivo
                        ? "bg-[#F4F4F5] dark:bg-white/[0.06]"
                        : "hover:bg-[#F4F4F5] dark:hover:bg-white/[0.06]",
                  )}
                >
                  <span className={cn("absolute inset-y-2.5 left-1.5 w-[3px] rounded-full", rielTipo(c.tipo))} aria-hidden />
                  <TipoTile tipo={c.tipo} />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-[14.5px] font-medium tracking-[-0.1px]",
                        esSel ? "text-[#1244D1] dark:text-[#9BB6FF]" : "text-[#09090B] dark:text-[#F8FAFC]",
                      )}
                    >
                      {c.nombre}
                    </p>
                    <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[12.5px] text-[#71717A] dark:text-[#8EA0B8]">
                      <CorreoLinea correo={c.correo} />
                      {c.rfc ? (
                        <>
                          <span aria-hidden className="text-[#D4D4D8] dark:text-[#273244]">
                            ·
                          </span>
                          <span className="hidden shrink-0 font-mono text-[11.5px] sm:inline">{c.rfc}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <span className="hidden sm:inline-flex">
                    <TipoChip tipo={c.tipo} />
                  </span>
                  <span className="inline-flex size-5 shrink-0 items-center justify-center" aria-hidden>
                    {esSel ? (
                      <Check className="cot-tick size-4 text-[#1B5CFF] dark:text-[#9BB6FF]" strokeWidth={2.5} />
                    ) : (
                      <ChevronRight
                        className={cn(
                          "size-4 text-[#A1A1AA] transition-opacity dark:text-[#64748B]",
                          esActivo ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                        )}
                      />
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Pie: conteo + atajos */}
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#F0F0F2] bg-[#FAFAFA] px-6 py-3 text-[12px] text-[#71717A] dark:border-[#1F2A3C] dark:bg-[#0F172A]/60 dark:text-[#8EA0B8]">
        <span aria-live="polite" className="tabular-nums">
          {estado.fase === "cargando" ? "Buscando contactos…" : resumen}
        </span>
        <span className="hidden items-center gap-3 sm:flex" aria-hidden>
          <span className="inline-flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navegar
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd>Enter</Kbd> elegir
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd>Esc</Kbd> cerrar
          </span>
        </span>
      </footer>
    </AppModal>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-[#E4E4E7] bg-white px-1 font-sans text-[10.5px] font-medium text-[#52525B] shadow-[0_1px_0_#E4E4E7] dark:border-[#273244] dark:bg-[#111827] dark:text-[#B7C1D1] dark:shadow-[0_1px_0_#273244]">
      {children}
    </kbd>
  );
}
