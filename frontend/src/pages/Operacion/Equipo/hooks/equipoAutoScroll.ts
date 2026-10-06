/**
 * Auto-scroll propio mientras se arrastra una tarjeta del tablero Equipo.
 *
 * - Vertical (ventana): cerca del borde inferior baja; cerca del borde superior
 *   (debajo del encabezado fijo de la app) sube.
 * - Horizontal (cuerpo del tablero, `[data-eq-hscroll]`): cerca del borde
 *   izquierdo/derecho desplaza los días.
 * La velocidad crece al acercarse al borde. Corre en `requestAnimationFrame`
 * con la última posición del puntero, así sigue aunque el puntero no se mueva.
 */

/** Alto de la zona activa junto a cada borde (px de pantalla). */
const ZONA = 140;
/** Velocidad máxima en px por segundo. */
const MAX_PX_S = 1400;

/** 0 fuera de la zona → 1 pegado al borde (curva suave). */
function intensidad(distanciaAlBorde: number, zona: number): number {
  if (distanciaAlBorde >= zona) return 0;
  const t = 1 - Math.max(0, distanciaAlBorde) / zona;
  return t * t;
}

export function createDragAutoScroll() {
  let pointer: { x: number; y: number } | null = null;
  let raf = 0;
  let last = 0;

  const tick = (now: number) => {
    const dt = last ? Math.min(now - last, 50) : 16;
    last = now;
    if (pointer) {
      const { x, y } = pointer;
      const paso = (MAX_PX_S * dt) / 1000;

      // Vertical: la zona superior empieza debajo del encabezado fijo.
      const header = document.querySelector("header");
      const topBorde = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
      const zonaV = Math.min(ZONA, window.innerHeight * 0.2);
      const abajo = intensidad(window.innerHeight - y, zonaV);
      const arriba = intensidad(y - topBorde, zonaV);
      const dy = Math.round((abajo - arriba) * paso);
      if (dy !== 0) window.scrollBy(0, dy);

      // Horizontal: solo si el puntero está sobre el cuerpo del tablero.
      const body = document.querySelector<HTMLElement>("[data-eq-hscroll]");
      if (body && body.scrollWidth > body.clientWidth) {
        const r = body.getBoundingClientRect();
        if (y >= r.top && y <= r.bottom) {
          const zonaH = Math.min(ZONA, r.width * 0.15);
          const der = intensidad(r.right - x, zonaH);
          const izq = intensidad(x - r.left, zonaH);
          const dx = Math.round((der - izq) * paso);
          if (dx !== 0) body.scrollLeft += dx;
        }
      }
    }
    raf = requestAnimationFrame(tick);
  };

  return {
    start() {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(tick);
    },
    update(x: number, y: number) {
      pointer = { x, y };
    },
    stop() {
      cancelAnimationFrame(raf);
      raf = 0;
      pointer = null;
    },
  };
}
