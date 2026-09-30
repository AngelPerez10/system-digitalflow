/**
 * Área con scroll horizontal y barra propia (cápsula marina flotante).
 *
 * - La barra nativa se oculta y se dibuja una cápsula fija al borde inferior de
 *   la ventana (así se ve aunque el contenido sea muy largo): flechas,
 *   riel con control arrastrable y, opcionalmente, un texto con lo visible.
 * - Zona de agarre alta (32 px): se arrastra o se pulsa aunque no se apunte
 *   justo a la línea. Teclado: ← → desplazan; el control es `role="scrollbar"`.
 * - Responsiva: solo aparece si el contenido desborda; el ancho se adapta al
 *   contenedor (mín. 16 px de margen lateral) y el texto se oculta en pantallas
 *   angostas.
 * - Rendimiento: la posición del control se escribe directo en el DOM
 *   (`transform`), sin re-render al desplazar.
 *
 * Mismo estilo que el tablero Equipo (`EquipoBoard`).
 */
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  children: ReactNode;
  /** Clases del contenedor exterior (la cápsula es `sticky` dentro de él). */
  className?: string;
  /** Clases del elemento que hace scroll (p. ej. `@container` para container queries). */
  bodyClassName?: string;
  /** Texto dinámico junto al riel (p. ej. columnas visibles); opcional. */
  readout?: (info: { scrollLeft: number; clientWidth: number; scrollWidth: number }) => string;
  /** Etiqueta accesible de la barra. */
  label?: string;
  /** Distancia al borde inferior de la ventana (Tailwind `bottom-*`). */
  offsetClass?: string;
};

const arrowCls =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-white/75 transition-[background-color,color,opacity] duration-150 hover:bg-white/12 hover:text-white disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6A23C]/70";

