export type CotizacionPdfOpciones = {
  ocultar_precios_unitarios: boolean;
  ocultar_importes_linea: boolean;
  ocultar_totales: boolean;
  ocultar_detalle: boolean;
  simplificar_descripcion: boolean;
  /** Cotización de garantía: el PDF muestra precios en $0 y marca de agua "GARANTÍA". */
  es_garantia: boolean;
};

export const defaultPdfOpciones = (): CotizacionPdfOpciones => ({
  ocultar_precios_unitarios: false,
  ocultar_importes_linea: false,
  ocultar_totales: false,
  ocultar_detalle: false,
  simplificar_descripcion: false,
  es_garantia: false,
});

export function parsePdfOpcionesFromApi(raw: unknown): CotizacionPdfOpciones {
  if (!raw || typeof raw !== "object") return defaultPdfOpciones();
  const o = raw as Record<string, unknown>;
  return {
    ocultar_precios_unitarios: !!o.ocultar_precios_unitarios,
    ocultar_importes_linea: !!o.ocultar_importes_linea,
    ocultar_totales: !!o.ocultar_totales,
    ocultar_detalle: !!o.ocultar_detalle,
    simplificar_descripcion: !!o.simplificar_descripcion,
    es_garantia: !!o.es_garantia,
  };
}
