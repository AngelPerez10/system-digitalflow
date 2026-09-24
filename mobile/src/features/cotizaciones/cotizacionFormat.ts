import { lightColors, type ThemeColors } from '@/theme/tokens';
import type {
  CotizacionItem,
  CotizacionListItem,
  CotizacionStatus,
  MedioContacto,
} from '@/types/cotizacion';

/** Factor de IVA mexicano (16 %). Espejo de `IVA_MX_DISPLAY` del backend. */
export const IVA_MX = 1.16;
export const ANTICIPO_MIN = 40;
export const ANTICIPO_MAX = 100;
export const ANTICIPO_DEFAULT = 60;

export const STATUS_ORDER: readonly CotizacionStatus[] = ['PENDIENTE', 'AUTORIZADA', 'CANCELADA'];

const STATUS_LABEL: Record<CotizacionStatus, string> = {
  PENDIENTE: 'Pendiente',
  AUTORIZADA: 'Autorizada',
  CANCELADA: 'Cancelada',
};

export function statusLabel(status: CotizacionStatus): string {
  return STATUS_LABEL[status];
}

export function statusTone(
  status: CotizacionStatus,
  colors: ThemeColors = lightColors,
): { bg: string; text: string } {
  if (status === 'AUTORIZADA') return { bg: colors.statusResueltoBg, text: colors.statusResueltoText };
  if (status === 'CANCELADA') return { bg: colors.dangerBg, text: colors.danger };
  return { bg: colors.statusPendienteBg, text: colors.statusPendienteText };
}

const MEDIO_LABEL: Record<MedioContacto, string> = {
  CLIENTE: 'Cliente',
  BNI: 'BNI',
  REFERIDO: 'Referido',
  WEB: 'Web',
  TIENDA_ONLINE: 'Tienda online',
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  GOOGLE_MAPS: 'Google Maps',
  YOUTUBE: 'YouTube',
  TIENDA_FISICA: 'Tienda física',
};

export function medioLabel(medio: MedioContacto | ''): string {
  return medio ? MEDIO_LABEL[medio] : '—';
}

/** `COT-10023`, igual que `format_document_folio("COT", idx)` del backend. */
export function folioDisplay(c: Pick<CotizacionListItem, 'idx' | 'id'>): string {
  const n = c.idx ?? c.id;
  return `COT-${n}`;
}

export function clienteDisplay(c: Pick<CotizacionListItem, 'cliente_nombre' | 'cliente'>): string {
  return c.cliente_nombre?.trim() || c.cliente.trim() || 'Sin cliente';
}

