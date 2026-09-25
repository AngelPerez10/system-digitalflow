import type { PolizaRow } from "./polizaListTypes";

/** Query de la vista previa PDF; con `id` el backend usa la póliza guardada. */
export function polizaPdfSearchFromRow(row: PolizaRow): string {
  const params = new URLSearchParams();
  params.set("tipo", row.tipo || "cctv");
  if (row.id > 0) params.set("id", String(row.id));
  if (row.folio) params.set("folio", row.folio);
  if (row.cliente) params.set("cliente", row.cliente);
  if (/^\d+$/.test(row.clienteId)) params.set("cliente_id", row.clienteId);
  if (/^\d+$/.test(row.cotizacionId)) params.set("cotizacion_id", row.cotizacionId);
  if (row.cotizacionFolio && row.cotizacionFolio !== "—") params.set("cotizacion", row.cotizacionFolio);
  if (row.servicioTipo) params.set("servicio_tipo", row.servicioTipo);
  if (row.equiposAtendidos) params.set("equipos_atendidos", row.equiposAtendidos);
  row.visitas.slice(0, 4).forEach((fecha, i) => params.set(`v${i + 1}`, fecha));
  return params.toString();
}
