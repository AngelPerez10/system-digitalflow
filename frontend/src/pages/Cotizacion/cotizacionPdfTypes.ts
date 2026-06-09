export type CotizacionPdfOpciones = {
  ocultar_precios_unitarios: boolean;
  ocultar_importes_linea: boolean;
  ocultar_totales: boolean;
  simplificar_descripcion: boolean;
};

export const defaultPdfOpciones = (): CotizacionPdfOpciones => ({
  ocultar_precios_unitarios: false,
  ocultar_importes_linea: false,
  ocultar_totales: false,
  simplificar_descripcion: false,
});

export function parsePdfOpcionesFromApi(raw: unknown): CotizacionPdfOpciones {
  if (!raw || typeof raw !== "object") return defaultPdfOpciones();
  const o = raw as Record<string, unknown>;
  return {
    ocultar_precios_unitarios: !!o.ocultar_precios_unitarios,
    ocultar_importes_linea: !!o.ocultar_importes_linea,
    ocultar_totales: !!o.ocultar_totales,
    simplificar_descripcion: !!o.simplificar_descripcion,
  };
}
