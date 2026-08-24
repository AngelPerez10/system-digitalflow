import { uploadReporteImage } from "./reporteApi";

const MAX_EDGE = 1600;
const MAX_KB = 180;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Error al leer la imagen"));
    reader.readAsDataURL(blob);
  });
}

async function encodeCanvas(canvas: HTMLCanvasElement, maxKb: number): Promise<string> {
  let quality = 0.88;
  for (let i = 0; i < 8; i++) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality)
    );
    if (!blob) throw new Error("No se pudo comprimir la imagen");
    if (blob.size / 1024 <= maxKb || quality <= 0.35) {
      return blobToDataUrl(blob);
    }
    quality -= 0.1;
  }
  throw new Error("No se pudo comprimir la imagen");
}

export async function compressReporteImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  let width = bitmap.width;
  let height = bitmap.height;
  if (width > MAX_EDGE || height > MAX_EDGE) {
    const ratio = Math.min(MAX_EDGE / width, MAX_EDGE / height);
    width = Math.floor(width * ratio);
    height = Math.floor(height * ratio);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("No se pudo preparar el canvas");
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return encodeCanvas(canvas, MAX_KB);
}

export async function uploadReporteFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
    throw new Error("Usa JPG, PNG o WebP.");
  }
  if (/\.(heic|heif)$/i.test(file.name) || /heic|heif/i.test(file.type)) {
    throw new Error(
      "Las fotos HEIC del iPhone no se pueden procesar aquí. En el iPhone: Ajustes → Cámara → Formatos → «Más compatible»."
    );
  }
  const dataUrl = await compressReporteImage(file);
  return uploadReporteImage(dataUrl);
}
