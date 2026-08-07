/** Accept para dropzone: en celular el MIME a veces viene vacío o es HEIC. */
export const PROYECTO_IMAGE_ACCEPT: Record<string, string[]> = {
  "image/*": [".jpeg", ".jpg", ".png", ".webp", ".gif", ".heic", ".heif", ".bmp"],
};

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