export function HScrollArea({ children, className = "", bodyClassName = "", readout, label = "Desplazamiento horizontal", offsetClass = "bottom-3" }: Props) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const readoutRef = useRef<HTMLSpanElement | null>(null);
  const readoutFn = useRef(readout);
  readoutFn.current = readout;
  const [desborda, setDesborda] = useState(false);
  const [borde, setBorde] = useState({ izq: true, der: false });

  useLayoutEffect(() => {
    const body = bodyRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!body || !track || !thumb) return;

    const actualizar = () => {
      const { scrollLeft, scrollWidth, clientWidth } = body;
      const max = scrollWidth - clientWidth;
      const pista = track.clientWidth;
      const ancho = Math.min(pista, Math.max(56, pista * (clientWidth / Math.max(1, scrollWidth))));
      const x = max > 0 ? (scrollLeft / max) * (pista - ancho) : 0;
      thumb.style.width = `${ancho}px`;
      thumb.style.transform = `translateX(${x}px)`;
      thumb.setAttribute("aria-valuenow", String(max > 0 ? Math.round((scrollLeft / max) * 100) : 0));
      const txt = readoutFn.current?.({ scrollLeft, clientWidth, scrollWidth });
      if (readoutRef.current && txt != null && readoutRef.current.textContent !== txt) readoutRef.current.textContent = txt;
      const izq = scrollLeft <= 1;
      const der = scrollLeft >= max - 1;
      setBorde((b) => (b.izq === izq && b.der === der ? b : { izq, der }));
    };
    const medir = () => {
      setDesborda(body.scrollWidth > body.clientWidth + 1);
      actualizar();
    };

    // Arrastrar el control, o pulsar la pista para saltar a esa zona.
    let arrastre: { x0: number; scroll0: number } | null = null;
    const max = () => body.scrollWidth - body.clientWidth;
    const onThumbDown = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      thumb.setPointerCapture(e.pointerId);
      arrastre = { x0: e.clientX, scroll0: body.scrollLeft };
      thumb.dataset.drag = "1";
    };
    const onThumbMove = (e: PointerEvent) => {
      if (!arrastre) return;
      const libre = track.clientWidth - thumb.offsetWidth;
      if (libre > 0) body.scrollLeft = arrastre.scroll0 + ((e.clientX - arrastre.x0) / libre) * max();
    };
    const onThumbUp = (e: PointerEvent) => {
      arrastre = null;
      delete thumb.dataset.drag;
      if (thumb.hasPointerCapture(e.pointerId)) thumb.releasePointerCapture(e.pointerId);
    };
    const onTrackDown = (e: PointerEvent) => {
      if (thumb.contains(e.target as Node)) return;
      const r = track.getBoundingClientRect();
      const libre = track.clientWidth - thumb.offsetWidth;
      if (libre > 0) body.scrollTo({ left: ((e.clientX - r.left - thumb.offsetWidth / 2) / libre) * max(), behavior: "smooth" });
    };

    body.addEventListener("scroll", actualizar, { passive: true });
    thumb.addEventListener("pointerdown", onThumbDown);
    thumb.addEventListener("pointermove", onThumbMove);
    thumb.addEventListener("pointerup", onThumbUp);
    thumb.addEventListener("pointercancel", onThumbUp);
    track.addEventListener("pointerdown", onTrackDown);

    const ro = new ResizeObserver(medir);
    ro.observe(body);
    ro.observe(track);
    for (const child of Array.from(body.children)) ro.observe(child);
    medir();

    return () => {
      body.removeEventListener("scroll", actualizar);
      thumb.removeEventListener("pointerdown", onThumbDown);
      thumb.removeEventListener("pointermove", onThumbMove);
      thumb.removeEventListener("pointerup", onThumbUp);
      thumb.removeEventListener("pointercancel", onThumbUp);
      track.removeEventListener("pointerdown", onTrackDown);
      ro.disconnect();
    };
  }, []);

  /** Un paso = ~80 % de lo visible (con teclado, la mitad). */
  const desplazar = useCallback((dir: -1 | 1, fraccion = 0.8) => {
    const b = bodyRef.current;
    if (b) b.scrollBy({ left: dir * b.clientWidth * fraccion, behavior: "smooth" });
  }, []);

  return (
    <div className={className}>
      <div ref={bodyRef} className={`overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${bodyClassName}`}>
        {children}
      </div>

      <div className={`sticky ${offsetClass} z-20 mx-auto my-3 w-[min(34rem,calc(100%-2rem))] ${desborda ? "block" : "hidden"}`}>
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-[#17235B]/95 p-1 pr-1.5 text-white shadow-[0_14px_34px_-12px_rgba(23,35,91,0.75)] backdrop-blur-md sm:gap-1.5 dark:bg-[#1B2A63]/95 dark:shadow-[0_14px_34px_-10px_rgba(0,0,0,0.8)]">
          <button type="button" onClick={() => desplazar(-1)} disabled={borde.izq} aria-label="Desplazar a la izquierda" className={arrowCls}>
            <ChevronLeft className="size-[17px]" aria-hidden />
          </button>
          {readout ? <span ref={readoutRef} aria-hidden className="hidden w-[8.5rem] shrink-0 text-center text-[11.5px] font-semibold tabular-nums text-white/90 md:block" /> : null}
          {/* Zona de agarre alta (32 px): se arrastra o se pulsa aunque no se apunte justo a la línea. */}
          <div ref={trackRef} className="relative h-8 min-w-0 flex-1 cursor-pointer">
            <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-white/15" aria-hidden />
            <div
              ref={thumbRef}
              role="scrollbar"
              aria-orientation="horizontal"
              aria-label={label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={0}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  desplazar(-1, 0.4);
                } else if (e.key === "ArrowRight") {
                  e.preventDefault();
                  desplazar(1, 0.4);
                }
              }}
              className="group/thumb absolute inset-y-0 left-0 cursor-grab touch-none focus-visible:outline-none data-[drag]:cursor-grabbing"
            >
              <span
                className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-white/85 shadow-[0_1px_3px_rgba(0,0,0,0.35)] transition-[background-color,height] duration-150 group-hover/thumb:h-3 group-hover/thumb:bg-[#E6A23C] group-data-[drag]/thumb:h-3 group-data-[drag]/thumb:bg-[#E6A23C] group-focus-visible/thumb:ring-2 group-focus-visible/thumb:ring-[#E6A23C]/70"
                aria-hidden
              />
            </div>
          </div>
          <button type="button" onClick={() => desplazar(1)} disabled={borde.der} aria-label="Desplazar a la derecha" className={arrowCls}>
            <ChevronRight className="size-[17px]" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
