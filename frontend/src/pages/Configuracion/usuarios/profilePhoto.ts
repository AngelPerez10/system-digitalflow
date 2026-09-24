/**
 * Foto de perfil: validación del archivo y recorte cuadrado en el navegador.
 *
 * Se sube ya recortada a 512×512 JPEG: pesa ~60–150 KB (el backend acepta
 * hasta 5 MB) y todas las fotos se ven iguales en listas, PDF y portal.
 */

export const PROFILE_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';
export const PROFILE_PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const PROFILE_PHOTO_SIZE = 512;

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Mensaje de error si el archivo no sirve; `null` si es válido. */
export function validateProfilePhotoFile(file: Pick<File, 'type' | 'size' | 'name'>): string | null {
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  if (/\.(heic|heif)$/.test(name) || type.includes('heic') || type.includes('heif')) {
    return 'Las fotos HEIC del iPhone no son compatibles. Expórtala como JPG o PNG.';
  }
  if (!ALLOWED.has(type)) return 'Usa una imagen JPG, PNG o WebP.';
  if (file.size > PROFILE_PHOTO_MAX_BYTES) return 'La imagen pesa más de 10 MB. Elige una más ligera.';
  return null;
}

/** Recorte centrado (cover) para un lado de `size` px. */
export function centerSquareCrop(width: number, height: number): { sx: number; sy: number; side: number } {
  const side = Math.min(width, height);
  return { sx: Math.round((width - side) / 2), sy: Math.round((height - side) / 2), side };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };
    img.src = url;
  });
}

/** Devuelve un data URL JPEG cuadrado listo para `PUT …/avatar/`. */
export async function prepareProfilePhoto(file: File, size = PROFILE_PHOTO_SIZE): Promise<string> {
  const invalid = validateProfilePhotoFile(file);
  if (invalid) throw new Error(invalid);
  const img = await loadImage(file);
  const { sx, sy, side } = centerSquareCrop(img.naturalWidth, img.naturalHeight);
  const out = Math.min(size, side);
  const canvas = document.createElement('canvas');
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tu navegador no pudo procesar la imagen.');
  // Fondo blanco: los PNG con transparencia no quedan negros al pasar a JPEG.
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, out, out);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
  return canvas.toDataURL('image/jpeg', 0.88);
}
