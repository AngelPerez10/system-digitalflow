/**
 * Selector de técnicos del reporte (combobox multiselección con foto de perfil).
 *
 * El reporte guarda los técnicos en un solo texto (`tecnico_nombre`), así que
 * el valor es la lista de nombres separada por comas («Ana Pérez, Luis Gómez»).
 * Los nombres que coinciden con un usuario muestran su foto; los que no (texto
 * libre de reportes anteriores) se muestran con iniciales y se pueden quitar.
 *
 * Teclado: ↑ ↓ mueven, Enter marca/desmarca, Esc cierra, Retroceso quita el
 * último técnico con el cuadro de búsqueda vacío. Solo lectura (`disabled`):
 * se ven los técnicos sin poder cambiarlos.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Usuario } from "../OrdenesTrabajo/OrdenServicio/shared/ordenesPageTypes";
import { Avatar } from "../Proyectos/shared/ProyectoUi";
import { joinTecnicos, splitTecnicos, usuarioDisplayName } from "./reporteTecnicos";

type Opcion = { id: number; nombre: string; avatarUrl: string };

type Props = {
  id: string;
  value: string;
  onChange: (next: string) => void;
  usuarios: Usuario[];
  /** Solo lectura: muestra los técnicos sin permitir cambiarlos. */
  disabled?: boolean;
  loading?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

