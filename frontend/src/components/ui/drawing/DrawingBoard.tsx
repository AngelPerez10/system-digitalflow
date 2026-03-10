import { useRef, useEffect, useState, type ReactElement } from 'react';
import Sketch from '@uiw/react-color-sketch';

type DrawingTool =
  | 'select'
  | 'pencil'
  | 'line'
  | 'rectangle'
  | 'circle'
  | 'eraser'
  | 'camera'
  | 'cctv_cubo'
  | 'cctv_domo'
  | 'cctv_pinhole'
  | 'cctv_ptz'
  | 'cctv_turret';

type ShapeType = Exclude<DrawingTool, 'pencil' | 'eraser'>;

type Shape = {
  id: string;
  type: ShapeType;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  lineWidth: number;
  title?: string;
};

interface DrawingBoardProps {
  value?: string;
  onChange: (drawing: string) => void;
  label?: string;
  width?: number;
  height?: number;
  disabled?: boolean;
}

export default function DrawingBoard({
  value,
  onChange,
  label,
  width = 800,
  height = 600,
  disabled = false
}: DrawingBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastLoadedValueRef = useRef<string | undefined>(undefined);
  const toolRef = useRef<DrawingTool>('pencil');
  const colorRef = useRef<string>('#000000');
  const lineWidthRef = useRef<number>(2);
  const cctvImgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const svgTextCacheRef = useRef<Map<string, string>>(new Map());
  const svgStampImgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [currentTool, setCurrentTool] = useState<DrawingTool>('pencil');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [figuresOpen, setFiguresOpen] = useState(false);
  const figuresRef = useRef<HTMLDivElement | null>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const colorRefEl = useRef<HTMLDivElement | null>(null);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const shapesRef = useRef<Shape[]>([]);
  const [activeShapeId, setActiveShapeId] = useState<string | null>(null);
  const dragModeRef = useRef<'move' | 'resize' | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragShapeStartRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [pendingTitle, setPendingTitle] = useState<{ shapeId: string; x: number; y: number } | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const lastErasedShapeIdRef = useRef<string | null>(null);

  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);

  const emitChange = (dataUrl: string) => {
    lastLoadedValueRef.current = dataUrl;
    onChange(dataUrl);
  };

  const drawSvgStamp = (
    ctx: CanvasRenderingContext2D,
    canvasEl: HTMLCanvasElement,
    svgPath: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    commit: boolean,
    color: string,
    lw: number
  ) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const raw = Math.max(Math.abs(dx), Math.abs(dy));
    const minSize = 28 + lw * 2;
    const size = Math.max(minSize, raw);

    const left = Math.floor(Math.min(x1, x2) - (size - Math.abs(dx)) / 2);
    const top = Math.floor(Math.min(y1, y2) - (size - Math.abs(dy)) / 2);

    const drawNow = (img: HTMLImageElement) => {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(img, left, top, size, size);
      ctx.restore();

      if (commit) {
        const dataUrl = canvasEl.toDataURL('image/png');
        emitChange(dataUrl);
      }
    };

    void getSvgStampImage(svgPath, color, lw).then((img) => {
      if ((img as any).complete && img.naturalWidth > 0) {
        drawNow(img);
        return;
      }
      img.onload = () => {
        drawNow(img);
      };
    });
  };

  useEffect(() => {
    toolRef.current = currentTool;
    colorRef.current = currentColor;
    lineWidthRef.current = lineWidth;
  }, [currentTool, currentColor, lineWidth]);

  useEffect(() => {
    shapesRef.current = shapes;
  }, [shapes]);

  useEffect(() => {
    const ink = document.createElement('canvas');
    ink.width = width;
    ink.height = height;
    inkCanvasRef.current = ink;
  }, [width, height]);

  useEffect(() => {
    const el = document.documentElement;
    const update = () => setIsDarkMode(el.classList.contains('dark'));
    update();

    const observer = new MutationObserver(update);
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!figuresOpen) return;
      const target = e.target as Node;
      if (figuresRef.current && !figuresRef.current.contains(target)) {
        setFiguresOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [figuresOpen]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!colorOpen) return;
      const target = e.target as Node;
      if (colorRefEl.current && !colorRefEl.current.contains(target)) {
        setColorOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [colorOpen]);

  const getCanvasCursor = () => {
    const stroke = isDarkMode ? '#ffffff' : '#000000';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path d="M12 2v6M12 16v6M2 12h6M16 12h6" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
  <circle cx="12" cy="12" r="1.5" fill="${stroke}"/>
</svg>`;

    const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    return `url("${url}") 12 12, crosshair`;
  };

  const getCctvSvgDataUrl = (fillColor: string, strokeWidth: number) => {
    const safeStroke = Math.max(0, Math.min(12, strokeWidth || 0));
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60.051 60.051" fill="${fillColor}" stroke="${fillColor}" stroke-width="${safeStroke / 3}" stroke-linejoin="round" stroke-linecap="round">
  <path d="M56.963,32.026H55.14c-1.703,0-3.088,1.385-3.088,3.088v3.912h-10v-6.219c3.646-1.177,5.957-6.052,5.957-12.781c0-7.235-2.669-12.333-6.8-12.988c-0.052-0.008-0.104-0.012-0.157-0.012h-40c-0.481,0-0.893,0.343-0.982,0.816l-0.001,0c-0.02,0.107-0.472,2.648,1.243,4.714c1.138,1.371,2.92,2.169,5.292,2.395c-0.357,1.59-0.552,3.31-0.552,5.075c0,7.29,3.075,13,7,13h21v12.967c0,1.672,1.36,3.033,3.033,3.033h1.935c1.308,0,2.415-0.837,2.84-2h10.193v2.912c0,1.703,1.385,3.088,3.088,3.088h1.823c1.703,0,3.088-1.385,3.088-3.088V35.114C60.051,33.411,58.666,32.026,56.963,32.026z M40.967,9.026c2.397,0.436,4.788,3.683,5.018,10h-20.52l-3.707-3.707c-0.188-0.188-0.442-0.293-0.707-0.293h-2h-0.349h-3.985h-1.07c-0.009-0.014-0.02-0.028-0.029-0.042c-0.102-0.164-0.216-0.329-0.34-0.495c-0.067-0.09-0.142-0.18-0.215-0.27c-0.033-0.041-0.064-0.082-0.098-0.123c-0.04-0.047-0.081-0.094-0.123-0.141c-0.044-0.05-0.08-0.099-0.125-0.149c-0.017-0.019-0.039-0.032-0.058-0.05c-0.112-0.121-0.229-0.242-0.352-0.364c-0.079-0.078-0.159-0.155-0.241-0.232c-0.199-0.186-0.409-0.373-0.633-0.56c-0.18-0.151-0.368-0.298-0.558-0.445c-0.087-0.067-0.173-0.134-0.263-0.201C9.099,10.823,7.347,9.82,5.766,9.026H40.967z M14.051,18.692c0,2.09-0.6,3.471-1,4.073c-0.4-0.603-1-1.983-1-4.073c0-0.806,0.087-1.489,0.21-2.053c0.004,0.006,0.012,0.008,0.017,0.013c0.084,0.103,0.186,0.184,0.302,0.246c0.025,0.013,0.049,0.023,0.076,0.034c0.124,0.054,0.255,0.092,0.396,0.092h0.862C14.005,17.558,14.051,18.116,14.051,18.692z M2.864,11.296c-0.482-0.574-0.696-1.218-0.791-1.773c1.508,0.648,3.509,1.606,5.354,2.716c-0.098,0.246-0.188,0.501-0.276,0.759C5.147,12.87,3.708,12.299,2.864,11.296z M8.051,20.026c0-2.422,0.382-4.745,1.086-6.671c0.02,0.014,0.04,0.028,0.06,0.042c0.617,0.445,1.133,0.879,1.576,1.303c-0.351,0.861-0.723,2.197-0.723,3.992c0,3.374,1.402,6.333,3,6.333s3-2.959,3-6.333c0-0.571-0.048-1.125-0.124-1.667h1.92c0.135,0.988,0.204,1.994,0.204,3c0,6.195-2.688,11-5,11C10.687,31.026,8.051,26.508,8.051,20.026z M16.724,31.026c0.028-0.033,0.053-0.075,0.081-0.109c0.191-0.231,0.376-0.479,0.554-0.742c0.03-0.044,0.061-0.082,0.091-0.127c0.205-0.313,0.399-0.65,0.585-1.003c0.05-0.094,0.095-0.195,0.143-0.292c0.134-0.271,0.262-0.55,0.384-0.84c0.052-0.124,0.103-0.249,0.153-0.376c0.119-0.304,0.229-0.618,0.334-0.94c0.034-0.106,0.072-0.208,0.104-0.315c0.131-0.43,0.249-0.872,0.354-1.328c0.021-0.091,0.036-0.185,0.056-0.276c0.079-0.371,0.15-0.749,0.211-1.135c0.024-0.155,0.045-0.311,0.067-0.467c0.047-0.349,0.086-0.703,0.117-1.061c0.013-0.152,0.029-0.303,0.039-0.457c0.034-0.504,0.056-1.014,0.056-1.532v-3h0.586l3.707,3.707c0.188,0.188,0.442,0.293,0.707,0.293h20.934c-0.23,6.317-2.621,9.564-5.018,10h-6.916H16.724z M39.019,47.026h-1.935c-0.569,0-1.033-0.463-1.033-1.033V33.026h4v6v6.967C40.051,46.562,39.588,47.026,39.019,47.026z M42.051,45.026v-4h10v4H42.051z M58.051,49.937c0,0.6-0.488,1.088-1.088,1.088H55.14c-0.6,0-1.088-0.488-1.088-1.088v-2.912v-8v-3.912c0-0.6,0.488-1.088,1.088-1.088h1.823c0.6,0,1.088,0.488,1.088,1.088V49.937z"/>
  <circle cx="32.051" cy="27.026" r="1" />
  <circle cx="28.051" cy="27.026" r="1" />
  <circle cx="24.051" cy="27.026" r="1" />
</svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  const getCctvStampImage = (color: string, lw: number) => {
    const cacheKey = `${color}|${lw}`;
    const cached = cctvImgCacheRef.current.get(cacheKey);
    if (cached) return cached;

    const img = new Image();
    img.onload = () => {
      // no-op
    };
    img.src = getCctvSvgDataUrl(color, lw);
    cctvImgCacheRef.current.set(cacheKey, img);
    return img;
  };

  const getSvgText = async (path: string) => {
    const cached = svgTextCacheRef.current.get(path);
    if (cached) return cached;

    const res = await fetch(path, { cache: 'force-cache' });
    const text = await res.text();
    svgTextCacheRef.current.set(path, text);
    return text;
  };

  const buildSvgStampDataUrl = (svgText: string, fillColor: string, strokeWidth: number) => {
    const safeStroke = Math.max(0, Math.min(12, strokeWidth || 0));
    let out = svgText;

    out = out.replace(/<\?xml[^>]*>\s*/i, '');
    out = out.replace(/<!DOCTYPE[^>]*>\s*/i, '');

    if (/<svg\s[^>]*fill=/.test(out)) {
      out = out.replace(/(<svg\s[^>]*?)fill=(['"]).*?\2/i, `$1fill="${fillColor}"`);
    } else {
      out = out.replace(/<svg\s/i, `<svg fill="${fillColor}" `);
    }

    if (/<svg\s[^>]*stroke=/.test(out)) {
      out = out.replace(/(<svg\s[^>]*?)stroke=(['"]).*?\2/i, `$1stroke="${fillColor}"`);
    } else {
      out = out.replace(/<svg\s/i, `<svg stroke="${fillColor}" `);
    }

    if (/<svg\s[^>]*stroke-width=/.test(out)) {
      out = out.replace(/(<svg\s[^>]*?)stroke-width=(['"]).*?\2/i, `$1stroke-width="${safeStroke / 3}"`);
    } else {
      out = out.replace(/<svg\s/i, `<svg stroke-width="${safeStroke / 3}" `);
    }

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(out)}`;
  };

  const getSvgStampImage = async (path: string, color: string, lw: number) => {
    const cacheKey = `${path}|${color}|${lw}`;
    const cached = svgStampImgCacheRef.current.get(cacheKey);
    if (cached) return cached;

    const svgText = await getSvgText(path);
    const img = new Image();
    img.src = buildSvgStampDataUrl(svgText, color, lw);
    svgStampImgCacheRef.current.set(cacheKey, img);
    return img;
  };

  const getInkCtx = () => {
    const ink = inkCanvasRef.current;
    if (!ink) return null;
    return ink.getContext('2d', { willReadFrequently: true });
  };

  const renderAll = (ctx: CanvasRenderingContext2D, preview?: Shape | null) => {
    const ink = inkCanvasRef.current;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, width, height);
    if (ink) ctx.drawImage(ink, 0, 0);

    const all = shapesRef.current;
    for (const s of all) {
      drawOneShape(ctx, s);
    }
    if (preview) drawOneShape(ctx, preview);
    ctx.restore();
  };

  const normBox = (s: { x1: number; y1: number; x2: number; y2: number }) => {
    const left = Math.min(s.x1, s.x2);
    const top = Math.min(s.y1, s.y2);
    const right = Math.max(s.x1, s.x2);
    const bottom = Math.max(s.y1, s.y2);
    return { left, top, right, bottom, w: right - left, h: bottom - top };
  };

  const drawShapeTitle = (ctx: CanvasRenderingContext2D, s: Shape) => {
    const text = (s.title || '').trim();
    if (!text) return;

    const box = normBox(s);
    const fontSize = 14;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textBaseline = 'top';

    const pad = 4;
    const metrics = ctx.measureText(text);
    const textW = Math.ceil(metrics.width);
    const textH = fontSize + 2;

    const rawX = box.left + 2;
    const rawY = box.top + 2;
    const x = Math.max(0, Math.min(width - (textW + pad * 2), rawX));
    const y = Math.max(0, Math.min(height - (textH + pad * 2), rawY));

    ctx.fillStyle = isDarkMode ? 'rgba(255,255,255,0.90)' : 'rgba(0,0,0,0.85)';
    ctx.fillRect(x, y, textW + pad * 2, textH + pad * 2);
    ctx.fillStyle = isDarkMode ? '#000000' : '#ffffff';
    ctx.fillText(text, x + pad, y + pad);
    ctx.restore();
  };

  const drawOneShape = (ctx: CanvasRenderingContext2D, s: Shape) => {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.lineWidth;

    switch (s.type) {
      case 'select': {
        break;
      }
      case 'line': {
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();
        break;
      }
      case 'rectangle': {
        ctx.beginPath();
        ctx.rect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);
        ctx.stroke();
        break;
      }
      case 'circle': {
        ctx.beginPath();
        const radius = Math.sqrt(Math.pow(s.x2 - s.x1, 2) + Math.pow(s.y2 - s.y1, 2));
        ctx.arc(s.x1, s.y1, radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      }
      case 'camera': {
        drawCamera(ctx, canvasRef.current!, s.x1, s.y1, s.x2, s.y2, false, s.color, s.lineWidth);
        break;
      }
      case 'cctv_cubo': {
        drawSvgStamp(ctx, canvasRef.current!, '/images/icons/cctv-cubo.svg', s.x1, s.y1, s.x2, s.y2, false, s.color, s.lineWidth);
        break;
      }
      case 'cctv_domo': {
        drawSvgStamp(ctx, canvasRef.current!, '/images/icons/cctv-domo.svg', s.x1, s.y1, s.x2, s.y2, false, s.color, s.lineWidth);
        break;
      }
      case 'cctv_pinhole': {
        drawSvgStamp(ctx, canvasRef.current!, '/images/icons/cctv-pinhole.svg', s.x1, s.y1, s.x2, s.y2, false, s.color, s.lineWidth);
        break;
      }
      case 'cctv_ptz': {
        drawSvgStamp(ctx, canvasRef.current!, '/images/icons/cctv-ptz.svg', s.x1, s.y1, s.x2, s.y2, false, s.color, s.lineWidth);
        break;
      }
      case 'cctv_turret': {
        drawSvgStamp(ctx, canvasRef.current!, '/images/icons/cctv-turret.svg', s.x1, s.y1, s.x2, s.y2, false, s.color, s.lineWidth);
        break;
      }
    }

    drawShapeTitle(ctx, s);
    ctx.restore();
  };

  const hitTestShape = (x: number, y: number) => {
    const all = shapesRef.current;
    for (let i = all.length - 1; i >= 0; i--) {
      const s = all[i];
      const box = normBox(s);
      const pad = Math.max(8, s.lineWidth * 2);
      const inside = x >= box.left - pad && x <= box.right + pad && y >= box.top - pad && y <= box.bottom + pad;
      if (!inside) continue;

      const handleSize = 14;
      const nearResize = x >= box.right - handleSize && x <= box.right + handleSize && y >= box.bottom - handleSize && y <= box.bottom + handleSize;
      return { shape: s, mode: nearResize ? 'resize' : 'move' } as const;
    }
    return null;
  };

  const eraseShapeAtPoint = (
    x: number,
    y: number,
    ctx: CanvasRenderingContext2D,
    inkCtx: CanvasRenderingContext2D
  ) => {
    const hit = hitTestShape(x, y);
    if (!hit) {
      lastErasedShapeIdRef.current = null;
      return false;
    }

    if (lastErasedShapeIdRef.current === hit.shape.id) return false;
    lastErasedShapeIdRef.current = hit.shape.id;

    const rasterizeAndRemove = () => {
      // Para borrar "poco a poco" como antes: primero rasterizamos la figura al canvas de tinta
      // y luego la eliminamos de la lista de figuras (para que no se vuelva a redibujar).
      inkCtx.save();
      inkCtx.globalCompositeOperation = 'source-over';
      drawOneShape(inkCtx, hit.shape);
      inkCtx.restore();

      const nextShapes = shapesRef.current.filter((s) => s.id !== hit.shape.id);
      shapesRef.current = nextShapes;
      setShapes(nextShapes);
      renderAll(ctx, null);
    };

    // Caso especial: cámara depende de SVG (async). Si aún no está cargada,
    // esperamos a onload para rasterizar, para evitar que desaparezca "de golpe".
    if (hit.shape.type === 'camera') {
      const img = getCctvStampImage(hit.shape.color, hit.shape.lineWidth);
      if (!((img as any).complete && img.naturalWidth > 0)) {
        img.onload = () => {
          rasterizeAndRemove();
        };
        return true;
      }
    }

    rasterizeAndRemove();
    return true;
  };

  const setupStroke = (ctx: CanvasRenderingContext2D) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const tool = toolRef.current;
    const color = colorRef.current;
    const lw = lineWidthRef.current;

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = lw * 3;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
    }
  };

  const drawCamera = (
    ctx: CanvasRenderingContext2D,
    canvasEl: HTMLCanvasElement,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    commit: boolean,
    colorOverride?: string,
    lineWidthOverride?: number
  ) => {
    const color = colorOverride ?? colorRef.current;
    const lw = lineWidthOverride ?? lineWidthRef.current;
    const img = getCctvStampImage(color, lw);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const raw = Math.max(Math.abs(dx), Math.abs(dy));
    const minSize = 28 + lw * 2;
    const size = Math.max(minSize, raw);

    const left = Math.floor(Math.min(x1, x2) - (size - Math.abs(dx)) / 2);
    const top = Math.floor(Math.min(y1, y2) - (size - Math.abs(dy)) / 2);

    const drawNow = () => {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(img, left, top, size, size);
      ctx.restore();

      if (commit) {
        const dataUrl = canvasEl.toDataURL('image/png');
        emitChange(dataUrl);
      }
    };

    if ((img as any).complete && img.naturalWidth > 0) {
      drawNow();
      return;
    }

    img.onload = () => {
      // Si el SVG carga después (async), hay que re-renderizar todo para que
      // no se pierdan títulos/figuras por orden de pintado.
      const canvas = canvasRef.current;
      if (!canvas) {
        drawNow();
        return;
      }
      const ctx2 = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx2) {
        drawNow();
        return;
      }
      renderAll(ctx2, null);

      if (commit) {
        const dataUrl = canvas.toDataURL('image/png');
        emitChange(dataUrl);
      }
    };
  };

  const openTitleForShape = (shapeId: string, x: number, y: number) => {
    setPendingTitle({ shapeId, x, y });
    setTitleDraft('');
  };

  const commitTitle = () => {
    const canvas = canvasRef.current;
    if (!canvas || !pendingTitle) {
      setPendingTitle(null);
      setTitleDraft('');
      return;
    }

    const text = (titleDraft || '').trim();
    if (!text) {
      setPendingTitle(null);
      setTitleDraft('');
      return;
    }

    const nextShapes = shapesRef.current.map((s) => (s.id === pendingTitle.shapeId ? { ...s, title: text } : s));
    shapesRef.current = nextShapes;
    setShapes(nextShapes);
    setPendingTitle(null);
    setTitleDraft('');

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    renderAll(ctx, null);
    const dataUrl = canvas.toDataURL('image/png');
    emitChange(dataUrl);
  };

  const getTitleOverlayStyle = () => {
    const canvas = canvasRef.current;
    if (!canvas || !pendingTitle) return { left: 0, top: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    const x = pendingTitle.x * scaleX;
    const y = pendingTitle.y * scaleY;
    return { left: x + 8, top: y + 8 };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const drawImageContain = (img: HTMLImageElement) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      if (!iw || !ih) {
        ctx.drawImage(img, 0, 0);
        return;
      }

      const scale = Math.min(cw / iw, ch / ih);
      const w = Math.max(1, Math.floor(iw * scale));
      const h = Math.max(1, Math.floor(ih * scale));
      const x = Math.floor((cw - w) / 2);
      const y = Math.floor((ch - h) / 2);
      ctx.drawImage(img, x, y, w, h);
    };

    if (!value) {
      lastLoadedValueRef.current = value;
      const inkCtx = getInkCtx();
      if (inkCtx) inkCtx.clearRect(0, 0, width, height);
      setShapes([]);
      return;
    }

    if (value === lastLoadedValueRef.current) return;

    lastLoadedValueRef.current = value;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      drawImageContain(img);
      ctx.restore();

      const inkCtx = getInkCtx();
      if (inkCtx) {
        inkCtx.clearRect(0, 0, width, height);
        inkCtx.drawImage(canvas, 0, 0);
      }

      setShapes([]);
      setIsEmpty(false);
    };
    img.onerror = () => {
      // Fallback si la URL no carga (ej. CORS o 404); permite reintentar con otra URL
      lastLoadedValueRef.current = undefined;
    };
    img.src = value;
  }, [value, width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const getXY = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      const { x, y } = getXY(e.touches[0].clientX, e.touches[0].clientY);
      const tool = toolRef.current;

      if (pendingTitle) {
        setPendingTitle(null);
        setTitleDraft('');
      }

      if (tool === 'select') {
        const hit = hitTestShape(x, y);
        if (hit) {
          setActiveShapeId(hit.shape.id);
          dragModeRef.current = hit.mode;
          dragStartRef.current = { x, y };
          dragShapeStartRef.current = { x1: hit.shape.x1, y1: hit.shape.y1, x2: hit.shape.x2, y2: hit.shape.y2 };
          setIsDrawing(true);
          return;
        }
      }

      setIsDrawing(true);
      setIsEmpty(false);
      setStartPos({ x, y });
      lastPosRef.current = { x, y };
      setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));

      const inkCtx = getInkCtx();
      if (inkCtx) setupStroke(inkCtx);

      if (tool === 'pencil' || tool === 'eraser') {
        if (inkCtx) {
          inkCtx.beginPath();
          inkCtx.moveTo(x, y);
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!isDrawing) return;

      const { x, y } = getXY(e.touches[0].clientX, e.touches[0].clientY);
      const tool = toolRef.current;
      lastPosRef.current = { x, y };

      const mode = dragModeRef.current;
      const activeId = activeShapeId;
      const dragStart = dragStartRef.current;
      const dragShapeStart = dragShapeStartRef.current;

      if (mode && activeId && dragStart && dragShapeStart) {
        const dx = x - dragStart.x;
        const dy = y - dragStart.y;
        const nextShapes = shapesRef.current.map((s) => {
          if (s.id !== activeId) return s;
          if (mode === 'move') {
            return { ...s, x1: dragShapeStart.x1 + dx, y1: dragShapeStart.y1 + dy, x2: dragShapeStart.x2 + dx, y2: dragShapeStart.y2 + dy };
          }
          return { ...s, x2: dragShapeStart.x2 + dx, y2: dragShapeStart.y2 + dy };
        });
        shapesRef.current = nextShapes;
        renderAll(ctx, null);
        return;
      }

      if (!startPos) return;

      if (tool === 'pencil' || tool === 'eraser') {
        const inkCtx = getInkCtx();
        if (!inkCtx) return;
        setupStroke(inkCtx);

        if (tool === 'eraser') {
          const rasterized = eraseShapeAtPoint(x, y, ctx, inkCtx);
          if (rasterized) {
            inkCtx.beginPath();
            inkCtx.moveTo(x, y);
            renderAll(ctx, null);
            return;
          }
        }

        inkCtx.lineTo(x, y);
        inkCtx.stroke();
        renderAll(ctx, null);
      } else {
        const preview: Shape = {
          id: 'preview',
          type: tool as ShapeType,
          x1: startPos.x,
          y1: startPos.y,
          x2: x,
          y2: y,
          color: colorRef.current,
          lineWidth: lineWidthRef.current,
        };
        renderAll(ctx, preview);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (!isDrawing) return;
      setIsDrawing(false);

      const end = lastPosRef.current;
      const tool = toolRef.current;

      if (tool !== 'pencil' && tool !== 'eraser' && tool !== 'select') {
        const mode = dragModeRef.current;
        if (mode && activeShapeId) {
          setShapes(shapesRef.current);
          dragModeRef.current = null;
          dragStartRef.current = null;
          dragShapeStartRef.current = null;
          setActiveShapeId(null);

          renderAll(ctx, null);
          const dataUrl = canvas.toDataURL('image/png');
          emitChange(dataUrl);
        } else if (startPos && end) {
          const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
          const next: Shape = {
            id,
            type: tool as ShapeType,
            x1: startPos.x,
            y1: startPos.y,
            x2: end.x,
            y2: end.y,
            color: colorRef.current,
            lineWidth: lineWidthRef.current,
          };
          const nextShapes = [...shapesRef.current, next];
          setShapes(nextShapes);
          shapesRef.current = nextShapes;
          renderAll(ctx, null);

          const anchor = normBox(next);
          openTitleForShape(id, anchor.left, anchor.top);
          const dataUrl = canvas.toDataURL('image/png');
          emitChange(dataUrl);
        }
      } else if (tool === 'select') {
        dragModeRef.current = null;
        dragStartRef.current = null;
        dragShapeStartRef.current = null;
        setActiveShapeId(null);
      } else {
        ctx.globalCompositeOperation = 'source-over';
        const dataUrl = canvas.toDataURL('image/png');
        emitChange(dataUrl);
      }

      setStartPos(null);
      setSnapshot(null);
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, isDrawing, startPos, snapshot, onChange]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    setIsDrawing(true);
    setIsEmpty(false);

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (pendingTitle) {
      setPendingTitle(null);
      setTitleDraft('');
    }

    if (currentTool === 'select') {
      const hit = hitTestShape(x, y);
      if (hit) {
        setActiveShapeId(hit.shape.id);
        dragModeRef.current = hit.mode;
        dragStartRef.current = { x, y };
        dragShapeStartRef.current = { x1: hit.shape.x1, y1: hit.shape.y1, x2: hit.shape.x2, y2: hit.shape.y2 };
        setIsDrawing(true);
        return;
      }
    }

    setStartPos({ x, y });
    lastPosRef.current = { x, y };
    setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));

    const inkCtx = getInkCtx();
    setupStroke(ctx);
    if (inkCtx) setupStroke(inkCtx);

    if (currentTool === 'pencil' || currentTool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(x, y);
      if (inkCtx) {
        inkCtx.beginPath();
        inkCtx.moveTo(x, y);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    lastPosRef.current = { x, y };

    const mode = dragModeRef.current;
    const activeId = activeShapeId;
    const dragStart = dragStartRef.current;
    const dragShapeStart = dragShapeStartRef.current;

    if (mode && activeId && dragStart && dragShapeStart) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      const nextShapes = shapesRef.current.map((s) => {
        if (s.id !== activeId) return s;
        if (mode === 'move') {
          return { ...s, x1: dragShapeStart.x1 + dx, y1: dragShapeStart.y1 + dy, x2: dragShapeStart.x2 + dx, y2: dragShapeStart.y2 + dy };
        }
        return { ...s, x2: dragShapeStart.x2 + dx, y2: dragShapeStart.y2 + dy };
      });
      shapesRef.current = nextShapes;
      renderAll(ctx, null);
      return;
    }

    if (!startPos) return;

    if (currentTool === 'pencil' || currentTool === 'eraser') {
      const inkCtx = getInkCtx();
      if (!inkCtx) return;
      setupStroke(inkCtx);

      if (currentTool === 'eraser') {
        const rasterized = eraseShapeAtPoint(x, y, ctx, inkCtx);
        if (rasterized) {
          inkCtx.beginPath();
          inkCtx.moveTo(x, y);
          renderAll(ctx, null);
          return;
        }
      }

      inkCtx.lineTo(x, y);
      inkCtx.stroke();
      renderAll(ctx, null);
    } else {
      const preview: Shape = {
        id: 'preview',
        type: currentTool as ShapeType,
        x1: startPos.x,
        y1: startPos.y,
        x2: x,
        y2: y,
        color: colorRef.current,
        lineWidth: lineWidthRef.current,
      };
      renderAll(ctx, preview);
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const end = lastPosRef.current;
    const tool = toolRef.current;

    if (tool !== 'pencil' && tool !== 'eraser' && tool !== 'select') {
      const mode = dragModeRef.current;
      if (mode && activeShapeId) {
        setShapes(shapesRef.current);
        dragModeRef.current = null;
        dragStartRef.current = null;
        dragShapeStartRef.current = null;
        setActiveShapeId(null);

        renderAll(ctx, null);
        const dataUrl = canvas.toDataURL('image/png');
        emitChange(dataUrl);
      } else if (startPos && end) {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const next: Shape = {
          id,
          type: tool as ShapeType,
          x1: startPos.x,
          y1: startPos.y,
          x2: end.x,
          y2: end.y,
          color: colorRef.current,
          lineWidth: lineWidthRef.current,
        };
        const nextShapes = [...shapesRef.current, next];
        setShapes(nextShapes);
        shapesRef.current = nextShapes;
        renderAll(ctx, null);

        const anchor = normBox(next);
        openTitleForShape(id, anchor.left, anchor.top);
        const dataUrl = canvas.toDataURL('image/png');
        emitChange(dataUrl);
      }
    } else if (tool === 'select') {
      dragModeRef.current = null;
      dragStartRef.current = null;
      dragShapeStartRef.current = null;
      setActiveShapeId(null);
    } else {
      ctx.globalCompositeOperation = 'source-over';
      renderAll(ctx, null);
      const dataUrl = canvas.toDataURL('image/png');
      emitChange(dataUrl);
    }

    setStartPos(null);
    setSnapshot(null);
  };

  const clear = () => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const inkCtx = getInkCtx();
    if (inkCtx) inkCtx.clearRect(0, 0, width, height);
    setShapes([]);
    shapesRef.current = [];

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    lastLoadedValueRef.current = '';
    emitChange('');
  };

  const tools: { id: DrawingTool; label: string; icon: ReactElement }[] = [
    {
      id: 'select',
      label: 'Seleccionar',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4l7 17 2-7 7-2L4 4z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    },
    {
      id: 'pencil',
      label: 'Lápiz',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 19l7-7 3 3-7 7-3-3z" />
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          <path d="M2 2l7.586 7.586" />
        </svg>
      )
    },
    {
      id: 'eraser',
      label: 'Borrador',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 20H7L3 16l10-10 7 7-4 4" />
          <path d="M7 16l4-4" />
        </svg>
      )
    },
    {
      id: 'rectangle',
      label: 'Rectángulo',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      )
    },
    {
      id: 'circle',
      label: 'Círculo',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
        </svg>
      )
    },
    {
      id: 'camera',
      label: 'Cámara Bala',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 60.051 60.051" fill="currentColor">
          <path d="M56.963,32.026H55.14c-1.703,0-3.088,1.385-3.088,3.088v3.912h-10v-6.219c3.646-1.177,5.957-6.052,5.957-12.781c0-7.235-2.669-12.333-6.8-12.988c-0.052-0.008-0.104-0.012-0.157-0.012h-40c-0.481,0-0.893,0.343-0.982,0.816l-0.001,0c-0.02,0.107-0.472,2.648,1.243,4.714c1.138,1.371,2.92,2.169,5.292,2.395c-0.357,1.59-0.552,3.31-0.552,5.075c0,7.29,3.075,13,7,13h21v12.967c0,1.672,1.36,3.033,3.033,3.033h1.935c1.308,0,2.415-0.837,2.84-2h10.193v2.912c0,1.703,1.385,3.088,3.088,3.088h1.823c1.703,0,3.088-1.385,3.088-3.088V35.114C60.051,33.411,58.666,32.026,56.963,32.026z M40.967,9.026c2.397,0.436,4.788,3.683,5.018,10h-20.52l-3.707-3.707c-0.188-0.188-0.442-0.293-0.707-0.293h-2h-0.349h-3.985h-1.07c-0.009-0.014-0.02-0.028-0.029-0.042c-0.102-0.164-0.216-0.329-0.34-0.495c-0.067-0.09-0.142-0.18-0.215-0.27c-0.033-0.041-0.064-0.082-0.098-0.123c-0.04-0.047-0.081-0.094-0.123-0.141c-0.044-0.05-0.08-0.099-0.125-0.149c-0.017-0.019-0.039-0.032-0.058-0.05c-0.112-0.121-0.229-0.242-0.352-0.364c-0.079-0.078-0.159-0.155-0.241-0.232c-0.199-0.186-0.409-0.373-0.633-0.56c-0.18-0.151-0.368-0.298-0.558-0.445c-0.087-0.067-0.173-0.134-0.263-0.201C9.099,10.823,7.347,9.82,5.766,9.026H40.967z M14.051,18.692c0,2.09-0.6,3.471-1,4.073c-0.4-0.603-1-1.983-1-4.073c0-0.806,0.087-1.489,0.21-2.053c0.004,0.006,0.012,0.008,0.017,0.013c0.084,0.103,0.186,0.184,0.302,0.246c0.025,0.013,0.049,0.023,0.076,0.034c0.124,0.054,0.255,0.092,0.396,0.092h0.862C14.005,17.558,14.051,18.116,14.051,18.692z M2.864,11.296c-0.482-0.574-0.696-1.218-0.791-1.773c1.508,0.648,3.509,1.606,5.354,2.716c-0.098,0.246-0.188,0.501-0.276,0.759C5.147,12.87,3.708,12.299,2.864,11.296z M8.051,20.026c0-2.422,0.382-4.745,1.086-6.671c0.02,0.014,0.04,0.028,0.06,0.042c0.617,0.445,1.133,0.879,1.576,1.303c-0.351,0.861-0.723,2.197-0.723,3.992c0,3.374,1.402,6.333,3,6.333s3-2.959,3-6.333c0-0.571-0.048-1.125-0.124-1.667h1.92c0.135,0.988,0.204,1.994,0.204,3c0,6.195-2.688,11-5,11C10.687,31.026,8.051,26.508,8.051,20.026z M16.724,31.026c0.028-0.033,0.053-0.075,0.081-0.109c0.191-0.231,0.376-0.479,0.554-0.742c0.03-0.044,0.061-0.082,0.091-0.127c0.205-0.313,0.399-0.65,0.585-1.003c0.05-0.094,0.095-0.195,0.143-0.292c0.134-0.271,0.262-0.55,0.384-0.84c0.052-0.124,0.103-0.249,0.153-0.376c0.119-0.304,0.229-0.618,0.334-0.94c0.034-0.106,0.072-0.208,0.104-0.315c0.131-0.43,0.249-0.872,0.354-1.328c0.021-0.091,0.036-0.185,0.056-0.276c0.079-0.371,0.15-0.749,0.211-1.135c0.024-0.155,0.045-0.311,0.067-0.467c0.047-0.349,0.086-0.703,0.117-1.061c0.013-0.152,0.029-0.303,0.039-0.457c0.034-0.504,0.056-1.014,0.056-1.532v-3h0.586l3.707,3.707c0.188,0.188,0.442,0.293,0.707,0.293h20.934c-0.23,6.317-2.621,9.564-5.018,10h-6.916H16.724z M39.019,47.026h-1.935c-0.569,0-1.033-0.463-1.033-1.033V33.026h4v6v6.967C40.051,46.562,39.588,47.026,39.019,47.026z M42.051,45.026v-4h10v4H42.051z M58.051,49.937c0,0.6-0.488,1.088-1.088,1.088H55.14c-0.6,0-1.088-0.488-1.088-1.088v-2.912v-8v-3.912c0-0.6,0.488-1.088,1.088-1.088h1.823c0.6,0,1.088,0.488,1.088,1.088V49.937z" />
          <circle cx="32.051" cy="27.026" r="1" />
          <circle cx="28.051" cy="27.026" r="1" />
          <circle cx="24.051" cy="27.026" r="1" />
        </svg>
      )
    },
    {
      id: 'cctv_cubo',
      label: 'Cubo',
      icon: <img className="w-4 h-4 dark:invert dark:brightness-200" src="/images/icons/cctv-cubo.svg" alt="Cubo" />
    },
    {
      id: 'cctv_domo',
      label: 'Domo',
      icon: <img className="w-4 h-4 dark:invert dark:brightness-200" src="/images/icons/cctv-domo.svg" alt="Domo" />
    },
    {
      id: 'cctv_pinhole',
      label: 'Pinhole',
      icon: <img className="w-4 h-4 dark:invert dark:brightness-200" src="/images/icons/cctv-pinhole.svg" alt="Pinhole" />
    },
    {
      id: 'cctv_ptz',
      label: 'PTZ',
      icon: <img className="w-4 h-4 dark:invert dark:brightness-200" src="/images/icons/cctv-ptz.svg" alt="PTZ" />
    },
    {
      id: 'cctv_turret',
      label: 'Turret',
      icon: <img className="w-4 h-4 dark:invert dark:brightness-200" src="/images/icons/cctv-turret.svg" alt="Turret" />
    }
  ];

  const figureToolIds = new Set<DrawingTool>([
    'rectangle',
    'circle',
    'camera',
    'cctv_cubo',
    'cctv_domo',
    'cctv_pinhole',
    'cctv_ptz',
    'cctv_turret'
  ]);
  const primaryTools = tools.filter((t) => !figureToolIds.has(t.id));
  const figureTools = tools.filter((t) => figureToolIds.has(t.id));
  const selectedFigureTool = figureTools.find((t) => t.id === currentTool) || null;

  return (
    <div className="space-y-4">
      {label && (
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">
          {label}
        </label>
      )}

      <div className="space-y-3">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 p-3.5 bg-linear-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/60 dark:to-gray-900/40 rounded-xl border border-gray-200/60 dark:border-gray-700/50 shadow-sm">
          {/* Tools */}
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white/60 dark:bg-gray-900/40 rounded-lg border border-gray-200/40 dark:border-gray-700/40">
            {primaryTools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  setFiguresOpen(false);
                  setCurrentTool(tool.id);
                }}
                disabled={disabled}
                className={`group relative p-2.5 rounded-lg transition-all duration-200 ${currentTool === tool.id
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25 scale-105'
                    : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={tool.label}
              >
                {tool.icon}
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {tool.label}
                </span>
              </button>
            ))}

            <div className="relative" ref={figuresRef}>
              <button
                type="button"
                onClick={() => !disabled && setFiguresOpen((p) => !p)}
                disabled={disabled}
                className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 ${selectedFigureTool
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                    : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Figuras"
              >
                <span className="inline-flex items-center justify-center w-5 h-5">
                  {selectedFigureTool ? selectedFigureTool.icon : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
                    </svg>
                  )}
                </span>
                <span className="text-xs font-semibold">
                  {selectedFigureTool ? selectedFigureTool.label : 'Figuras'}
                </span>
                <svg className={`w-3.5 h-3.5 transition-transform ${figuresOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none">
                  <path d="M5.25 7.5 10 12.25 14.75 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {figuresOpen && !disabled && (
                <div className="absolute left-0 z-30 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-1 shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">
                  {figureTools.map((tool) => {
                    const isActive = currentTool === tool.id;
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => {
                          setCurrentTool(tool.id);
                          setFiguresOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${isActive
                            ? 'bg-brand-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
                          }`}
                      >
                        <span className="inline-flex items-center justify-center w-5 h-5">{tool.icon}</span>
                        <span className="font-medium">{tool.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="w-px h-8 bg-gray-300/50 dark:bg-gray-600/50" />

          {/* Colors */}
          <div className="relative" ref={colorRefEl}>
            <button
              type="button"
              onClick={() => !disabled && setColorOpen((p) => !p)}
              disabled={disabled}
              className={`flex items-center gap-2 px-3 py-2.5 bg-white/60 dark:bg-gray-900/40 rounded-lg border border-gray-200/40 dark:border-gray-700/40 transition-all duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/80 dark:hover:bg-gray-900/60'}`}
              title="Color"
            >
              <span
                className="w-6 h-6 rounded-md border border-gray-300/70 dark:border-gray-600/70 shadow-inner"
                style={{ backgroundColor: currentColor }}
              />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Color</span>
              <svg className={`w-3.5 h-3.5 text-gray-600 dark:text-gray-300 transition-transform ${colorOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none">
                <path d="M5.25 7.5 10 12.25 14.75 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {colorOpen && !disabled && (
              <div className="absolute left-0 z-30 mt-2 rounded-xl border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">
                <Sketch
                  color={currentColor}
                  onChange={(c: any) => {
                    if (c?.hex) setCurrentColor(c.hex);
                  }}
                />
              </div>
            )}
          </div>

          <div className="w-px h-8 bg-gray-300/50 dark:bg-gray-600/50" />

          {/* Line Width */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white/60 dark:bg-gray-900/40 rounded-lg border border-gray-200/40 dark:border-gray-700/40">
            <label className="text-[11px] font-medium text-gray-600 dark:text-gray-400">Grosor</label>
            <input
              type="range"
              min="1"
              max="10"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              disabled={disabled}
              className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 min-w-[28px] text-center">{lineWidth}px</span>
          </div>

          {/* Clear Button */}
          {!isEmpty && !disabled && (
            <button
              type="button"
              onClick={clear}
              title="Limpiar"
              className="inline-flex items-center justify-center p-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200/60 dark:border-red-800/40 hover:bg-red-100 dark:hover:bg-red-900/30 hover:border-red-300 dark:hover:border-red-700 transition-all duration-200 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Canvas */}
        <div className="relative w-full overflow-hidden rounded-xl border-2 border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-950/40 shadow-inner">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className={`w-full touch-none ${disabled ? 'cursor-not-allowed opacity-75 grayscale-[0.5]' : 'cursor-crosshair'
              }`}
            style={{ maxWidth: '100%', height: 'auto', display: 'block', cursor: disabled ? 'not-allowed' : getCanvasCursor() }}
          />
          {pendingTitle && !disabled && (
            <div
              className="absolute z-10"
              style={getTitleOverlayStyle()}
            >
              <div className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 shadow-lg">
                <input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitTitle();
                    if (e.key === 'Escape') {
                      setPendingTitle(null);
                      setTitleDraft('');
                    }
                  }}
                  placeholder="Título..."
                  className="h-9 w-40 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-2 text-gray-800 dark:text-gray-200 outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={commitTitle}
                  className="h-9 px-3 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingTitle(null);
                    setTitleDraft('');
                  }}
                  className="h-9 px-3 rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center space-y-2">
                <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 19l7-7 3 3-7 7-3-3z" />
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                  <path d="M2 2l7.586 7.586" />
                </svg>
                <p className="text-sm font-medium text-gray-400 dark:text-gray-600">Selecciona una herramienta y comienza a dibujar</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
