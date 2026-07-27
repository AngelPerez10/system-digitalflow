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
  onEmpty: (empty: boolean) => void
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  applyStrokeStyle(ctx);

  if (!src) {
    loadTokenRef.current += 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onEmpty(true);
    return;
  }

  const token = ++loadTokenRef.current;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    if (token !== loadTokenRef.current) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) {
      ctx.drawImage(img, 0, 0);
      onEmpty(false);
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
  };
  img.onerror = () => {
    if (token !== loadTokenRef.current) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onEmpty(true);
  };
  img.src = src;
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
  const [isEmpty, setIsEmpty] = useState(!value);
  const labelId = useId();
  const canvasDomId = useId();

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
    if (current) paintExternalValue(canvas, current, loadTokenRef, setIsEmpty);
  }, [width, height]);

  // Sync externo (montaje, firma del técnico, clear desde el padre).
  // Si value === lo que emitimos nosotros, no tocar el canvas → sin parpadeo.
  useEffect(() => {
    if (value === syncedValueRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    syncedValueRef.current = value;
    paintExternalValue(canvas, value, loadTokenRef, setIsEmpty);
  }, [value, width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onPointerDown = (e: PointerEvent) => {
      if (disabledRef.current) return;
      if (e.button != null && e.button !== 0) return;
      e.preventDefault();
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      applyStrokeStyle(ctx);
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
      isDrawingRef.current = false;
      lastPointRef.current = null;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* pointer ya liberado */
      }
      const dataUrl = canvas.toDataURL("image/png");
      syncedValueRef.current = dataUrl;
      onChangeRef.current(dataUrl);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endStroke);
    canvas.addEventListener("pointercancel", endStroke);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endStroke);
      canvas.removeEventListener("pointercancel", endStroke);
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
    setIsEmpty(true);
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
        className={`relative inline-block max-w-full rounded-lg border-2 bg-white dark:border-gray-700 ${
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
          aria-disabled={disabled || undefined}
          className={`block max-w-full touch-none rounded-[6px] ${
            disabled ? "cursor-not-allowed" : "cursor-crosshair"
          }`}
          style={{
            width: `${width}px`,
            maxWidth: "100%",
            height: "auto",
            aspectRatio: `${width} / ${height}`,
          }}
        />

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
      </div>

      {isEmpty && !disabled ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Dibuja tu firma aquí</p>
      ) : null}
      {disabled && isEmpty ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400" role="status">
          Sin firma registrada para este técnico
        </p>
      ) : null}
    </div>
  );
}
