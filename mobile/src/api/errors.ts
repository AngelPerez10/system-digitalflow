/** Errores de red/API con mensaje listo para mostrar en español. */

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export class NetworkError extends Error {
  constructor(message = 'Sin conexión con el servidor. Verifique su red e intente de nuevo.') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class SessionExpiredError extends ApiError {
  constructor() {
    super(401, 'Tu sesión expiró. Inicia sesión de nuevo.');
    this.name = 'SessionExpiredError';
  }
}

const STATUS_FALLBACK: Record<number, string> = {
  400: 'Los datos enviados no son válidos.',
  401: 'Credenciales inválidas.',
  403: 'No tiene permiso para realizar esta acción.',
  404: 'No se encontró el recurso solicitado.',
  429: 'Demasiados intentos. Espere un minuto e intente de nuevo.',
  500: 'Error del servidor. Intente más tarde.',
  502: 'El servidor no está disponible. Intente más tarde.',
  503: 'El servidor no está disponible. Intente más tarde.',
};

/**
 * Longitud máxima de un mensaje del servidor que aceptamos mostrar. Los errores
 * de DRF son frases; cualquier cosa más larga es un volcado (página de error,
 * traceback, HTML de un proxy) que no debe llegar a la pantalla del técnico.
 */
const MAX_MENSAJE_SERVIDOR = 300;

/**
 * Un texto solo es mostrable si parece una frase de la API, no un documento.
 *
 * Con `DEBUG=True`, Django responde a un host no permitido con su página de
 * depuración: 22 KB de HTML con traceback y configuración del servidor. Volcar
 * eso en la UI expone datos internos al usuario final, así que se descarta.
 */
function esMensajeMostrable(texto: string): boolean {
  const limpio = texto.trim();
  if (!limpio || limpio.length > MAX_MENSAJE_SERVIDOR) return false;
  if (limpio.includes('<') || limpio.includes('\n')) return false;
  return true;
}

/** Extrae el `detail` de DRF (o el primer error de campo) sin perder el idioma. */
export function messageFromPayload(status: number, payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const detail = record.detail;
    if (typeof detail === 'string' && esMensajeMostrable(detail)) return detail.trim();
    for (const value of Object.values(record)) {
      if (typeof value === 'string' && esMensajeMostrable(value)) return value.trim();
      if (Array.isArray(value)) {
        const first = value.find((item) => typeof item === 'string' && esMensajeMostrable(item));
        if (typeof first === 'string') return first.trim();
      }
    }
  }
  // Los cuerpos que no son JSON (HTML de error, texto plano de un proxy) nunca
  // se muestran: solo el mensaje genérico del código de estado.
  return STATUS_FALLBACK[status] ?? 'Ocurrió un error inesperado.';
}

/** Mensaje seguro para cualquier excepción que llegue a la UI. */
export function toUserMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof NetworkError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Ocurrió un error inesperado.';
}
