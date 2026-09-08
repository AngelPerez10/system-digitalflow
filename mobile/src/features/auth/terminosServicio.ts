/**
 * Términos de servicio en sitio que el cliente acepta al crear su cuenta.
 *
 * El texto es el mismo documento legal de `mobile/Terminos-Servicio.md`; se
 * mantiene aquí como dato estructurado para poder pintarlo en la pantalla de
 * registro (y reutilizarlo donde se genera una Orden de Trabajo) sin depender
 * de un lector de Markdown en tiempo de ejecución.
 */

export const TERMINOS_SERVICIO_TITULO = 'Aceptación de términos de servicio en sitio';

export const TERMINOS_SERVICIO_PARRAFOS: readonly string[] = [
  'Al generar la presente solicitud de servicio u Orden de Trabajo mediante la aplicación, el cliente reconoce y acepta que la atención técnica que requiera una visita en sitio genera un cargo mínimo de $696.00 MXN.',
  'El cliente comprende que este importe corresponde al servicio técnico inicial en sitio y que el costo final podrá variar dependiendo del diagnóstico, tiempo requerido, complejidad de la falla, trabajos adicionales o condiciones encontradas durante la visita.',
  'En caso de que para solucionar la problemática sea necesario utilizar, sustituir o instalar equipos, materiales, refacciones o productos adicionales, el técnico informará previamente al cliente sobre su requerimiento y costo, solicitando su autorización antes de realizar cualquier trabajo adicional que genere un cargo.',
  'El cliente manifiesta estar consciente de que la generación del ticket o solicitud de servicio implica la aceptación del posible cargo por atención técnica en sitio.',
  'Cuando el cliente indique que la falla pudiera corresponder a una garantía, el técnico realizará la revisión y diagnóstico correspondiente. Si después de la inspección se determina que la falla efectivamente procede como garantía, la atención no generará costo para el cliente, de acuerdo con las condiciones de garantía aplicables.',
  'Si la falla no corresponde a garantía, se aplicará el costo de servicio en sitio y, en su caso, los cargos adicionales previamente autorizados por el cliente.',
] as const;

/** Frase de cierre que acompaña a la casilla de aceptación. */
export const TERMINOS_SERVICIO_CIERRE =
  'Al aceptar los términos y condiciones, el cliente confirma haber leído, comprendido y aceptado las condiciones anteriormente descritas.';
