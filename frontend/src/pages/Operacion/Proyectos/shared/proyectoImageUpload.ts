import { uploadProyectoImageToCloudinary } from "./proyectoImageApi";

/** Accept para dropzone: en celular el MIME a veces viene vacío o es HEIC. */
export const PROYECTO_IMAGE_ACCEPT: Record<string, string[]> = {
  "image/*": [".jpeg", ".jpg", ".png", ".webp", ".gif", ".heic", ".heif", ".bmp"],
};

/** Más chico/rápido que órdenes: celular + varias fotos a la vez. */
export const PROYECTO_COMPRESS_MAX_KB = 70;
export const PROYECTO_COMPRESS_MAX_EDGE = 1280;
/** Evita saturar red/CPU en móvil (compresión es pesada). */
export const PROYECTO_UPLOAD_CONCURRENCY = 2;

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i;

/** true si el archivo parece imagen (incluye type vacío típico de cámara Android/iOS). */
export function isLikelyImageFile(file: File): boolean {
  const type = String(file.type || "").toLowerCase();
  if (type.startsWith("image/")) return true;
  return IMAGE_EXT_RE.test(file.name || "");
}

export function isHeicLikeFile(file: File): boolean {
  const type = String(file.type || "").toLowerCase();
  if (type.includes("heic") || type.includes("heif")) return true;
  return /\.(heic|heif)$/i.test(file.name || "");
}

export function proyectoImageRejectMessage(fileName?: string): string {
  const name = String(fileName || "").toLowerCase();
  if (/\.(heic|heif)$/.test(name)) {
    return "Las fotos HEIC del iPhone no se pueden procesar aquí. En el iPhone: Ajustes → Cámara → Formatos → «Más compatible», o elige JPG.";
  }
  return "Formato no válido. Usa JPG, PNG o WebP (en iPhone elige «Más compatible»).";
}

export function proyectoImageProcessErrorMessage(file: File): string {
  if (isHeicLikeFile(file)) {
    return `${file.name || "Foto"}: formato HEIC no soportado. Cambia la cámara a «Más compatible» (JPG) e inténtalo de nuevo.`;
  }
  return `${file.name || "Foto"}: no se pudo procesar la imagen.`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Error al leer la imagen comprimida"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Compresión orientada a móvil: menos intentos de calidad y borde más bajo
 * que `compressImage` de órdenes (evita colgar el UI con 8–10 fotos).
 */
export async function compressProyectoImage(file: File): Promise<string> {
  const maxEdge = PROYECTO_COMPRESS_MAX_EDGE;
  const maxSizeKB = PROYECTO_COMPRESS_MAX_KB;

  let bitmap: ImageBitmap | null = null;
  let width = 0;
  let height = 0;

  try {
    bitmap = await createImageBitmap(file);
    width = bitmap.width;
    height = bitmap.height;
  } catch {
    // Fallback FileReader + Image (Safari viejo / algunos Android).
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Error al leer el archivo"));
      reader.readAsDataURL(file);
    });
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Error al cargar la imagen"));
      el.src = dataUrl;
    });
    width = img.naturalWidth || img.width;
    height = img.naturalHeight || img.height;
    const canvas = document.createElement("canvas");
    if (width > maxEdge || height > maxEdge) {
      const ratio = Math.min(maxEdge / width, maxEdge / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo preparar el canvas");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return encodeCanvasToJpegDataUrl(canvas, maxSizeKB);
  }

  try {
    if (width > maxEdge || height > maxEdge) {
      const ratio = Math.min(maxEdge / width, maxEdge / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo preparar el canvas");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    return encodeCanvasToJpegDataUrl(canvas, maxSizeKB);
  } finally {
    bitmap.close();
  }
}

async function encodeCanvasToJpegDataUrl(canvas: HTMLCanvasElement, maxSizeKB: number): Promise<string> {
  // Empieza en calidad media (fotos de celular suelen ser grandes).
  let quality = 0.72;
  let blob: Blob | null = null;
  for (let i = 0; i < 5; i++) {
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
    });
    if (!blob) throw new Error("Error al comprimir la imagen");
    const sizeKB = blob.size / 1024;
    if (sizeKB <= maxSizeKB || quality <= 0.28) break;
    quality = Math.max(0.28, quality - 0.12);
  }
  if (!blob) throw new Error("Error al comprimir la imagen");
  return blobToDataUrl(blob);
}

