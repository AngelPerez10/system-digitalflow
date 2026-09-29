/**
 * Piezas visuales compartidas del tablero Equipo (avatar, status de orden,
 * selector «Mover a…»).
 */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowRightLeft, CalendarClock, Inbox } from "lucide-react";
import { resolveMediaUrl } from "@/config/api";
import { erpSansStyle } from "../../OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import type { EquipoDestino } from "../shared/equipoDnd";
import { ordenTone, rowActionBtn } from "../shared/equipoTokens";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts.length === 1 ? parts[0].slice(0, 2) : `${parts[0][0]}${parts[parts.length - 1][0]}`).toUpperCase();
}

const AVATAR_SIZE = {
  xs: "size-6 text-[9.5px]",
  sm: "size-7 text-[10.5px]",
  md: "size-9 text-[12px]",
  lg: "size-11 text-[14px]",
  xl: "size-16 text-[20px]",
} as const;

/** Avatar de técnico; `id == null` pinta el ícono de la bandeja «Sin asignar». */
export function EquipoAvatar({
  id,
  nombre,
  avatarUrl,
  size = "md",
}: {
  id: number | null;
  nombre: string;
  avatarUrl?: string | null;
  size?: keyof typeof AVATAR_SIZE;
}) {
  const [broken, setBroken] = useState(false);
  const sz = AVATAR_SIZE[size];
  if (id == null) {
    return (
      <span
        className={`${sz} inline-flex shrink-0 items-center justify-center rounded-full bg-[#FFF4E0] text-[#8A5D0F] ring-1 ring-inset ring-[#F0D7A3] dark:bg-[rgba(230,162,60,0.14)] dark:text-[#F2C27A] dark:ring-[rgba(230,162,60,0.3)] [&_svg]:size-[45%]`}
        aria-hidden
      >
        <Inbox />
      </span>
    );
  }
  const src = avatarUrl && !broken ? resolveMediaUrl(avatarUrl) : "";
  return (
    <span
      className={`${sz} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EEF3FF] font-semibold text-[#17235B] ring-2 ring-white dark:bg-[#1B2A63] dark:text-[#C9D7FF] dark:ring-[#111827]`}
      aria-hidden
    >
      {src ? (
        <img src={src} alt="" loading="lazy" decoding="async" className="size-full object-cover" onError={() => setBroken(true)} />
      ) : (
        initials(nombre)
      )}
    </span>
  );
}

/* --------------------------------------------------------------------------
   Status de orden (misma paleta que la tabla de Órdenes)
   -------------------------------------------------------------------------- */

export function OrdenStatusPill({ status }: { status: unknown }) {
  const t = ordenTone(status);
  return (
    <span className={`inline-flex h-5 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[11px] font-semibold ring-1 ring-inset ${t.pill}`}>
      <span className={`size-1.5 rounded-full ${t.dot}`} aria-hidden />
      {t.label}
    </span>
  );
}

/* --------------------------------------------------------------------------
   Botones
   -------------------------------------------------------------------------- */

type MenuItem = { key: string; label: string };

/**
 * Botón con ícono que abre un menú propio (en lugar del `<select>` nativo, cuya
 * lista no respeta el modo oscuro). Va en un portal con posición fija para no
 * recortarse dentro de las tarjetas; se cierra con Esc o clic afuera y sigue al botón al hacer scroll.
 * Teclado: Enter/Espacio/↓ abren, ↑↓ Inicio Fin navegan, Esc devuelve el foco.
 */
