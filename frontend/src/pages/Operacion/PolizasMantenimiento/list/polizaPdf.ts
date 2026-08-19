import { FOLIO_SERIE, formatDocumentFolio } from "@/utils/documentFolio";
import type { PolizaAltaValues, PolizaRow } from "./polizaListTypes";

export function buildPolizaPdfSearch(opts: {
  id?: number;
  tipo?: string;
  folio: string;
  cliente?: string;
  clienteId?: string;
  cotizacionId?: string;
  cotizacionFolio?: string;
  fecha1?: string;
  fecha2?: string;
  fecha3?: string;
}): string {
  const params = new URLSearchParams();
  params.set("tipo", opts.tipo || "cctv");
  if (opts.id && opts.id > 0) params.set("id", String(opts.id));
  if (opts.folio) params.set("folio", opts.folio);
  if (opts.cliente) params.set("cliente", opts.cliente);
  if (opts.clienteId && /^\d+$/.test(opts.clienteId)) params.set("cliente_id", opts.clienteId);
  if (opts.cotizacionId && /^\d+$/.test(opts.cotizacionId)) {
    params.set("cotizacion_id", opts.cotizacionId);
  }
  if (opts.cotizacionFolio && opts.cotizacionFolio !== "—") {
    params.set("cotizacion", opts.cotizacionFolio);
  }
  if (opts.fecha1) params.set("v1", opts.fecha1);
  if (opts.fecha2) params.set("v2", opts.fecha2);
  if (opts.fecha3) params.set("v3", opts.fecha3);
  return params.toString();
}

export function polizaPdfSearchFromRow(row: PolizaRow): string {
  return buildPolizaPdfSearch({
    id: row.id,
    tipo: row.tipo,
    folio: row.folio,
    cliente: row.cliente,
    clienteId: row.clienteId,
    cotizacionId: row.cotizacionId,
    cotizacionFolio: row.cotizacionFolio,
    fecha1: row.fecha1,
    fecha2: row.fecha2,
    fecha3: row.fecha3,
  });
}

export function polizaPdfSearchFromDraft(opts: {
  folio: string;
  values: PolizaAltaValues;
  clienteLabel?: string;
}): string {
  return buildPolizaPdfSearch({
    tipo: opts.values.tipo,
    folio: opts.folio || formatDocumentFolio(FOLIO_SERIE.poliza, 10001),
    cliente: opts.clienteLabel,
    clienteId: opts.values.clienteId,
    cotizacionId: opts.values.cotizacionId,
    cotizacionFolio: opts.values.cotizacionId
      ? formatDocumentFolio(FOLIO_SERIE.cotizacion, opts.values.cotizacionId)
      : undefined,
    fecha1: opts.values.fecha1,
    fecha2: opts.values.fecha2,
    fecha3: opts.values.fecha3,
  });
}
