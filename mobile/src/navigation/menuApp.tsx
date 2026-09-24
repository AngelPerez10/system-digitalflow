import React from 'react';
import type { Href } from 'expo-router';
import { IconCotizaciones, IconOrdenes, IconProyectos, type NavItem } from '@/components/AppNavbar';

/**
 * Catálogo de vistas del menú de la app del técnico. Agregar una vista nueva
 * es agregar una entrada aquí: el permiso, el grupo, el ícono y la ruta viven
 * juntos, y `_layout.tsx` solo filtra y traduce a `NavItem`.
 */
export interface MenuEntrada {
  key: string;
  label: string;
  hint: string;
  /** Encabezado del panel. Mismo texto = mismo grupo. */
  grupo: string;
  /** Módulo de permisos que debe poder ver (`canViewModule`). */
  modulo: string;
  ruta: Href;
  /**
   * Segmento de listado que la marca como activa (`segments[1]`). Las vistas
   * que se abren encima del listado (p. ej. disponibles) no lo llevan.
   */
  seccion?: string;
  /** `replace` para secciones raíz; `push` para vistas que se apilan con «volver». */
  navegacion: 'replace' | 'push';
  icon: (color: string) => React.ReactNode;
  /** Clave del contador dinámico que la pantalla raíz le inyecta. */
  contador?: 'disponibles';
}

export const MENU_APP: readonly MenuEntrada[] = [
  {
    key: 'ordenes',
    label: 'Mis órdenes',
    hint: 'Listado del mes',
    grupo: 'Trabajo de campo',
    modulo: 'ordenes',
    ruta: '/ordenes',
    seccion: 'ordenes',
    navegacion: 'replace',
    icon: (color) => <IconOrdenes color={color} />,
  },
  {
    key: 'proyectos',
    label: 'Mis proyectos',
    hint: 'Proyectos asignados',
    grupo: 'Trabajo de campo',
    modulo: 'proyectos',
    ruta: '/proyectos',
    seccion: 'proyectos',
    navegacion: 'replace',
    icon: (color) => <IconProyectos color={color} />,
  },
  {
    key: 'cotizaciones',
    label: 'Cotizaciones',
    hint: 'Crear y dar seguimiento',
    grupo: 'Ventas',
    modulo: 'cotizaciones',
    // Cast: los tipos de rutas de expo-router se regeneran al arrancar el servidor.
    ruta: '/cotizaciones' as Href,
    seccion: 'cotizaciones',
    navegacion: 'replace',
    icon: (color) => <IconCotizaciones color={color} />,
  },
];

/**
 * Primera vista del menú que el usuario puede ver: a dónde entra al iniciar
 * sesión. Quien solo cotiza cae en Cotizaciones, no en un listado de órdenes
 * que el servidor le negaría.
 */
export function rutaInicial(puedeVer: (modulo: string) => boolean): Href {
  return MENU_APP.find((e) => puedeVer(e.modulo))?.ruta ?? '/ordenes';
}

/** Traduce el catálogo a `NavItem` para las entradas que el usuario puede ver. */
export function construirMenu(opciones: {
  puedeVer: (modulo: string) => boolean;
  seccionActual: string | null;
  contadores: Partial<Record<NonNullable<MenuEntrada['contador']>, number>>;
  navegar: (ruta: Href, modo: MenuEntrada['navegacion']) => void;
}): NavItem[] {
  return MENU_APP.filter((e) => opciones.puedeVer(e.modulo)).map((e) => ({
    key: e.key,
    label: e.label,
    hint: e.hint,
    grupo: e.grupo,
    icon: e.icon,
    active: e.seccion !== undefined && e.seccion === opciones.seccionActual,
    badge: e.contador ? opciones.contadores[e.contador] : undefined,
    onPress: () => opciones.navegar(e.ruta, e.navegacion),
  }));
}