function ActionMenu({
  label,
  title,
  heading,
  icon,
  items,
  onSelect,
  className,
}: {
  label: string;
  title: string;
  heading: string;
  icon: ReactNode;
  items: MenuItem[];
  onSelect: (key: string) => void;
  className: string;
}) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const menuId = useId();
  const open = pos != null;

  const close = (refocus = false) => {
    setPos(null);
    if (refocus) btnRef.current?.focus();
  };
  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const right = Math.max(8, window.innerWidth - r.right);
    // Abre hacia arriba si abajo no caben ~15 rem de lista.
    setPos(
      window.innerHeight - r.bottom < 260 && r.top > 260
        ? { bottom: window.innerHeight - r.top + 6, right }
        : { top: r.bottom + 6, right },
    );
  };
  const openMenu = place;

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) setPos(null);
    };
    // Scroll de la página: el menú sigue al botón; el scroll de su propia lista no lo mueve.
    const onScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      place();
    };
    const onDismiss = () => setPos(null);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onDismiss);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onDismiss);
    };
  }, [open]);

  const onMenuKey = (e: React.KeyboardEvent) => {
    const els = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const i = els.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => {
      e.preventDefault();
      els[(n + els.length) % els.length]?.focus();
    };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(els.length - 1);
    else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (e.key === "Tab") setPos(null);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            openMenu();
          }
        }}
        className={`${className} ${open ? "bg-[#EEF3FF]! text-[#1244D1]! dark:bg-[#1B2A63]/60! dark:text-[#C9D7FF]!" : ""}`}
      >
        {icon}
      </button>
      {pos
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={heading}
              onKeyDown={onMenuKey}
              onClick={(e) => e.stopPropagation()}
              style={{ ...erpSansStyle, position: "fixed", top: pos.top, bottom: pos.bottom, right: pos.right }}
              className={`cot-pop z-950 w-56 max-w-[calc(100vw-1rem)] overflow-hidden rounded-[14px] border border-[#E4E4E7] bg-white text-left shadow-[0_24px_48px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_24px_48px_-16px_rgba(0,0,0,0.7)] ${pos.bottom != null ? "origin-bottom-right" : "origin-top-right"}`}
            >
              <p className="border-b border-[#F0F0F2] px-3 pb-1.5 pt-2.5 text-[10.5px] font-semibold uppercase tracking-widest text-[#6E6E77] dark:border-[#1F2A3C] dark:text-[#8EA0B8]">
                {heading}
              </p>
              <div className="custom-scrollbar max-h-60 overflow-y-auto overscroll-contain p-1">
                {items.length === 0 ? (
                  <p className="px-2.5 py-3 text-[12.5px] text-[#71717A] dark:text-[#8EA0B8]">Sin opciones</p>
                ) : (
                  items.map((it) => (
                    <button
                      key={it.key}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setPos(null);
                        btnRef.current?.focus();
                        onSelect(it.key);
                      }}
                      className="flex h-9 w-full items-center rounded-[9px] px-2.5 text-left text-[13px] font-medium text-[#3F3F46] transition-colors duration-150 hover:bg-[#F4F4F5] focus-visible:bg-[#EEF3FF] focus-visible:text-[#1244D1] focus-visible:outline-none dark:text-[#D6DEEA] dark:hover:bg-white/6 dark:focus-visible:bg-[#1B2A63]/60 dark:focus-visible:text-[#C9D7FF]"
                    >
                      <span className="min-w-0 flex-1 truncate">{it.label}</span>
                    </button>
                  ))
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/** «Mover a…»: menú con los técnicos destino (teclado y táctil). */
export function MoverA({
  label,
  destinos,
  currentKey,
  onPick,
  compact = false,
}: {
  label: string;
  destinos: EquipoDestino[];
  currentKey: string;
  onPick: (to: EquipoDestino) => void;
  /** Botón de 28 px (acciones de las tarjetas del tablero). */
  compact?: boolean;
}) {
  const size = compact ? "size-7! rounded-xl! [&_svg]:size-3.5!" : "";
  const items = destinos.filter((d) => d.key !== currentKey).map((d) => ({ key: d.key, label: d.nombre }));
  return (
    <ActionMenu
      label={label}
      title="Mover a otro técnico"
      heading="Mover a…"
      icon={<ArrowRightLeft aria-hidden />}
      items={items}
      onSelect={(k) => {
        const dest = destinos.find((d) => d.key === k);
        if (dest) onPick(dest);
      }}
      className={`${rowActionBtn} ${size}`}
    />
  );
}

/** «Cambiar día»: menú con los días de la semana (teclado y táctil). */
export function MoverDia({
  label,
  dias,
  actual,
  onPick,
}: {
  label: string;
  /** Opciones: `YYYY-MM-DD` + etiqueta visible («Mié 30»). */
  dias: { ymd: string; label: string }[];
  actual: string;
  onPick: (ymd: string) => void;
}) {
  return (
    <ActionMenu
      label={label}
      title="Cambiar de día"
      heading="Cambiar a…"
      icon={<CalendarClock aria-hidden />}
      items={dias.filter((d) => d.ymd !== actual).map((d) => ({ key: d.ymd, label: d.label }))}
      onSelect={onPick}
      className={`${rowActionBtn} size-7! rounded-xl! [&_svg]:size-3.5!`}
    />
  );
}