function redondear(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** `$12,345.60` — sin depender de `Intl` (no siempre completo en Hermes). */
export function formatMoneda(valor: number, conDecimales = true): string {
  const negativo = valor < 0;
  const fijo = Math.abs(redondear(valor)).toFixed(conDecimales ? 2 : 0);
  const [enteros, decimales] = fijo.split('.');
  const conComas = (enteros ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negativo ? '-' : ''}$${conComas}${decimales ? `.${decimales}` : ''}`;
}

/** Versión corta para montos grandes en tarjetas de resumen: `$1.2 M`, `$84.5 k`. */
export function formatMonedaCorta(valor: number): string {
  const abs = Math.abs(valor);
  if (abs >= 1_000_000) return `$${(valor / 1_000_000).toFixed(1).replace(/\.0$/, '')} M`;
  if (abs >= 10_000) return `$${(valor / 1_000).toFixed(1).replace(/\.0$/, '')} k`;
  return formatMoneda(valor, false);
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

export function esProducto(item: Pick<CotizacionItem, 'producto_externo_id'>): boolean {
  return item.producto_externo_id.trim().length > 0;
}

/**
 * Precio unitario final de una línea (lo que ve el cliente). Misma regla que
 * `CotizacionSerializer._calculate_totals`:
 * - Producto de catálogo: el precio ya trae IVA; con «sin IVA» se le quita.
 * - Concepto manual: el precio es base y se le suma el IVA, salvo «sin IVA».
 */
export function precioUnitario(
  item: Pick<CotizacionItem, 'precio_lista' | 'descuento_pct' | 'producto_externo_id' | 'sin_iva'>,
): number {
  const base = item.precio_lista * (1 - clampPct(item.descuento_pct) / 100);
  if (esProducto(item)) return item.sin_iva ? base / IVA_MX : base;
  return item.sin_iva ? base : base * IVA_MX;
}

export function importeLinea(
  item: Pick<CotizacionItem, 'cantidad' | 'precio_lista' | 'descuento_pct' | 'producto_externo_id' | 'sin_iva'>,
): number {
  const importe = item.cantidad * precioUnitario(item);
  return importe > 0 ? importe : 0;
}

export interface TotalesCotizacion {
  subtotalLineas: number;
  descuentoCliente: number;
  total: number;
  anticipo: number;
  saldo: number;
}

/** Totales como los calcula el backend (IVA ya incluido en cada línea). */
export function calcularTotales(
  items: Parameters<typeof importeLinea>[0][],
  descuentoClientePct: number,
  anticipoPct: number,
): TotalesCotizacion {
  const subtotalLineas = items.reduce((acc, item) => acc + importeLinea(item), 0);
  const descuentoCliente = subtotalLineas * (clampPct(descuentoClientePct) / 100);
  const total = redondear(Math.max(0, subtotalLineas - descuentoCliente));
  const anticipo = redondear(total * (clampPct(anticipoPct) / 100));
  return {
    subtotalLineas: redondear(subtotalLineas),
    descuentoCliente: redondear(descuentoCliente),
    total,
    anticipo,
    saldo: redondear(total - anticipo),
  };
}

export function coincideBusqueda(c: CotizacionListItem, termino: string): boolean {
  const t = termino.trim().toLowerCase();
  if (!t) return true;
  return [folioDisplay(c), String(c.idx ?? ''), clienteDisplay(c), c.contacto, c.tipo_trabajo_nombres, c.creado_por_full_name ?? '']
    .join(' ')
    .toLowerCase()
    .includes(t);
}

/** Métricas del mes, solo conteos (sin montos): el panel del listado. */
export interface ResumenMes {
  cantidad: number;
  porStatus: Record<CotizacionStatus, number>;
  /** Autorizadas entre las que ya se decidieron (autorizadas + canceladas); `null` sin decididas. */
  tasaCierre: number | null;
  /** Suma de piezas cotizadas en el mes. */
  piezas: number;
}

export function resumenDelMes(cotizaciones: CotizacionListItem[]): ResumenMes {
  const porStatus: Record<CotizacionStatus, number> = { PENDIENTE: 0, AUTORIZADA: 0, CANCELADA: 0 };
  let piezas = 0;
  for (const c of cotizaciones) {
    porStatus[c.status] += 1;
    piezas += c.piezas;
  }
  const decididas = porStatus.AUTORIZADA + porStatus.CANCELADA;
  return {
    cantidad: cotizaciones.length,
    porStatus,
    tasaCierre: decididas > 0 ? Math.round((porStatus.AUTORIZADA / decididas) * 100) : null,
    piezas: Math.round(piezas * 100) / 100,
  };
}

/** `12` → «12», `2.5` → «2.5»: cantidades sin ceros de relleno. */
export function formatCantidad(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}


/** Total que se muestra: en garantía es $0 en toda la app (igual que en el PDF y la web). */
export function totalMostrado(c: Pick<CotizacionListItem, 'total' | 'es_garantia'>): number {
  return c.es_garantia ? 0 : c.total;
}

export interface GrupoPartidas<T> {
  clave: string;
  nombre: string | null;
  items: T[];
}

/**
 * Agrupa las partidas por categoría en el orden de la cotización (como la
 * web y el PDF). Las que no tienen categoría van primero y sin encabezado;
 * sin categorías definidas queda un solo grupo.
 */
export function agruparPorCategoria<T extends { categoria_id: string }>(
  items: T[],
  categorias: { id: string; nombre: string }[],
): GrupoPartidas<T>[] {
  if (categorias.length === 0) return [{ clave: 'todas', nombre: null, items }];
  const sinCategoria = items.filter((i) => !categorias.some((c) => c.id === i.categoria_id));
  const grupos: GrupoPartidas<T>[] = [];
  if (sinCategoria.length) grupos.push({ clave: 'sin-categoria', nombre: null, items: sinCategoria });
  for (const c of categorias) {
    const del = items.filter((i) => i.categoria_id === c.id);
    if (del.length) grupos.push({ clave: c.id, nombre: c.nombre, items: del });
  }
  return grupos;
}

export type FuentePartida = 'syscom' | 'tvc' | 'manual' | 'concepto';

/** De dónde viene una partida, por su referencia (igual que la web la guarda). */
export function fuentePartida(item: Pick<CotizacionItem, 'producto_externo_id'>): FuentePartida {
  const id = item.producto_externo_id.trim().toLowerCase();
  if (!id) return 'concepto';
  if (id.startsWith('tvc:')) return 'tvc';
  if (id.startsWith('manual:')) return 'manual';
  return 'syscom';
}

export const ETIQUETA_FUENTE_PARTIDA: Record<FuentePartida, string> = {
  syscom: 'SYSCOM',
  tvc: 'TVC',
  manual: 'Manual',
  concepto: 'Concepto',
};
