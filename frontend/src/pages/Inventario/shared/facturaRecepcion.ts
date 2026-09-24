/**
 * Estado de la recepción de una factura: cuántas unidades llegaron por línea.
 *
 * Se guarda como mapa `indice → recibidas`. Una línea sin entrada cuenta como
 * «no llegó» (0). Lo que no se recibe queda en espera en el servidor y no suma
 * existencias.
 */
import type { FacturaPreviewLinea, RecepcionLinea } from "./inventarioTypes";

export type RecepcionState = Record<number, number>;

export const clampRecibida = (linea: FacturaPreviewLinea, value: number) =>
  Math.max(0, Math.min(Number.isFinite(value) ? Math.trunc(value) : 0, linea.cantidad));

export const recibidaDe = (state: RecepcionState, linea: FacturaPreviewLinea) =>
  clampRecibida(linea, state[linea.indice] ?? 0);

/** Marca (todo lo facturado) o desmarca una línea. */
export const toggleLinea = (state: RecepcionState, linea: FacturaPreviewLinea): RecepcionState => ({
  ...state,
  [linea.indice]: recibidaDe(state, linea) > 0 ? 0 : linea.cantidad,
});

export const setRecibida = (
  state: RecepcionState,
  linea: FacturaPreviewLinea,
  value: number,
): RecepcionState => ({ ...state, [linea.indice]: clampRecibida(linea, value) });

export const marcarTodas = (lineas: FacturaPreviewLinea[], llegaron: boolean): RecepcionState =>
  Object.fromEntries(lineas.map((l) => [l.indice, llegaron ? l.cantidad : 0]));

export type RecepcionResumen = {
  lineasRecibidas: number;
  unidadesRecibidas: number;
  lineasEnEspera: number;
  unidadesEnEspera: number;
  unidadesTotales: number;
};

export const resumirRecepcion = (lineas: FacturaPreviewLinea[], state: RecepcionState): RecepcionResumen => {
  const r: RecepcionResumen = {
    lineasRecibidas: 0,
    unidadesRecibidas: 0,
    lineasEnEspera: 0,
    unidadesEnEspera: 0,
    unidadesTotales: 0,
  };
  for (const linea of lineas) {
    const recibida = recibidaDe(state, linea);
    const falta = linea.cantidad - recibida;
    r.unidadesTotales += linea.cantidad;
    if (recibida > 0) {
      r.lineasRecibidas += 1;
      r.unidadesRecibidas += recibida;
    }
    if (falta > 0) {
      r.lineasEnEspera += 1;
      r.unidadesEnEspera += falta;
    }
  }
  return r;
};

/** Payload para el servidor: todas las líneas, con su `modelo` como verificación. */
export const recepcionPayload = (lineas: FacturaPreviewLinea[], state: RecepcionState): RecepcionLinea[] =>
  lineas.map((linea) => ({ indice: linea.indice, modelo: linea.modelo, recibida: recibidaDe(state, linea) }));