export type ProyectoBatchProgress = {
  done: number;
  total: number;
};

export type ProyectoBatchUploadResult = {
  uploadedUrls: string[];
  failures: string[];
};

/**
 * Sube varias fotos con concurrencia limitada.
 * Llama `onUploaded` por cada éxito para ir mostrando miniaturas sin esperar el lote.
 */
export async function uploadProyectoImageBatch(opts: {
  files: File[];
  folder: string;
  maxTotal: number;
  getCurrentUrls: () => string[];
  onUrlsChange: (urls: string[]) => void;
  onProgress?: (progress: ProyectoBatchProgress) => void;
}): Promise<ProyectoBatchUploadResult> {
  const { files, folder, maxTotal, getCurrentUrls, onUrlsChange, onProgress } = opts;
  const uploadedUrls: string[] = [];
  const failures: string[] = [];
  let done = 0;
  const total = files.length;
  onProgress?.({ done: 0, total });

  // Serializa el append: dos workers no deben pisarse al actualizar el arreglo.
  let appendChain: Promise<void> = Promise.resolve();
  const appendUrl = (url: string): Promise<boolean> => {
    const run = appendChain.then(() => {
      const current = getCurrentUrls();
      if (current.length >= maxTotal) return false;
      if (current.includes(url)) return true;
      const next = [...current, url].slice(0, maxTotal);
      onUrlsChange(next);
      return true;
    });
    appendChain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  };

  let cursor = 0;
  const workers = Array.from({ length: Math.min(PROYECTO_UPLOAD_CONCURRENCY, files.length) }, async () => {
    while (cursor < files.length) {
      const index = cursor;
      cursor += 1;
      const file = files[index];
      if (!file) continue;

      if (getCurrentUrls().length >= maxTotal) {
        failures.push(`${file.name || "Foto"}: se alcanzó el máximo de ${maxTotal} fotos.`);
        done += 1;
        onProgress?.({ done, total });
        continue;
      }

      try {
        const compressed = await compressProyectoImage(file);
        await new Promise<void>((r) => window.setTimeout(r, 0));
        const result = await uploadProyectoImageToCloudinary(compressed, folder);
        if (result.ok) {
          const accepted = await appendUrl(result.url);
          if (accepted) {
            uploadedUrls.push(result.url);
          } else {
            failures.push(`${file.name || "Foto"}: se alcanzó el máximo de ${maxTotal} fotos.`);
          }
        } else {
          failures.push(`${file.name || "Foto"}: ${result.message}`);
        }
      } catch (err) {
        console.error("Error al subir imagen de proyecto:", err);
        failures.push(proyectoImageProcessErrorMessage(file));
      }

      done += 1;
      onProgress?.({ done, total });
    }
  });

  await Promise.all(workers);
  await appendChain;
  return { uploadedUrls, failures };
}

/** Une aceptados + rechazados “salvables” (MIME vacío), sin HEIC. */
export function collectProyectoImageFiles(
  acceptedFiles: File[],
  rejectedFiles: File[],
  limit: number
): { files: File[]; heicFiles: File[] } {
  const fromAccepted = acceptedFiles.filter(isLikelyImageFile);
  const fromRejected = rejectedFiles.filter(isLikelyImageFile);
  const merged = [...fromAccepted];
  for (const f of fromRejected) {
    if (!merged.includes(f)) merged.push(f);
  }
  const heicFiles = merged.filter(isHeicLikeFile);
  const files = merged.filter((f) => !isHeicLikeFile(f)).slice(0, Math.max(0, limit));
  return { files, heicFiles };
}