export function ReporteTecnicosField({ id, value, onChange, usuarios, disabled = false, loading = false, invalid = false, describedBy }: Props) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxH: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(0);

  const opciones = useMemo<Opcion[]>(
    () =>
      usuarios
        .map((u) => ({ id: u.id, nombre: usuarioDisplayName(u), avatarUrl: String(u.avatar_url || "") }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [usuarios]
  );
  const porNombre = useMemo(() => new Map(opciones.map((o) => [o.nombre.toLowerCase(), o])), [opciones]);

  const seleccionados = useMemo(() => splitTecnicos(value), [value]);
  const seleccionSet = useMemo(() => new Set(seleccionados.map((n) => n.toLowerCase())), [seleccionados]);

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? opciones.filter((o) => o.nombre.toLowerCase().includes(q)) : opciones;
  }, [opciones, search]);

  useEffect(() => {
    setActive(0);
  }, [search, open]);

  // La lista se dibuja en un portal con posición fija (el modal hace scroll y la recortaría);
  // se abre hacia arriba si abajo no caben ~16 rem y sigue al campo al hacer scroll.
  const place = useCallback(() => {
    const r = rootRef.current?.getBoundingClientRect();
    if (!r) return;
    const vh = window.innerHeight;
    const below = vh - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 260 && above > below;
    setPos(up ? { left: r.left, width: r.width, bottom: vh - r.top + 6, maxH: Math.min(320, above) } : { left: r.left, width: r.width, top: r.bottom + 6, maxH: Math.min(320, below) });
  }, []);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    place();
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !popRef.current?.contains(t)) setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (popRef.current?.contains(e.target as Node)) return;
      place();
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  // Los chips pueden cambiar la altura del campo: se recalcula la posición.
  useEffect(() => {
    if (open) place();
  }, [open, place, seleccionados.length]);

  // Mantiene visible la opción activa al navegar con el teclado.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const toggle = (nombre: string) => {
    const key = nombre.toLowerCase();
    const next = seleccionSet.has(key) ? seleccionados.filter((n) => n.toLowerCase() !== key) : [...seleccionados, nombre];
    onChange(joinTecnicos(next));
    setSearch("");
    inputRef.current?.focus();
  };

  const quitar = (nombre: string) => {
    onChange(joinTecnicos(seleccionados.filter((n) => n.toLowerCase() !== nombre.toLowerCase())));
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActive((i) => (filtradas.length ? (i + 1) % filtradas.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActive((i) => (filtradas.length ? (i - 1 + filtradas.length) % filtradas.length : 0));
    } else if (e.key === "Enter") {
      if (open && filtradas[active]) {
        e.preventDefault();
        toggle(filtradas[active].nombre);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    } else if (e.key === "Backspace" && !search && seleccionados.length > 0) {
      quitar(seleccionados[seleccionados.length - 1]);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const activeId = open && filtradas[active] ? `${listboxId}-opt-${active}` : undefined;

  return (
    <div ref={rootRef} className="relative">
      <div
        className={cn(
          "flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-[10px] border bg-white px-2 py-1.5 transition-[border-color,box-shadow] duration-150 dark:bg-[#0F172A]",
          disabled
            ? "cursor-not-allowed border-[#E4E4E7] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#111827]"
            : open
              ? "border-[#1B5CFF] ring-4 ring-[rgba(27,92,255,0.14)] dark:border-[#4B7CFF] dark:ring-[rgba(75,124,255,0.24)]"
              : "cursor-text border-[#E4E4E7] hover:border-[#D3D3D8] dark:border-[#273244] dark:hover:border-[#3A4661]",
          invalid && !disabled && "border-[#C22B2B]"
        )}
        onClick={() => {
          if (disabled) return;
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        {seleccionados.map((nombre) => {
          const o = porNombre.get(nombre.toLowerCase());
          return (
            <span
              key={nombre}
              className="cot-pop inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#E4E4E7] bg-[#FAFAFB] py-0.5 pl-0.5 pr-2 text-[13.5px] font-medium text-[#18181B] dark:border-[#273244] dark:bg-[#0F172A] dark:text-[#E2E8F0]"
            >
              <Avatar person={{ id: o?.id ?? null, nombre, avatar_url: o?.avatarUrl }} size="sm" />
              <span className="min-w-0 truncate">{nombre}</span>
              {!disabled ? (
                <button
                  type="button"
                  aria-label={`Quitar a ${nombre}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    quitar(nombre);
                  }}
                  className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[#A1A1AA] transition-colors hover:bg-[#FEF2F2] hover:text-[#C22B2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:hover:bg-[#3F1518] dark:hover:text-[#F87171]"
                >
                  <X className="size-3" aria-hidden />
                </button>
              ) : null}
            </span>
          );
        })}

        {!disabled ? (
          <>
            <input
              ref={inputRef}
              id={id}
              type="text"
              role="combobox"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={activeId}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              autoComplete="off"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder={seleccionados.length === 0 ? (loading ? "Cargando técnicos…" : "Buscar y agregar técnicos…") : "Agregar otro…"}
              className="min-w-[8rem] flex-1 bg-transparent px-1.5 py-1 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none placeholder:text-[#A1A1AA] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8]"
            />
            <ChevronDown
              className={cn("mr-1 size-4 shrink-0 text-[#A1A1AA] transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")}
              aria-hidden
            />
          </>
        ) : seleccionados.length === 0 ? (
          <span id={id} className="px-1.5 text-[14px] text-[#8EA0B8]">
            Sin técnico asignado
          </span>
        ) : null}
      </div>

      {open && !disabled && pos
        ? createPortal(
        <div
          ref={popRef}
          style={{ position: "fixed", left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxH, zIndex: 2147483000 } as CSSProperties}
          className="cot-pop overflow-hidden rounded-[14px] border border-[#E7E7EA] bg-white shadow-[0_16px_40px_-18px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:bg-[#111827]"
        >
          <ul id={listboxId} ref={listRef} role="listbox" aria-multiselectable aria-label="Técnicos" className="custom-scrollbar overflow-y-auto p-1"
            style={{ maxHeight: pos.maxH - 2 }}>
            {filtradas.length === 0 ? (
              <li className="px-3 py-4 text-center text-[13px] text-[#71717A] dark:text-[#8EA0B8]">
                {loading ? "Cargando…" : usuarios.length === 0 ? "No se pudo cargar la lista de técnicos." : "Sin resultados"}
              </li>
            ) : (
              filtradas.map((o, idx) => {
                const checked = seleccionSet.has(o.nombre.toLowerCase());
                return (
                  <li
                    key={o.id}
                    id={`${listboxId}-opt-${idx}`}
                    data-idx={idx}
                    role="option"
                    aria-selected={checked}
                    onMouseEnter={() => setActive(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggle(o.nombre)}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[9px] px-2 text-[14.5px] transition-colors duration-150",
                      idx === active ? "bg-[#F4F4F5] dark:bg-white/6" : "",
                      checked ? "font-medium text-[#1244D1] dark:text-[#C9D7FF]" : "text-[#18181B] dark:text-[#D6DEEA]"
                    )}
                  >
                    <Avatar person={{ id: o.id, nombre: o.nombre, avatar_url: o.avatarUrl }} />
                    <span className="min-w-0 flex-1 truncate">{o.nombre}</span>
                    <span
                      className={cn(
                        "inline-flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-150",
                        checked ? "border-[#1B5CFF] bg-[#1B5CFF] text-white dark:border-[#4B7CFF] dark:bg-[#4B7CFF]" : "border-[#D3D3D8] dark:border-[#3A4661]"
                      )}
                      aria-hidden
                    >
                      {checked ? <Check className="size-3" strokeWidth={3} /> : null}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </div>,
        document.body,
      )
    : null}
    </div>
  );
}
