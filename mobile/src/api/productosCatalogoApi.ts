import { API_BASE_URL } from '@/config/env';
import { apiClient } from './client';
import { asNumber, asRecord, asString } from './parsers';

/**
 * Productos para cotizar, de las mismas tres fuentes que la web
 * (`NuevaCotizacionPage`): catálogo manual, SYSCOM y TVC. SYSCOM y TVC pasan
 * por el proxy del backend (`/api/productos/syscom|tvc/…`), que ya da acceso a
 * quien tiene permiso de cotizaciones.
 */

export type FuenteProducto = 'manual' | 'syscom' | 'tvc';

export interface ProductoCatalogo {
  /** Clave única en la lista (fuente + id). */
  clave: string;
  fuente: FuenteProducto;
  /** Lo que se guarda en la partida: id SYSCOM, `tvc:…` o `manual:<id>`. */
  productoExternoId: string;
  titulo: string;
  /** «Marca · Modelo». */
  subtitulo: string;
  /** Precio en MXN con IVA (los productos ya traen el IVA incluido). */
  precio: number;
  imagenUrl: string;
  /** Descripción que va a la partida (misma regla que la web). */
  descripcion: string;
  existencia: number | null;
}

const IVA_MX = 1.16;

function texto(value: unknown): string {
  return asString(value) ?? '';
}

/**
 * Precio de lista en MXN con IVA, igual que `getSyscomPrecioListaMxnConIva`
 * de la web: si el catálogo ya trae `precio_mxn` se usa; si no, el precio
 * especial (o el de lista) en USD × tipo de cambio × 1.16.
 */
