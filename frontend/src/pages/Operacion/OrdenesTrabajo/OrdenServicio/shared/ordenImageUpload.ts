import { fetchApi } from "@/config/api";

/** En celular el MIME a veces viene vacío o es HEIC. */
export const ORDEN_IMAGE_ACCEPT: Record<string, string[]> = {
  "image/*": [".jpeg", ".jpg", ".png", ".webp", ".heic", ".heif"],
};

/** Evita saturar CPU/RAM en móvil: 5 fotos a la vez pintaban canvas en blanco. */
export const ORDEN_UPLOAD_CONCURRENCY = 2;
export const ORDEN_COMPRESS_MAX_KB = 80;
export const ORDEN_COMPRESS_MAX_EDGE = 1280;

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|heic|heif)$/i;

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

/** HEIC/HEIF ISO BMFF: bytes 4–8 = "ftyp" y luego marca heic/heif/mif1… */
export function looksLikeHeicBuffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 12) return false;
  const bytes = new Uint8Array(buffer);
  const brand = String.fromCharCode(
    bytes[4],
    bytes[5],
    bytes[6],
    bytes[7],
    bytes[8],
    bytes[9],
    bytes[10],
    bytes[11],
  );
  return /^ftyp(heic|heix|hevc|hevx|heim|heis|hevm|hevs|mif1|msf1|heif)/i.test(brand);
}

async function fileLooksLikeHeic(file: File): Promise<boolean> {
  if (isHeicLikeFile(file)) return true;
  try {
    const header = await file.slice(0, 16).arrayBuffer();
    return looksLikeHeicBuffer(header);
  } catch {
    return false;
  }
}

export function ordenImageRejectMessage(fileName?: string): string {
  const name = String(fileName || "").toLowerCase();
  if (/\.(heic|heif)$/.test(name)) {
    return "Este archivo es HEIC y no se puede procesar aquí. Usa JPG, PNG o WebP.";
  }
  return "Formato no válido. Usa JPG, PNG o WebP.";
}

export function ordenImageProcessErrorMessage(file: File): string {
  if (isHeicLikeFile(file)) {
    return `${file.name || "Foto"}: formato HEIC no soportado. Usa JPG o PNG.`;
  }
  return `${file.name || "Foto"}: no se pudo procesar la foto de la cámara. Inténtalo de nuevo.`;
}

export function scaledImageSize(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    return { width: 0, height: 0 };
  }
  if (width <= maxEdge && height <= maxEdge) {
    return { width: Math.floor(width), height: Math.floor(height) };
  }
  const ratio = Math.min(maxEdge / width, maxEdge / height);
  return {
    width: Math.max(8, Math.floor(width * ratio)),
    height: Math.max(8, Math.floor(height * ratio)),
  };
}

/** Canvas que quedó plano (p. ej. fillRect blanco + drawImage fallido en Chrome Android). */
export function isLowVarianceRgba(data: Uint8ClampedArray): boolean {
  const pixels = Math.floor(data.length / 4);
  if (pixels < 1) return true;
  const stride = Math.max(1, Math.floor(pixels / 500));
  let n = 0;
  let sum = 0;
  let sum2 = 0;
  for (let p = 0; p < pixels; p += stride) {
    const i = p * 4;
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    n += 1;
    sum += y;
    sum2 += y * y;
  }
  const mean = sum / n;
  const variance = sum2 / n - mean * mean;
  return variance < 18;
}

function canvasLooksBlank(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const sampleW = Math.min(width, 64);
    const sampleH = Math.min(height, 64);
    const img = ctx.getImageData(0, 0, sampleW, sampleH);
    return isLowVarianceRgba(img.data);
  } catch {
    return false;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || "");
      if (!result.startsWith("data:image/")) {
        reject(new Error("La imagen comprimida no es válida"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Error al leer la imagen comprimida"));
    reader.readAsDataURL(blob);
  });
}

async function materializeImageBlob(file: File): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const type =
    file.type && file.type.toLowerCase().startsWith("image/") ? file.type : "image/jpeg";
  return new Blob([buf], { type });
}

