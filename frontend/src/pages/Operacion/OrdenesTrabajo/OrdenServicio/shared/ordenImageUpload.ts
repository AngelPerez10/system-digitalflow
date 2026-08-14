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

export function ordenImageRejectMessage(fileName?: string): string {
  const name = String(fileName || "").toLowerCase();
  if (/\.(heic|heif)$/.test(name)) {
    return "Las fotos HEIC del iPhone no se pueden procesar aquí. En el iPhone: Ajustes → Cámara → Formatos → «Más compatible», o elige JPG.";
  }
  return "Formato no válido. Usa JPG, PNG o WebP (en iPhone elige «Más compatible»).";
}

export function ordenImageProcessErrorMessage(file: File): string {
  if (isHeicLikeFile(file)) {
    return `${file.name || "Foto"}: formato HEIC no soportado. Cambia la cámara a «Más compatible» (JPG).`;
  }
  return `${file.name || "Foto"}: no se pudo procesar. Inténtalo de nuevo.`;
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

async function createOrientedBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return await createImageBitmap(file);
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

/**
 * Compresión para celular: createImageBitmap (respeta orientación EXIF)
 * y pocos pases de JPEG. El canvas blanco + FileReader de 5 fotos a la vez
 * subía JPEGs vacíos a Cloudinary.
 */
export async function compressImage(
  file: File,
  maxSizeKB: number = ORDEN_COMPRESS_MAX_KB,
  maxWidth: number = ORDEN_COMPRESS_MAX_EDGE,
  maxHeight: number = ORDEN_COMPRESS_MAX_EDGE,
): Promise<string> {
  const maxEdge = Math.min(maxWidth, maxHeight);
  let bitmap: ImageBitmap | null = null;
  let width = 0;
  let height = 0;
  let source: CanvasImageSource | null = null;

  try {
    bitmap = await createOrientedBitmap(file);
    width = bitmap.width;
    height = bitmap.height;
    source = bitmap;
  } catch {
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
    source = img;
  }

  try {
    assertDrawableSize(width, height);
    if (width > maxEdge || height > maxEdge) {
      const ratio = Math.min(maxEdge / width, maxEdge / height);
      width = Math.max(8, Math.floor(width * ratio));
      height = Math.max(8, Math.floor(height * ratio));
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx || !source) throw new Error("No se pudo preparar el canvas");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(source, 0, 0, width, height);
    return encodeCanvasToJpegDataUrl(canvas, maxSizeKB);
  } finally {
    bitmap?.close();
  }
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
