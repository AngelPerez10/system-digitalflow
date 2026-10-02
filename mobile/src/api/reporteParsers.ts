import { REPORTE_MAX_FOTOS_POR_LADO, type Reporte, type ReporteZona } from '@/types/reporte';
import { asNumber, asRecord, asString } from './parsers';

/** Normalizadores de reportes de mantenimiento (tolerantes a `null` y a campos viejos). */

function idPositivo(value: unknown): number | null {
  const n = asNumber(value);
  return n !== null && n > 0 ? n : null;
}

/** Lista de URLs sin vacíos ni repetidas; acepta la foto suelta del formato anterior. */
function listaFotos(raw: unknown, legacy: unknown): string[] {
  const urls: string[] = [];
  const unica = asString(legacy);
  if (unica) urls.push(unica);
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const url = asString(item);
      if (url && !urls.includes(url)) urls.push(url);
    }
  }
  return urls.slice(0, REPORTE_MAX_FOTOS_POR_LADO);
}

export function parseZonas(raw: unknown): ReporteZona[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    const r = asRecord(item);
    return {
      id: asString(r.id) ?? `zona-${i + 1}`,
      titulo: asString(r.titulo) ?? '',
      fotos_antes: listaFotos(r.fotos_antes, r.foto_antes_url),
      fotos_despues: listaFotos(r.fotos_despues, r.foto_despues_url),
    };
  });
}

export function parseReporte(raw: unknown): Reporte {
  const r = asRecord(raw);
  const ordenId = idPositivo(r.orden_id);
  const proyectoId = idPositivo(r.proyecto_id);
  return {
    id: asNumber(r.id) ?? 0,
    idx: asNumber(r.idx),
    folio: asString(r.folio),
    orden_id: ordenId,
    proyecto_id: proyectoId,
    origen_tipo: r.origen_tipo === 'proyecto' || proyectoId !== null ? 'proyecto' : 'orden',
    orden_folio: asString(r.orden_folio),
    orden_cliente: asString(r.orden_cliente),
    fecha_servicio: (asString(r.fecha_servicio) ?? '').slice(0, 10),
    tecnico_nombre: asString(r.tecnico_nombre) ?? '',
    secciones: parseZonas(r.secciones),
    creado_por: asNumber(r.creado_por),
    creado_por_username: asString(r.creado_por_username),
    updated_at: asString(r.updated_at),
  };
}

export function parseReporteList(raw: unknown): Reporte[] {
  const lista = Array.isArray(raw) ? raw : asRecord(raw).results;
  return Array.isArray(lista) ? lista.map(parseReporte) : [];
}
