import { deleteSecureValue, readSecureValue, writeSecureValue } from '@/auth/secureStore';
import { archivosDisponibles } from './modulosNativos';

type FileSystemLegacy = typeof import('expo-file-system/legacy');

/** Carpeta que el usuario eligió para los PDFs (URI del Storage Access Framework). */
const CLAVE_CARPETA = 'pdf.carpeta_descargas';

export type ResultadoGuardado = { estado: 'guardado'; carpeta: string } | { estado: 'cancelado' };

function cargarFileSystem(): FileSystemLegacy | null {
  if (!archivosDisponibles()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-file-system/legacy') as FileSystemLegacy;
  } catch {
    return null;
  }
}

/** ¿Se puede guardar el PDF directo en el teléfono (sin pasar por el navegador)? */
export function puedeGuardarPdf(): boolean {
  return cargarFileSystem() !== null;
}

/** «Download» de `content://…/tree/primary%3ADownload` → «Download». */
export function nombreCarpeta(uri: string): string {
  const decodificada = decodeURIComponent(uri);
  const ultima = decodificada.split(/[/:]/).filter(Boolean).pop() ?? '';
  return ultima === 'Download' ? 'Descargas' : ultima || 'la carpeta elegida';
}

function cabecera(headers: Record<string, string> | undefined, nombre: string): string {
  if (!headers) return '';
  const clave = Object.keys(headers).find((k) => k.toLowerCase() === nombre);
  return clave ? String(headers[clave]) : '';
}

/**
 * Descarga el PDF y lo guarda en una carpeta pública del teléfono
 * (Descargas, por defecto). La primera vez Android pide elegir la carpeta;
 * después se reutiliza el permiso sin volver a preguntar.
 */
export async function guardarPdfEnTelefono(url: string, nombreArchivo: string): Promise<ResultadoGuardado> {
  const FS = cargarFileSystem();
  if (!FS || !FS.cacheDirectory) throw new Error('Este teléfono no permite guardar archivos desde la app.');
  const SAF = FS.StorageAccessFramework;
  const temporal = `${FS.cacheDirectory}${Date.now()}-${nombreArchivo}`;

  try {
    const descarga = await FS.downloadAsync(url, temporal);
    if (descarga.status !== 200) {
      throw new Error(
        descarga.status === 410
          ? 'El enlace del PDF expiró. Inténtalo de nuevo.'
          : `No se pudo descargar el PDF (código ${descarga.status}).`,
      );
    }
    if (!cabecera(descarga.headers, 'content-type').includes('pdf')) {
      throw new Error('El servidor no pudo generar el PDF en este momento. Inténtalo más tarde.');
    }

    const contenido = await FS.readAsStringAsync(temporal, { encoding: FS.EncodingType.Base64 });
    const nombre = nombreArchivo.replace(/\.pdf$/i, '');

    const escribirEn = async (carpeta: string) => {
      const destino = await SAF.createFileAsync(carpeta, nombre, 'application/pdf');
      await SAF.writeAsStringAsync(destino, contenido, { encoding: FS.EncodingType.Base64 });
    };

    const guardada = await readSecureValue(CLAVE_CARPETA);
    if (guardada) {
      try {
        await escribirEn(guardada);
        return { estado: 'guardado', carpeta: nombreCarpeta(guardada) };
      } catch {
        // El permiso se revocó o la carpeta ya no existe: se vuelve a pedir.
        await deleteSecureValue(CLAVE_CARPETA);
      }
    }

    const permiso = await SAF.requestDirectoryPermissionsAsync(SAF.getUriForDirectoryInRoot('Download'));
    if (!permiso.granted) return { estado: 'cancelado' };
    await escribirEn(permiso.directoryUri);
    await writeSecureValue(CLAVE_CARPETA, permiso.directoryUri);
    return { estado: 'guardado', carpeta: nombreCarpeta(permiso.directoryUri) };
  } finally {
    await FS.deleteAsync(temporal, { idempotent: true }).catch(() => undefined);
  }
}
