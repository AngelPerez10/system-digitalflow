import type { ThemeColors } from '@/theme/tokens';
import type { Reporte, ReporteZona } from '@/types/reporte';

/** Folio visible: el del servidor o, si falta, el consecutivo. */
export function folioReporte(reporte: Pick<Reporte, 'folio' | 'idx' | 'id'>): string {
  const folio = reporte.folio?.trim();
  if (folio) return folio;
  return `RM-${reporte.idx ?? reporte.id}`;
}

export function clienteReporte(reporte: Pick<Reporte, 'orden_cliente'>): string {
  return reporte.orden_cliente?.trim() || 'Sin cliente';
}

export function origenLabel(reporte: Pick<Reporte, 'origen_tipo'>): string {
  return reporte.origen_tipo === 'proyecto' ? 'Proyecto' : 'Orden de trabajo';
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** `2026-09-29` → «martes» (fecha local, sin desfase de zona horaria). */
export function diaSemana(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '';
  return DIAS[new Date(y, m - 1, d).getDay()] ?? '';
}

/** «Ana Pérez, Luis Gómez» → ['Ana Pérez', 'Luis Gómez'] (sin vacíos ni repetidos). */
export function tecnicosDe(texto: string): string[] {
  const nombres: string[] = [];
  for (const parte of texto.split(',')) {
    const nombre = parte.replace(/\s+/g, ' ').trim();
    if (nombre && !nombres.some((n) => n.toLowerCase() === nombre.toLowerCase())) nombres.push(nombre);
  }
  return nombres;
}

export function zonaCompleta(zona: ReporteZona): boolean {
  return zona.fotos_antes.length > 0 && zona.fotos_despues.length > 0;
}

export interface EvidenciaReporte {
  antes: number;
  despues: number;
  fotos: number;
  zonas: number;
  /** Zonas con al menos una foto de Antes y una de Después. */
  completas: number;
  /** Primera foto de cada lado: la portada de la tarjeta. */
  portadaAntes: string | null;
  portadaDespues: string | null;
}

export function evidenciaDe(reporte: Pick<Reporte, 'secciones'>): EvidenciaReporte {
  let antes = 0;
  let despues = 0;
  let completas = 0;
  let portadaAntes: string | null = null;
  let portadaDespues: string | null = null;
  for (const zona of reporte.secciones) {
    antes += zona.fotos_antes.length;
    despues += zona.fotos_despues.length;
    if (zonaCompleta(zona)) completas += 1;
    portadaAntes ??= zona.fotos_antes[0] ?? null;
    portadaDespues ??= zona.fotos_despues[0] ?? null;
  }
  return { antes, despues, fotos: antes + despues, zonas: reporte.secciones.length, completas, portadaAntes, portadaDespues };
}

export interface FotoPortada {
  url: string;
  lado: 'antes' | 'despues';
}

/**
 * Fotos para la tira de la tarjeta: zona por zona, primero su Antes y luego
 * su Después (así las primeras miniaturas ya muestran un par comparable).
 */
export function fotosPortada(reporte: Pick<Reporte, 'secciones'>, max = 4): FotoPortada[] {
  const salida: FotoPortada[] = [];
  for (const zona of reporte.secciones) {
    const lados: FotoPortada[] = [
      ...zona.fotos_antes.map((url) => ({ url, lado: 'antes' as const })),
      ...zona.fotos_despues.map((url) => ({ url, lado: 'despues' as const })),
    ];
    // Un Antes y un Después por zona antes de repetir lado.
    lados.sort((a, b) => Number(a.lado === 'despues') - Number(b.lado === 'despues'));
    const primeroDespues = lados.findIndex((f) => f.lado === 'despues');
    if (primeroDespues > 1) lados.splice(1, 0, ...lados.splice(primeroDespues, 1));
    for (const foto of lados) {
      if (salida.length >= max) return salida;
      salida.push(foto);
    }
  }
  return salida;
}

/** Filtro de zonas del detalle (reportes largos). */
export type FiltroZonas = 'todas' | 'completas' | 'faltantes';

export function filtrarZonas(zonas: readonly ReporteZona[], filtro: FiltroZonas): ReporteZona[] {
  if (filtro === 'todas') return [...zonas];
  return zonas.filter((z) => zonaCompleta(z) === (filtro === 'completas'));
}

/** Estado por zona para la barra segmentada de la tarjeta. */
export function estadoZonas(reporte: Pick<Reporte, 'secciones'>): EstadoEvidencia[] {
  return reporte.secciones.map((z) =>
    zonaCompleta(z) ? 'completa' : z.fotos_antes.length + z.fotos_despues.length > 0 ? 'parcial' : 'sin',
  );
}

/**
 * En qué punto está la evidencia — lo que el técnico necesita saber de un
 * vistazo: si le falta tomar fotos y de qué lado.
 */
export type EstadoEvidencia = 'sin' | 'parcial' | 'completa';

export const ESTADOS_EVIDENCIA: readonly EstadoEvidencia[] = ['sin', 'parcial', 'completa'];

export function estadoEvidencia(reporte: Pick<Reporte, 'secciones'>): EstadoEvidencia {
  const ev = evidenciaDe(reporte);
  if (ev.fotos === 0) return 'sin';
  return ev.zonas > 0 && ev.completas === ev.zonas ? 'completa' : 'parcial';
}

export function estadoLabel(estado: EstadoEvidencia): string {
  if (estado === 'sin') return 'Sin evidencia';
  if (estado === 'parcial') return 'Incompletos';
  return 'Completos';
}

/** Etiqueta en singular para la píldora de una tarjeta. */
export function estadoLabelCorto(estado: EstadoEvidencia): string {
  if (estado === 'sin') return 'Sin fotos';
  if (estado === 'parcial') return 'Incompleto';
  return 'Completo';
}

/** Mismas familias de color que los estatus de órdenes: ámbar = pendiente, índigo = en curso, verde = listo. */
export function estadoTone(estado: EstadoEvidencia, colors: ThemeColors): { bg: string; text: string } {
  if (estado === 'sin') return { bg: colors.statusPendienteBg, text: colors.statusPendienteText };
  if (estado === 'parcial') return { bg: colors.statusPausadoBg, text: colors.statusPausadoText };
  return { bg: colors.statusResueltoBg, text: colors.statusResueltoText };
}

export function perteneceAlMes(reporte: Pick<Reporte, 'fecha_servicio'>, mes: string): boolean {
  return reporte.fecha_servicio.startsWith(`${mes}-`);
}

export function coincideBusqueda(reporte: Reporte, termino: string): boolean {
  const q = termino.trim().toLowerCase();
  if (!q) return true;
  return [folioReporte(reporte), reporte.orden_folio, reporte.orden_cliente, reporte.tecnico_nombre]
    .filter((c): c is string => Boolean(c))
    .some((c) => c.toLowerCase().includes(q));
}

/** Más recientes primero (fecha de servicio y, a igualdad, folio). */
export function ordenarReportes(reportes: readonly Reporte[]): Reporte[] {
  return [...reportes].sort(
    (a, b) => b.fecha_servicio.localeCompare(a.fecha_servicio) || (b.idx ?? b.id) - (a.idx ?? a.id),
  );
}

export interface ReporteSection {
  key: EstadoEvidencia;
  title: string;
  data: Reporte[];
}

/** Lo que falta primero (sin evidencia → incompletos → completos), sin secciones vacías. */
export function agruparPorEvidencia(reportes: readonly Reporte[]): ReporteSection[] {
  const ordenados = ordenarReportes(reportes);
  return ESTADOS_EVIDENCIA.map((key) => ({
    key,
    title: estadoLabel(key),
    data: ordenados.filter((r) => estadoEvidencia(r) === key),
  })).filter((s) => s.data.length > 0);
}

export type FiltroReporte = EstadoEvidencia | 'todos';

export function filtrarSecciones(secciones: readonly ReporteSection[], filtro: FiltroReporte): ReporteSection[] {
  return filtro === 'todos' ? [...secciones] : secciones.filter((s) => s.key === filtro);
}

export function contarPorEvidencia(reportes: readonly Reporte[]): Record<EstadoEvidencia, number> {
  const conteo: Record<EstadoEvidencia, number> = { sin: 0, parcial: 0, completa: 0 };
  for (const r of reportes) conteo[estadoEvidencia(r)] += 1;
  return conteo;
}
