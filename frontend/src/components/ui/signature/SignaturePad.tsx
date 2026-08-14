import { useEffect, useId, useRef, useState } from "react";

interface SignaturePadProps {
  value?: string;
  onChange: (signature: string) => void;
  label?: string;
  width?: number;
  height?: number;
  disabled?: boolean;
}

type Point = { x: number; y: number };

function applyStrokeStyle(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "#141413";
  ctx.lineWidth = 2.25;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.imageSmoothingEnabled = true;
}

function pointerToCanvas(e: PointerEvent, canvas: HTMLCanvasElement): Point {
  const rect = canvas.getBoundingClientRect();
  const rw = Math.max(rect.width, 1);
  const rh = Math.max(rect.height, 1);
  return {
    x: ((e.clientX - rect.left) / rw) * canvas.width,
    y: ((e.clientY - rect.top) / rh) * canvas.height,
  };
}

function drawSegment(ctx: CanvasRenderingContext2D, from: Point, to: Point) {
  applyStrokeStyle(ctx);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

function paintExternalValue(
  canvas: HTMLCanvasElement,
  src: string,
  loadTokenRef: { current: number },
  onEmpty: (empty: boolean) => void,
  onLoadError?: (failed: boolean) => void
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  applyStrokeStyle(ctx);

  if (!src) {
    loadTokenRef.current += 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onEmpty(true);
    onLoadError?.(false);
    return;
  }

  const token = ++loadTokenRef.current;

  const drawLoaded = (img: HTMLImageElement) => {
    if (token !== loadTokenRef.current) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) {
      ctx.drawImage(img, 0, 0);
      onEmpty(false);
      onLoadError?.(false);
      return;
    }
    const scale = Math.min(canvas.width / iw, canvas.height / ih);
    const dw = Math.max(1, Math.floor(iw * scale));
    const dh = Math.max(1, Math.floor(ih * scale));
    ctx.drawImage(
      img,
      Math.floor((canvas.width - dw) / 2),
      Math.floor((canvas.height - dh) / 2),
      dw,
      dh
    );
    onEmpty(false);
    onLoadError?.(false);
  };

  const load = (useCors: boolean) => {
    const img = new Image();
    // data: URLs + crossOrigin=anonymous fallan en varios navegadores y dejan el pad en blanco.
    if (useCors && !src.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => drawLoaded(img);
    img.onerror = () => {
      if (token !== loadTokenRef.current) return;
      // Reintento sin CORS: al menos se ve la firma (canvas puede quedar “tainted”).
      if (useCors && !src.startsWith("data:")) {
        load(false);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onEmpty(true);
      onLoadError?.(true);
    };
    img.src = src;
  };

  load(true);
}

/**
 * Firma alineada al cursor, sin parpadeo al soltar el trazo.
 * - No repinta desde `value` cuando el cambio salió de este pad.
 * - Segmentos inmediatos (sin descartar puntos) para trazo fluido.
 * - Borde en el wrapper (no en el canvas).
 */
export default function SignaturePad({
  value = "",
  onChange,
  label,
  width = 400,
  height = 200,
  disabled = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);
  /** null = aún no hidratado; evita sync circular tras onChange local. */
  const syncedValueRef = useRef<string | null>(null);
  const loadTokenRef = useRef(0);
  const scrollLockRef = useRef<{ el: HTMLElement; overflowY: string } | null>(null);
  const [isEmpty, setIsEmpty] = useState(!value);
  const [loadError, setLoadError] = useState(false);
  const labelId = useId();
  const canvasDomId = useId();
  const statusId = useId();

  onChangeRef.current = onChange;
  disabledRef.current = disabled;

  // Redimensionar buffer solo cuando cambia el tamaño lógico.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) applyStrokeStyle(ctx);
    const current = syncedValueRef.current;
    if (current) paintExternalValue(canvas, current, loadTokenRef, setIsEmpty, setLoadError);
  }, [width, height]);

  // Sync externo (montaje, firma del técnico, clear desde el padre).
  // Si value === lo que emitimos nosotros, no tocar el canvas → sin parpadeo.
  useEffect(() => {
    if (value === syncedValueRef.current) return;
    // No repintar desde props mientras hay un trazo activo (evita borrar multi-stroke).
    if (isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    syncedValueRef.current = value;
    setLoadError(false);
    paintExternalValue(canvas, value, loadTokenRef, setIsEmpty, setLoadError);
  }, [value, width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const lockParentScroll = () => {
      if (scrollLockRef.current) return;
      const el = canvas.closest(
        "[data-signature-scroll-lock], [data-proyecto-form-scroll], .overflow-y-auto"
      ) as HTMLElement | null;
      if (!el) return;
      scrollLockRef.current = { el, overflowY: el.style.overflowY };
      el.style.overflowY = "hidden";
    };

    const unlockParentScroll = () => {
      const locked = scrollLockRef.current;
      if (!locked) return;
      locked.el.style.overflowY = locked.overflowY;
      scrollLockRef.current = null;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (disabledRef.current) return;
      if (e.button != null && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // Cancela un paintExternalValue en vuelo (p. ej. URL remota) para no borrar trazos nuevos.
      loadTokenRef.current += 1;
      applyStrokeStyle(ctx);
      lockParentScroll();
      canvas.setPointerCapture(e.pointerId);
      isDrawingRef.current = true;
      setIsEmpty(false);
      const pt = pointerToCanvas(e, canvas);
      lastPointRef.current = pt;
      ctx.beginPath();
      ctx.fillStyle = "#141413";
      ctx.arc(pt.x, pt.y, 1.1, 0, Math.PI * 2);
      ctx.fill();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current || disabledRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const next = pointerToCanvas(e, canvas);
      const last = lastPointRef.current;
      if (!last) {
        lastPointRef.current = next;
        return;
      }
      drawSegment(ctx, last, next);
      lastPointRef.current = next;
    };

    const endStroke = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      isDrawingRef.current = false;
      lastPointRef.current = null;
      unlockParentScroll();
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* pointer ya liberado */
      }
      const dataUrl = canvas.toDataURL("image/png");
      syncedValueRef.current = dataUrl;
      onChangeRef.current(dataUrl);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (disabledRef.current) return;
      // Necesario en iOS para que el scroll del modal no robe el gesto.
      e.preventDefault();
    };

    canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    canvas.addEventListener("pointermove", onPointerMove, { passive: false });
    canvas.addEventListener("pointerup", endStroke);
    canvas.addEventListener("pointercancel", endStroke);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });

    return () => {
      unlockParentScroll();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endStroke);
      canvas.removeEventListener("pointercancel", endStroke);
      canvas.removeEventListener("touchstart", onTouchStart);
    };
  }, []);

  const clear = () => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    loadTokenRef.current += 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    isDrawingRef.current = false;
    lastPointRef.current = null;
    const locked = scrollLockRef.current;
    if (locked) {
      locked.el.style.overflowY = locked.overflowY;
      scrollLockRef.current = null;
    }
    setIsEmpty(true);
    setLoadError(false);
    syncedValueRef.current = "";
    onChange("");
  };

  return (
    <div className="w-full min-w-0">
      {label ? (
        <label
          id={labelId}
          htmlFor={canvasDomId}
          className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      ) : null}

      <div
        className={`relative inline-block max-w-full touch-none rounded-lg border-2 bg-white dark:border-gray-700 ${
          disabled ? "border-gray-300 opacity-75 grayscale-[0.5]" : "border-gray-300"
        }`}
      >
        <canvas
          id={canvasDomId}
          ref={canvasRef}
          width={width}
          height={height}
          role="img"
          aria-labelledby={label ? labelId : undefined}
          aria-label={label ? undefined : "Área para dibujar firma"}
          aria-describedby={loadError ? statusId : undefined}
          aria-disabled={disabled || undefined}
          className={`block max-w-full touch-none rounded-[6px] ${
            disabled ? "cursor-not-allowed" : "cursor-crosshair"
          } ${loadError ? "sr-only" : ""}`}
          style={{
            width: `${width}px`,
            maxWidth: "100%",
            height: "auto",
            aspectRatio: `${width} / ${height}`,
            touchAction: "none",
          }}
        />
        {loadError && value && !value.startsWith("data:") ? (
          <img
            src={value}
            alt={label ? `${label} guardada` : "Firma guardada"}
            className="block max-w-full rounded-[6px] bg-white"
            style={{ width: `${width}px`, height: "auto", aspectRatio: `${width} / ${height}` }}
          />
        ) : null}

        {!isEmpty && !disabled ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Limpiar firma"
            className="absolute right-2 top-2 z-10 min-h-6 min-w-6 rounded-md bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            Limpiar
          </button>
        ) : null}
        {loadError && !disabled ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Volver a firmar"
            className="absolute right-2 top-2 z-10 min-h-6 min-w-6 rounded-md bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            Volver a firmar
          </button>
        ) : null}
      </div>

      {isEmpty && !disabled && !loadError ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Dibuja tu firma aquí</p>
      ) : null}
      {disabled && isEmpty && !loadError ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400" role="status">
          Sin firma registrada para este técnico
        </p>
      ) : null}
      {loadError ? (
        <p id={statusId} className="mt-1 text-xs text-amber-700 dark:text-amber-300" role="status">
          No se pudo dibujar la firma en el pad; se muestra la imagen guardada.
        </p>
      ) : null}
    </div>
  );
}