async function createOrientedBitmap(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    return await createImageBitmap(blob);
  }
}

async function decodeScaledBitmap(
  blob: Blob,
  maxEdge: number,
): Promise<{ bitmap: ImageBitmap; width: number; height: number }> {
  const probe = await createOrientedBitmap(blob);
  const fitted = scaledImageSize(probe.width, probe.height, maxEdge);
  if (probe.width === fitted.width && probe.height === fitted.height) {
    return { bitmap: probe, width: fitted.width, height: fitted.height };
  }
  probe.close();
  try {
    const resized = await createImageBitmap(blob, {
      imageOrientation: "from-image",
      resizeWidth: fitted.width,
      resizeHeight: fitted.height,
      resizeQuality: "medium",
    });
    return {
      bitmap: resized,
      width: resized.width || fitted.width,
      height: resized.height || fitted.height,
    };
  } catch {
    const resized = await createImageBitmap(blob, {
      resizeWidth: fitted.width,
      resizeHeight: fitted.height,
      resizeQuality: "medium",
    });
    return {
      bitmap: resized,
      width: resized.width || fitted.width,
      height: resized.height || fitted.height,
    };
  }
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const el = new Image();
    el.onload = () => {
      URL.revokeObjectURL(url);
      resolve(el);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Error al cargar la imagen"));
    };
    el.src = url;
  });
}

function drawSourceToCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
  if (!ctx) throw new Error("No se pudo preparar el canvas");
  ctx.drawImage(source, 0, 0, width, height);
  if (canvasLooksBlank(ctx, width, height)) {
    throw new Error("La imagen quedó en blanco al comprimirla.");
  }
  return canvas;
}

/**
 * Compresión para Android: copia el File (la cámara a veces entrega un blob
 * a medias), reduce en el decode (GPU de celular no traga JPEG 12 MP) y
 * rechaza el canvas plano en vez de subir un JPEG blanco a Cloudinary.
 */
export async function compressImage(
  file: File,
  maxSizeKB: number = ORDEN_COMPRESS_MAX_KB,
  maxWidth: number = ORDEN_COMPRESS_MAX_EDGE,
  maxHeight: number = ORDEN_COMPRESS_MAX_EDGE,
): Promise<string> {
  const maxEdge = Math.min(maxWidth, maxHeight);
  const blob = await materializeImageBlob(file);
  let bitmap: ImageBitmap | null = null;

  try {
    const scaled = await decodeScaledBitmap(blob, maxEdge);
    bitmap = scaled.bitmap;
    assertDrawableSize(scaled.width, scaled.height);
    const canvas = drawSourceToCanvas(scaled.bitmap, scaled.width, scaled.height);
    return encodeCanvasToJpegDataUrl(canvas, maxSizeKB);
  } catch {
    bitmap?.close();
    bitmap = null;
    const img = await loadImageFromBlob(blob);
    const fitted = scaledImageSize(
      img.naturalWidth || img.width,
      img.naturalHeight || img.height,
      maxEdge,
    );
    assertDrawableSize(fitted.width, fitted.height);
    const canvas = drawSourceToCanvas(img, fitted.width, fitted.height);
    return encodeCanvasToJpegDataUrl(canvas, maxSizeKB);
  } finally {
    bitmap?.close();
  }
}

function assertDrawableSize(width: number, height: number): void {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 8 || height < 8) {
    throw new Error("La imagen no se pudo decodificar (quedaría en blanco).");
  }
}

async function encodeCanvasToJpegDataUrl(
  canvas: HTMLCanvasElement,
  maxSizeKB: number,
): Promise<string> {
  let quality = 0.72;
  let blob: Blob | null = null;
  for (let i = 0; i < 5; i++) {
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
    });
    if (!blob) throw new Error("Error al comprimir la imagen");
    if (blob.size / 1024 <= maxSizeKB || quality <= 0.28) break;
    quality = Math.max(0.28, quality - 0.12);
  }
  if (!blob) throw new Error("Error al comprimir la imagen");
  return blobToDataUrl(blob);
}

