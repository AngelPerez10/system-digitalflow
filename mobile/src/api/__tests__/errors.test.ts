import { messageFromPayload } from '../errors';

/**
 * Regla de seguridad: la UI solo muestra frases que vengan de la API en JSON.
 * Nunca un cuerpo crudo — la página de depuración de Django (400 por
 * `DisallowedHost`, por ejemplo) trae traceback y configuración del servidor.
 */
describe('messageFromPayload', () => {
  it('muestra el detail de DRF', () => {
    expect(messageFromPayload(401, { detail: 'Credenciales inválidas' })).toBe(
      'Credenciales inválidas',
    );
  });

  it('muestra el primer error de campo', () => {
    expect(messageFromPayload(400, { motivo_pausa: ['Indique por qué se pausó la orden.'] })).toBe(
      'Indique por qué se pausó la orden.',
    );
  });

  it('NUNCA muestra una página HTML de error del servidor', () => {
    const paginaDebug =
      '<!DOCTYPE html><html><head><title>DisallowedHost at /api/login/</title></head>' +
      '<body><h1>Invalid HTTP_HOST header</h1><table id="settings">SECRET_KEY, DATABASES…</table></body></html>';
    const mensaje = messageFromPayload(400, paginaDebug);
    expect(mensaje).toBe('Los datos enviados no son válidos.');
    expect(mensaje).not.toContain('<');
    expect(mensaje).not.toContain('SECRET_KEY');
  });

  it('descarta un detail que en realidad es un volcado HTML', () => {
    const mensaje = messageFromPayload(500, { detail: '<html><body>Traceback…</body></html>' });
    expect(mensaje).toBe('Error del servidor. Intente más tarde.');
  });

  it('descarta textos demasiado largos para ser un mensaje de la API', () => {
    const mensaje = messageFromPayload(400, { detail: 'x'.repeat(500) });
    expect(mensaje).toBe('Los datos enviados no son válidos.');
  });

  it('descarta textos multilínea (tracebacks)', () => {
    const traceback = 'Traceback (most recent call last):\n  File "manage.py"\nDisallowedHost';
    expect(messageFromPayload(400, { detail: traceback })).toBe('Los datos enviados no son válidos.');
  });

  it('usa el mensaje del código de estado cuando no hay cuerpo', () => {
    expect(messageFromPayload(403, null)).toBe('No tiene permiso para realizar esta acción.');
    expect(messageFromPayload(429, undefined)).toBe(
      'Demasiados intentos. Espere un minuto e intente de nuevo.',
    );
  });
});
