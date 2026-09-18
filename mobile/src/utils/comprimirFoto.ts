import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/**
 * Compresión de fotos para subir a `POST /ordenes/upload-image/` — equivalente
 * móvil del `compressImage` web (`OrdenServicio/.../ordenImageUpload.ts`).
 *
 * `expo-image-picker` solo ajusta calidad JPEG, NO redimensiona: una foto de
 * 12 MP llega a varios MB y el backend la rechaza (`_optimize_image` acepta
 * ~640 KB decodificados y `MAX_IMAGE_PIXELS` = 10 MP). Aquí se baja a ≤1280 px
 * y se comprime hasta caber; el backend vuelve a optimizar a 80 KB antes de
 * subir a Cloudinary. HEIC/HEIF entra y sale como JPEG.
 */

/** Presupuesto de bytes decodificados: holgado bajo el límite del backend. */
const OBJETIVO_BYTES = 260_000;
const ANCHOS = [1280, 1024, 800] as const;
const CALIDADES = [0.6, 0.45, 0.35] as const;

function bytesDeBase64(base64: string): number {
  const limpio = base64.endsWith('==') ? base64.slice(0, -2) : base64.endsWith('=') ? base64.slice(0, -1) : base64;
  return Math.floor((limpio.length * 3) / 4);
}

/**
 * Devuelve un data URL JPEG listo para enviar. Prueba anchos/calidades de mayor
 * a menor y se queda con el primero que cabe en el presupuesto; si ninguno
 * cabe, manda el más pequeño que logró (el backend reintenta optimizar).
 */
export async function comprimirFotoParaSubida(uri: string): Promise<string> {
  let ultimoBase64 = '';
  for (const width of ANCHOS) {
    for (const compress of CALIDADES) {
      const salida = await manipulateAsync(
        uri,
        [{ resize: { width } }],
        { compress, format: SaveFormat.JPEG, base64: true },
      );
      if (!salida.base64) continue;
      ultimoBase64 = salida.base64;
      if (bytesDeBase64(salida.base64) <= OBJETIVO_BYTES) {
        return `data:image/jpeg;base64,${salida.base64}`;
      }
    }
  }
  if (!ultimoBase64) {
    throw new Error('No se pudo procesar la imagen. Inténtalo de nuevo.');
  }
  return `data:image/jpeg;base64,${ultimoBase64}`;
}