export function precioMxnConIva(raw: unknown, tipoCambio: number | null): number {
  const p = asRecord(raw);
  const directo = asNumber(p.precio_mxn);
  if (directo !== null && directo > 0) return redondear(directo);
  const precios = asRecord(p.precios);
  const usd = asNumber(precios.precio_especial) ?? asNumber(precios.precio_lista);
  if (usd === null) return 0;
  if (!tipoCambio) return redondear(Math.max(0, usd));
  return redondear(Math.max(0, usd * tipoCambio * IVA_MX));
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Imagen absoluta: SYSCOM y TVC con su dominio; el catálogo manual con el del backend. */
export function imagenProducto(ruta: string, fuente: FuenteProducto): string {
  const s = ruta.trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  const base = fuente === 'tvc' ? 'https://cdn.tvc.mx' : fuente === 'syscom' ? 'https://www.syscom.mx' : API_BASE_URL;
  return `${base}${s.startsWith('/') ? '' : '/'}${s}`;
}

function desdeMayorista(raw: unknown, fuente: 'syscom' | 'tvc', tipoCambio: number | null): ProductoCatalogo | null {
  const p = asRecord(raw);
  const id = texto(p.producto_id);
  if (!id) return null;
  const marca = texto(p.marca);
  const modelo = texto(p.modelo);
  const titulo = texto(p.titulo) || modelo;
  return {
    clave: `${fuente}-${id}`,
    fuente,
    productoExternoId: id,
    titulo: titulo || 'Producto',
    subtitulo: [marca, modelo].filter(Boolean).join(' · '),
    precio: precioMxnConIva(p, tipoCambio),
    imagenUrl: imagenProducto(texto(p.img_portada), fuente),
    descripcion: [marca, modelo].filter(Boolean).join(' · ') || titulo,
    existencia: asNumber(p.total_existencia),
  };
}

export function parseProductoManual(raw: unknown): ProductoCatalogo | null {
  const p = asRecord(raw);
  const id = asNumber(p.id);
  const nombre = texto(p.producto);
  if (id === null || !nombre || p.activo === false) return null;
  const marca = texto(p.marca);
  const modelo = texto(p.modelo);
  const meta = [marca, modelo].filter(Boolean).join(' · ');
  const caracteristicas = texto(p.caracteristicas);
  return {
    clave: `manual-${id}`,
    fuente: 'manual',
    productoExternoId: `manual:${id}`,
    titulo: nombre,
    subtitulo: meta || `Manual #${id}`,
    precio: redondear(Math.max(0, asNumber(p.precio) ?? 0)),
    imagenUrl: imagenProducto(texto(p.imagen_url), 'manual'),
    // Igual que `buildManualProductoDescripcion` de la web.
    descripcion: [meta, caracteristicas].filter(Boolean).join('\n\n'),
    existencia: asNumber(p.stock),
  };
}

function listaDe(raw: unknown, clave: string): unknown[] {
  if (Array.isArray(raw)) return raw;
  const valor = asRecord(raw)[clave];
  return Array.isArray(valor) ? valor : [];
}

function numeroEn(raw: unknown): number | null {
  const directo = asNumber(raw);
  if (directo) return directo;
  const r = asRecord(raw);
  for (const k of ['tipo_cambio', 'tipoCambio', 'tipocambio', 'tc', 'exchange_rate', 'rate', 'valor']) {
    const n = asNumber(r[k]);
    if (n) return n;
  }
  const data = asRecord(r.data);
  for (const k of ['tipo_cambio', 'tipoCambio', 'tipocambio', 'tc']) {
    const n = asNumber(data[k]);
    if (n) return n;
  }
  return null;
}

/** Tipo de cambio para convertir precios SYSCOM en USD (SYSCOM, o TVC de respaldo). */
export async function obtenerTipoCambio(signal?: AbortSignal): Promise<number | null> {
  for (const ruta of ['/productos/syscom/tipocambio/', '/productos/tvc/tipocambio/']) {
    try {
      const n = numeroEn(await apiClient.request<unknown>(ruta, { signal }));
      if (n) return n;
    } catch {
      // Se intenta con la siguiente fuente.
    }
  }
  return null;
}

export async function buscarSyscom(termino: string, tipoCambio: number | null, signal?: AbortSignal): Promise<ProductoCatalogo[]> {
  const busqueda = termino.trim().replace(/\s+/g, ' ').slice(0, 280);
  const raw = await apiClient.request<unknown>('/productos/syscom/productos/', {
    query: { busqueda, orden: 'relevancia', pagina: 1, stock: '0', agrupar: '0' },
    signal,
    timeoutMs: 30000,
  });
  return listaDe(raw, 'productos')
    .map((p) => desdeMayorista(p, 'syscom', tipoCambio))
    .filter((p): p is ProductoCatalogo => p !== null)
    .slice(0, 24);
}

export async function buscarTvc(termino: string, tipoCambio: number | null, signal?: AbortSignal): Promise<ProductoCatalogo[]> {
  const raw = await apiClient.request<unknown>('/productos/tvc/productos/', {
    query: { busqueda: termino.trim().slice(0, 280), pagina: 1, por_pagina: 24 },
    signal,
    timeoutMs: 30000,
  });
  return listaDe(raw, 'productos')
    .map((p) => desdeMayorista(p, 'tvc', tipoCambio))
    .filter((p): p is ProductoCatalogo => p !== null)
    .slice(0, 16);
}

/** Catálogo manual completo (se filtra en el teléfono, como en la web). */
export async function listProductosManuales(signal?: AbortSignal): Promise<ProductoCatalogo[]> {
  const raw = await apiClient.request<unknown>('/productos-manuales/', {
    query: { ordering: '-fecha_creacion', page_size: 500 },
    signal,
  });
  return listaDe(raw, 'results')
    .map(parseProductoManual)
    .filter((p): p is ProductoCatalogo => p !== null);
}

export function filtrarManuales(productos: ProductoCatalogo[], termino: string): ProductoCatalogo[] {
  const t = termino.trim().toLowerCase();
  if (!t) return [];
  return productos
    .filter((p) => `${p.titulo} ${p.subtitulo} ${p.productoExternoId}`.toLowerCase().includes(t))
    .slice(0, 12);
}
