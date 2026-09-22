import { agruparNavItems, type NavItem } from '@/components/AppNavbar';
import { construirMenu, MENU_APP } from '../menuApp';

const item = (key: string, grupo?: string, extra: Partial<NavItem> = {}): NavItem => ({
  key,
  label: key,
  grupo,
  icon: () => null,
  onPress: () => {},
  ...extra,
});

describe('agruparNavItems', () => {
  it('agrupa conservando el orden de aparición', () => {
    const grupos = agruparNavItems([item('a', 'Campo'), item('b', 'Inventario'), item('c', 'Campo')]);
    expect(grupos.map((g) => [g.grupo, g.items.map((i) => i.key)])).toEqual([
      ['Campo', ['a', 'c']],
      ['Inventario', ['b']],
    ]);
  });

  it('sin grupo cae en «Secciones»', () => {
    expect(agruparNavItems([item('a')])[0]?.grupo).toBe('Secciones');
  });

  it('filtra por etiqueta o pista sin distinguir mayúsculas', () => {
    const grupos = agruparNavItems(
      [item('Órdenes', 'Campo'), item('Stock', 'Inventario', { hint: 'Almacén central' })],
      'almacén',
    );
    expect(grupos).toHaveLength(1);
    expect(grupos[0]?.items[0]?.key).toBe('Stock');
  });
});

describe('construirMenu', () => {
  const base = {
    seccionActual: 'ordenes',
    contadores: { disponibles: 3 },
    navegar: jest.fn(),
  };

  it('oculta las vistas sin permiso', () => {
    const items = construirMenu({ ...base, puedeVer: (m) => m === 'ordenes' });
    expect(items.map((i) => i.key)).toEqual(['ordenes']);
  });

  it('marca la sección actual', () => {
    const items = construirMenu({ ...base, puedeVer: () => true });
    expect(items.find((i) => i.key === 'ordenes')?.active).toBe(true);
    expect(items.find((i) => i.key === 'proyectos')?.active).toBe(false);
  });

  it('las entradas sin contador no llevan badge', () => {
    const items = construirMenu({ ...base, puedeVer: () => true });
    expect(items.every((i) => i.badge === undefined)).toBe(true);
  });

  it('navega con el modo de la entrada', () => {
    const navegar = jest.fn();
    const items = construirMenu({ ...base, navegar, puedeVer: () => true });
    items.find((i) => i.key === 'proyectos')?.onPress();
    const entrada = MENU_APP.find((e) => e.key === 'proyectos');
    expect(navegar).toHaveBeenCalledWith(entrada?.ruta, 'replace');
  });
});