export type OrdenImageUploadResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

export async function uploadOrdenImageToCloudinary(
  compressed: string,
  folder: string = "ordenes/fotos",
): Promise<OrdenImageUploadResult> {
  try {
    const resp = await fetchApi("/api/ordenes/upload-image/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data_url: compressed, folder }),
    });
    if (!resp.ok) {
      const body = (await resp.json().catch(() => null)) as { detail?: unknown } | null;
      const detail = body?.detail;
      const message =
        typeof detail === "string" && detail.trim()
          ? detail.trim()
          : resp.status === 502
            ? "No se pudo subir la imagen a Cloudinary."
            : "No se pudo subir la imagen. Inténtalo de nuevo.";
      return { ok: false, message };
    }
    const data = (await resp.json().catch(() => null)) as { url?: string } | null;
    const url = data?.url ? String(data.url) : "";
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return { ok: false, message: "El servidor no devolvió una URL válida." };
    }
    return { ok: true, url };
  } catch {
    return {
      ok: false,
      message: "Error de red al subir la imagen. Revisa tu conexión.",
    };
  }
}

export type OrdenBatchProgress = { done: number; total: number };

export function formatOrdenPhotoProgress(progress: OrdenBatchProgress): string {
  const total = Math.max(1, progress.total);
  const current = Math.min(Math.max(progress.done, 0) + 1, total);
  return `Procesando foto ${current} de ${total}`;
}

export type OrdenBatchUploadResult = {
  uploadedUrls: string[];
  failures: string[];
};

/** Sube varias fotos con 2 workers; muestra cada miniatura en cuanto Cloudinary responde. */
export async function uploadOrdenImageBatch(opts: {
  files: File[];
  folder?: string;
  maxTotal: number;
  getCurrentUrls: () => string[];
  onUrlsChange: (urls: string[]) => void;
  onProgress?: (progress: OrdenBatchProgress) => void;
  isCancelled?: () => boolean;
}): Promise<OrdenBatchUploadResult> {
  const {
    files,
    folder = "ordenes/fotos",
    maxTotal,
    getCurrentUrls,
    onUrlsChange,
    onProgress,
    isCancelled,
  } = opts;
  const uploadedUrls: string[] = [];
  const failures: string[] = [];
  let done = 0;
  const total = files.length;
  onProgress?.({ done: 0, total });

  let appendChain: Promise<void> = Promise.resolve();
  const appendUrl = (url: string): Promise<boolean> => {
    const run = appendChain.then(() => {
      if (isCancelled?.()) return false;
      const current = getCurrentUrls();
      if (current.length >= maxTotal) return false;
      if (current.includes(url)) return true;
      onUrlsChange([...current, url].slice(0, maxTotal));
      return true;
    });
    appendChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(ORDEN_UPLOAD_CONCURRENCY, files.length) },
    async () => {
      while (cursor < files.length) {
        if (isCancelled?.()) return;
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
          if (await fileLooksLikeHeic(file)) {
            failures.push(ordenImageRejectMessage(file.name));
            done += 1;
            onProgress?.({ done, total });
            continue;
          }
          const compressed = await compressImage(file);
          await new Promise<void>((r) => window.setTimeout(r, 0));
          if (isCancelled?.()) return;
          const result = await uploadOrdenImageToCloudinary(compressed, folder);
          if (result.ok) {
            const accepted = await appendUrl(result.url);
            if (accepted) uploadedUrls.push(result.url);
            else failures.push(`${file.name || "Foto"}: se alcanzó el máximo de ${maxTotal} fotos.`);
          } else {
            failures.push(`${file.name || "Foto"}: ${result.message}`);
          }
        } catch (err) {
          console.error("Error al subir foto de orden:", err);
          failures.push(ordenImageProcessErrorMessage(file));
        }

        done += 1;
        onProgress?.({ done, total });
      }
    },
  );

  await Promise.all(workers);
  await appendChain;
  return { uploadedUrls, failures };
}

export function collectOrdenImageFiles(
  acceptedFiles: File[],
  rejectedFiles: File[],
  limit: number,
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
